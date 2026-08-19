import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
    try {
        const rawAnnouncements = await (prisma as any).announcement.findMany({
            where: {
                isActive: true,
                category: "Business",
                OR: [
                    { expiryDate: null },
                    { expiryDate: { gte: new Date() } }
                ]
            },
            orderBy: [
                { isPinned: "desc" },
                { createdAt: "desc" }
            ],
            take: 10
        });

        const announcements = rawAnnouncements.filter((a: any) => a.approvalStatus !== "PENDING_APPROVAL" && a.approvalStatus !== "REJECTED");

        return NextResponse.json({ success: true, announcements });
    } catch (error: any) {
        console.error("Error fetching approved BPLO announcements:", error);
        return NextResponse.json({ success: false, announcements: [] }, { status: 500 });
    }
}
