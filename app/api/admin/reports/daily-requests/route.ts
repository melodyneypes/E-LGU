import { NextRequest, NextResponse } from "next/server";
import { getTransactionReportData } from "@/app/admin/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;

        if (!session || (userRole !== "ADMIN" && userRole !== "BARANGAY_ADMIN")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        
        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const category = searchParams.get("category") || undefined;
        const status = searchParams.get("status") || undefined;
        const search = searchParams.get("search") || undefined;
        const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
        const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
        const exportAll = searchParams.get("exportAll") === "true";

        const result = await getTransactionReportData({
            from,
            to,
            category,
            status,
            search,
            page,
            limit,
            exportAll
        });

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error in daily requests API route:", error);
        return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
