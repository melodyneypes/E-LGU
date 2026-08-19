import prisma from "@/lib/db/prisma";
import { UserAnnouncementsView, type Announcement } from "./UserAnnouncementsView";
 
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UserAnnouncementsPage({
    searchParams,
}: {
    searchParams: Promise<{ barangay?: string }>;
}) {
    const { barangay } = await searchParams;
    const isFiltered = barangay && barangay !== "All";

    const safeSelect = {
        id: true,
        title: true,
        content: true,
        priority: true,
        category: true,
        isPinned: true,
        isActive: true,
        barangay: true,
        imageUrl: true,
        expiryDate: true,
        eventDate: true,
        eventSchedule: true,
        createdAt: true,
        updatedAt: true,
    };

    const [rawAnnouncements, activeBarangays] = await Promise.all([
        (prisma as any).announcement.findMany({
            where: { 
                isActive: true,
                category: { not: "Health" },
                ...(isFiltered ? { barangay } : {})
            } as any,
            select: safeSelect,
            orderBy: { createdAt: "desc" }
        }),
        prisma.barangayInfo.findMany({
            orderBy: { name: "asc" },
            select: { name: true }
        })
    ]);

    const ids = rawAnnouncements.map((a: any) => a.id).filter(Boolean);
    let detailMap = new Map<string, any>();
    if (ids.length > 0) {
        try {
            const rawDetails: any[] = await (prisma as any).$queryRawUnsafe(
                `SELECT id, department, "approvalStatus" FROM "Announcement" WHERE id = ANY($1::text[])`,
                ids
            );
            detailMap = new Map(rawDetails.map((r: any) => [r.id, r]));
        } catch {}
    }

    const announcements = rawAnnouncements.filter((a: any) => {
        const det = detailMap.get(a.id);
        const status = det?.approvalStatus || a.approvalStatus || "APPROVED";
        return status !== "PENDING_APPROVAL" && status !== "REJECTED";
    });

    return (
        <UserAnnouncementsView 
            initialAnnouncements={announcements as Announcement[]} 
            activeBarangays={activeBarangays.map(b => b.name)}
        />
    );
}
