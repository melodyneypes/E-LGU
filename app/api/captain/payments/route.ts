import { NextRequest, NextResponse } from "next/server";
import { getCaptainPaymentsLedger } from "@/app/captain/payments/actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const userRole = user?.role;

        if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const from = searchParams.get("from") || undefined;
        const to = searchParams.get("to") || undefined;
        const category = searchParams.get("category") || undefined;
        const method = searchParams.get("method") || undefined;
        const search = searchParams.get("search") || undefined;
        const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
        const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
        const barangay = user?.managedBarangay || searchParams.get("barangay") || undefined;

        const result = await getCaptainPaymentsLedger({
            from,
            to,
            category,
            method,
            search,
            page,
            limit,
            barangay
        });

        if (!result.success) {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error in Captain payments API route:", error);
        return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
