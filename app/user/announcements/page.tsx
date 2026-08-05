import prisma from "@/lib/db/prisma";
import { UserAnnouncementsView, type Announcement } from "./UserAnnouncementsView";

export default async function UserAnnouncementsPage({
    searchParams,
}: {
    searchParams: Promise<{ barangay?: string }>;
}) {
    const { barangay } = await searchParams;
    const isFiltered = barangay && barangay !== "All";

    const announcements = await prisma.announcement.findMany({
        where: { 
            isActive: true,
            category: { not: "Health" },
            ...(isFiltered ? { barangay } : {})
        } as any,
        orderBy: { createdAt: "desc" }
    });

    const activeBarangays = await prisma.barangayInfo.findMany({
        orderBy: { name: "asc" },
        select: { name: true }
    });

    return (
        <UserAnnouncementsView 
            initialAnnouncements={announcements as Announcement[]} 
            activeBarangays={activeBarangays.map(b => b.name)}
        />
    );
}
