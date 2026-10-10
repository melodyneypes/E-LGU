import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { CaptainReportsHeader } from "@/app/captain/reports/components/CaptainReportsHeader";
import { MayorAnnouncementsProvider } from "@/app/mayor/announcements/components/MayorAnnouncementsProvider";
import { MayorAnnouncementCards } from "@/app/mayor/announcements/components/MayorAnnouncementCards";
import { MayorAnnouncementFilters } from "@/app/mayor/announcements/components/MayorAnnouncementFilters";
import { MayorAnnouncementTable } from "@/app/mayor/announcements/components/MayorAnnouncementTable";

export const dynamic = "force-dynamic";

export default async function CaptainAnnouncementsPage(props: {
    searchParams: Promise<{
        search?: string;
        category?: string;
        priority?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "BARANGAY_ADMIN" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "{{BARANGAY_NAME}}";
    const params = await props.searchParams;

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const category = params.category || "All";
    const priority = params.priority || "All";

    // Strict Barangay Scope (Case-Insensitive) or Town-wide announcement matching
    const where: any = {
        barangay: { equals: managedBarangay, mode: "insensitive" }
    };

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
        where.AND = [
            {
                OR: [
                    { title: { contains: search.trim(), mode: "insensitive" } },
                    { content: { contains: search.trim(), mode: "insensitive" } },
                ]
            }
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
    const [announcements, totalCount] = await Promise.all([
        announcementDelegate.findMany({
            where,
            select: {
                id: true,
                title: true,
                content: true,
                imageUrl: true,
                priority: true,
                category: true,
                isPinned: true,
                isActive: true,
                barangay: true,
                expiryDate: true,
                eventSchedule: true,
                authorEmail: true,
                authorId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        announcementDelegate.count({ where }),
    ]);

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors pb-12">
            <CaptainReportsHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
                title="Barangay Bulletins & Notices"
                subtitle={`Barangay ${managedBarangay} Official Announcements & Public Advisories`}
                iconName="megaphone"
            />
            <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                            Barangay Bulletins & Notices
                        </h1>
                        <p className="text-xs font-semibold text-slate-400 italic">
                            Barangay {managedBarangay} Official Announcements & Public Advisories
                        </p>
                    </div>
                </div>

                <MayorAnnouncementsProvider
                    initialData={announcements}
                    totalCount={totalCount}
                    page={page}
                    pageSize={pageSize}
                    search={search}
                    category={category}
                    priority={priority}
                    currentBarangay={managedBarangay}
                    activeBarangays={[managedBarangay]}
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
