import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { MayorReportsHeader } from "../reports/components/MayorReportsHeader";
import { MayorAnnouncementsProvider } from "./components/MayorAnnouncementsProvider";
import { MayorAnnouncementCards } from "./components/MayorAnnouncementCards";
import { MayorAnnouncementFilters } from "./components/MayorAnnouncementFilters";
import { MayorAnnouncementTable } from "./components/MayorAnnouncementTable";

export const dynamic = "force-dynamic";

export default async function MayorAnnouncementsPage(props: {
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
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== "MAYOR" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const params = await props.searchParams;

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const category = params.category || "All";
    const priority = params.priority || "All";
    const barangayParam = params.barangay || null;

    // Build Prisma filter clause
    const where: any = {};

    if (barangayParam && barangayParam !== "All") {
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
                    Database model &apos;announcement&apos; not found.
                </div>
            </div>
        );
    }

    // Execute paginated findMany and total count concurrently
    const [announcements, totalCount, activeBarangays] = await Promise.all([
        announcementDelegate.findMany({
            where,
            select: {
                id: true,
                title: true,
                priority: true,
                category: true,
                isPinned: true,
                isActive: true,
                barangay: true,
                expiryDate: true,
                createdAt: true,
                updatedAt: true,
            },
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

    const themeColor = await getSystemSetting("theme_color", "#2563eb");
    const barangays = activeBarangays.map((b) => b.name);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors pb-12">
            <MayorReportsHeader
                session={session}
                themeColor={themeColor}
                activeBarangays={barangays}
                selectedBarangay={barangayParam || "All"}
                title="Municipal Bulletins"
                subtitle="Executive Announcement & Notice Board Management"
                badge="Executive Access"
                iconName="file-text"
                hideBarangaySwitcher={false}
            />
            <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <MayorAnnouncementsProvider
                    initialData={announcements}
                    totalCount={totalCount}
                    page={page}
                    pageSize={pageSize}
                    search={search}
                    category={category}
                    priority={priority}
                    currentBarangay={barangayParam || undefined}
                    activeBarangays={barangays}
                >
                    <MayorAnnouncementCards />

                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                        <MayorAnnouncementFilters />
                        <MayorAnnouncementTable />
                    </div>
                </MayorAnnouncementsProvider>
            </div>
        </div>
    );
}
