import prisma from "@/lib/db/prisma";
import { AnnouncementPage } from "../content/Announcements/AnnouncementPage";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{
        barangay?: string;
        search?: string;
        category?: string;
        priority?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const params = await searchParams;

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const category = params.category || "All";
    const priority = params.priority || "All";
    const barangayParam = params.barangay || null;

    const user = session?.user as any;
    const isBarangayAdmin = user?.role === "BARANGAY_ADMIN";

    // Build optimized Prisma filter clause
    const where: any = {};

    // Barangay scoping check
    if (isBarangayAdmin) {
        where.barangay = user.managedBarangay;
    } else if (barangayParam && barangayParam !== "All") {
        where.barangay = barangayParam;
    }

    // Category filter
    if (category && category !== "All") {
        where.category = category;
    }

    // Priority filter
    if (priority && priority !== "All") {
        where.priority = priority;
    }

    // Search filter across title & content
    if (search.trim()) {
        where.OR = [
            { title: { contains: search.trim(), mode: "insensitive" } },
            { content: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const announcementDelegate = (prisma as any).announcement;

    if (!announcementDelegate) {
        return (
            <div className="p-8">
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-600">
                    Database model &apos;announcement&apos; not found. Please restart the dev server.
                </div>
            </div>
        );
    }

    // Execute paginated findMany and total count concurrently
    let announcements: any[] = [];
    let totalCount = 0;
    let activeBarangays: { name: string }[] = [];

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
        authorEmail: true,
        authorId: true,
        healthCenterId: true,
        eventDate: true,
        eventSchedule: true,
        expiryDate: true,
        createdAt: true,
        updatedAt: true,
    };

    try {
        const results = await Promise.all([
            announcementDelegate.findMany({
                where,
                select: safeSelect,
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            announcementDelegate.count({ where }),
            prisma.barangayInfo.findMany({
                orderBy: { name: "asc" },
                select: { name: true },
            }),
        ]);
        announcements = results[0];
        totalCount = results[1];
        activeBarangays = results[2];
    } catch {
        const results = await Promise.all([
            announcementDelegate.findMany({
                where,
                select: safeSelect,
                orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
            announcementDelegate.count({ where }),
            prisma.barangayInfo.findMany({
                orderBy: { name: "asc" },
                select: { name: true },
            }),
        ]);
        announcements = results[0];
        totalCount = results[1];
        activeBarangays = results[2];
    }

    // Enrich with database approval status and department safely
    try {
        const ids = announcements.map((a: any) => a.id).filter(Boolean);
        if (ids.length > 0) {
            const rawDetails: any[] = await (prisma as any).$queryRawUnsafe(
                `SELECT id, department, "approvalStatus", "submittedBy", "approvedBy" FROM "Announcement" WHERE id = ANY($1::text[])`,
                ids
            );
            const detailMap = new Map(rawDetails.map((r: any) => [r.id, r]));
            announcements = announcements.map((a: any) => {
                const det = detailMap.get(a.id);
                return {
                    ...a,
                    department: det?.department || a.department || (a.category === "Business" ? "BPLO" : "GENERAL"),
                    approvalStatus: det?.approvalStatus || a.approvalStatus || (a.category === "Business" || a.department === "BPLO" ? "PENDING_APPROVAL" : "APPROVED"),
                    submittedBy: det?.submittedBy || a.submittedBy || null,
                    approvedBy: det?.approvedBy || a.approvedBy || null,
                };
            });
        }
    } catch {
        // Safe fallback if raw enrichment fails
    }

    // Exclude announcements that require approval (displayed in dedicated Approval queue)
    announcements = announcements.filter((a: any) => a.approvalStatus !== "PENDING_APPROVAL");

    try {
        const rawPending: any[] = await (prisma as any).$queryRawUnsafe(
            `SELECT COUNT(*)::int as count FROM "Announcement" WHERE "approvalStatus" = 'PENDING_APPROVAL'`
        );
        const pendingCount = Number(rawPending?.[0]?.count || 0);
        totalCount = Math.max(0, totalCount - pendingCount);
    } catch {
        // Safe fallback
    }

    return (
        <AnnouncementPage
            initialData={announcements}
            totalCount={totalCount}
            page={page}
            pageSize={pageSize}
            search={search}
            category={category}
            priority={priority}
            currentBarangay={isBarangayAdmin ? user.managedBarangay : barangayParam || undefined}
            activeBarangays={activeBarangays.map((b) => b.name)}
            currentUser={user ? {
                id: user.id,
                email: user.email,
                role: user.role,
                matchedCenterId: undefined
            } : undefined}
        />
    );
}
