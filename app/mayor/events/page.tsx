import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { CalendarDays } from "lucide-react";
import { MayorReportsHeader } from "../reports/components/MayorReportsHeader";
import { MayorEventsProvider } from "./components/MayorEventsProvider";
import { MayorEventsCards } from "./components/MayorEventsCards";
import { MayorEventsFilters } from "./components/MayorEventsFilters";
import { MayorEventsTable } from "./components/MayorEventsTable";

export const dynamic = "force-dynamic";

export default async function MayorEventsPage(props: {
    searchParams: Promise<{
        barangay?: string;
        search?: string;
        category?: string;
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
    const barangayParam = params.barangay || null;

    // Build Prisma filter
    const where: any = {};

    if (barangayParam && barangayParam !== "All") {
        where.barangay = barangayParam;
    }

    if (category && category !== "All") {
        where.category = category;
    }

    if (search.trim()) {
        where.OR = [
            { title: { contains: search.trim(), mode: "insensitive" } },
            { description: { contains: search.trim(), mode: "insensitive" } },
            { venueName: { contains: search.trim(), mode: "insensitive" } },
        ];
    }

    const [eventItems, totalCount, allBarangays] = await Promise.all([
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
        prisma.barangayInfo.findMany({
            orderBy: { name: "asc" },
            select: { name: true },
        }),
    ]);

    const themeColor = await getSystemSetting("theme_color", "#2563eb");
    const barangays = allBarangays.map((b) => b.name);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors pb-12">
            <MayorReportsHeader
                session={session}
                themeColor={themeColor}
                activeBarangays={barangays}
                selectedBarangay={barangayParam || "All"}
                title="Municipal Events"
                subtitle="Official Events, Festivals & Public Activities"
                badge="Executive Access"
                iconName="flag"
                hideBarangaySwitcher={false}
            />
            <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

                {/* Two-line Page Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                            <CalendarDays className="mr-3 w-10 h-10 text-blue-600" />
                            Municipal Events
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                            Official events, festivals, and public activities across Mapandan.
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
                    currentBarangay={barangayParam || undefined}
                    activeBarangays={barangays}
                    themeColor={themeColor}
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
