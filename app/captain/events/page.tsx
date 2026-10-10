import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { CaptainReportsHeader } from "@/app/captain/reports/components/CaptainReportsHeader";
import { MayorEventsProvider } from "@/app/mayor/events/components/MayorEventsProvider";
import { MayorEventsCards } from "@/app/mayor/events/components/MayorEventsCards";
import { MayorEventsFilters } from "@/app/mayor/events/components/MayorEventsFilters";
import { MayorEventsTable } from "@/app/mayor/events/components/MayorEventsTable";

export const dynamic = "force-dynamic";

export default async function CaptainEventsPage(props: {
    searchParams: Promise<{
        search?: string;
        category?: string;
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

    // Strict Barangay Scope with case-insensitivity
    const where: any = {
        barangay: { equals: managedBarangay, mode: "insensitive" }
    };

    if (category && category !== "All") {
        where.category = category;
    }

    if (search.trim()) {
        where.AND = [
            {
                OR: [
                    { title: { contains: search.trim(), mode: "insensitive" } },
                    { description: { contains: search.trim(), mode: "insensitive" } },
                    { venueName: { contains: search.trim(), mode: "insensitive" } },
                ]
            }
        ];
    }

    const [eventItems, totalCount] = await Promise.all([
        prisma.event.findMany({
            where,
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                startDate: true,
                endDate: true,
                venueName: true,
                address: true,
                contactNumber: true,
                imageUrl: true,
                barangay: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { startDate: "asc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.event.count({ where }),
    ]);

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors pb-12">
            <CaptainReportsHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
                title="Barangay Events & Calendar"
                subtitle={`Barangay ${managedBarangay} Official Events, Celebrations & Programs`}
                iconName="calendar"
            />
            <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                            Barangay Events & Activities
                        </h1>
                        <p className="text-xs font-semibold text-slate-400 italic">
                            Barangay {managedBarangay} Public Activities, Fiestas & Town Meetings
                        </p>
                    </div>
                </div>

                <MayorEventsProvider
                    initialData={eventItems}
                    totalCount={totalCount}
                    page={page}
                    pageSize={pageSize}
                    search={search}
                    category={category}
                    currentBarangay={managedBarangay}
                    activeBarangays={[managedBarangay]}
                >
                    <MayorEventsCards />

                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                        <MayorEventsFilters />
                        <MayorEventsTable />
                    </div>
                </MayorEventsProvider>
            </div>
        </div>
    );
}
