import { NextResponse } from "next/server";
import { deleteFileByUrl } from "@/lib/storage";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { urls } = body;

        if (!urls || !Array.isArray(urls)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
        }

        // Run all deletions concurrently
        await Promise.allSettled(urls.map((url: string) => deleteFileByUrl(url)));

        return NextResponse.json({ success: true, count: urls.length });
    } catch (error) {
        console.error("Cleanup API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
