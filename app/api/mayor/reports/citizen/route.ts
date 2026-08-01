import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "MAYOR" && userRole !== "ADMIN")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const barangayFilter = req.nextUrl.searchParams.get("barangay") || "";
    const whereClause = barangayFilter ? { barangay: { name: barangayFilter } } : {};

    const recentReports = await prisma.report.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
            id: true,
            category: true,
            status: true,
            description: true,
            createdAt: true,
            user: { select: { name: true } },
            barangay: { select: { name: true } }
        }
    });

    return NextResponse.json({
        recentReports: recentReports.map((r) => ({
            ...r,
            createdAt: r.createdAt.toISOString()
        }))
    });
}
