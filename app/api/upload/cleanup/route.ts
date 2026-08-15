import { NextResponse } from "next/server";
import { deleteFileByUrl } from "@/lib/storage";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        // 1. Security Auth Guard: Require valid user session
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        if (!user || !user.id) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const body = await req.json();
        const { urls } = body;

        if (!urls || !Array.isArray(urls)) {
            return NextResponse.json({ error: "Invalid payload: 'urls' must be an array" }, { status: 400 });
        }

        const userId = user.id;
        const isAdmin = user.role === "ADMIN" || user.role === "SUPER_ADMIN";

        // 2. Strict Path & Ownership Validation
        // Non-admins can ONLY delete files located within their assigned user directory (/services/*/${userId}/* or /users/${userId}/*)
        const safeUrls = urls.filter((url: string) => {
            if (typeof url !== "string" || !url.trim()) return false;

            // Admins can execute global cleanup for administrative modules
            if (isAdmin) return true;

            // User must own the file path
            const hasUserFolder = url.includes(`/${userId}/`);
            const isServiceOrUserUpload = url.includes("/services/") || url.includes("/users/") || url.includes("/reviews/");

            return hasUserFolder && isServiceOrUserUpload;
        });

        if (safeUrls.length === 0 && urls.length > 0) {
            return NextResponse.json({ 
                error: "Forbidden: You do not have permission to delete one or more specified files.",
                deletedCount: 0 
            }, { status: 403 });
        }

        // 3. Run authorized deletions concurrently
        await Promise.allSettled(safeUrls.map((url: string) => deleteFileByUrl(url)));

        return NextResponse.json({ 
            success: true, 
            deletedCount: safeUrls.length,
            requestedCount: urls.length 
        });
    } catch (error) {
        console.error("Cleanup API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
