import { NextRequest, NextResponse } from "next/server";
import { getRptCollectionsLedger } from "@/app/admin/treasury/rpt-collections/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const userRole = (session?.user as any)?.role;

        if (!session || (userRole !== "ADMIN" && userRole !== "TREASURY_STAFF")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const rptType = searchParams.get("rptType") || undefined;
        const method = searchParams.get("method") || undefined;
        const search = searchParams.get("search") || undefined;
        const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
        const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
        const exportAll = searchParams.get("exportAll") === "true";

        const result = await getRptCollectionsLedger({
            from,
            to,
            rptType,
            method,
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
        console.error("Error in RPT collections API route:", error);
        return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
