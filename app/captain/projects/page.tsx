import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSystemSetting } from "@/lib/settings";
import { CaptainReportsHeader } from "@/app/captain/reports/components/CaptainReportsHeader";
import { MayorProjectsProvider } from "@/app/mayor/projects/components/MayorProjectsProvider";
import { MayorProjectsCards } from "@/app/mayor/projects/components/MayorProjectsCards";
import { MayorProjectsFilters } from "@/app/mayor/projects/components/MayorProjectsFilters";
import { MayorProjectsTable } from "@/app/mayor/projects/components/MayorProjectsTable";

export const dynamic = "force-dynamic";

export default async function CaptainProjectsPage(props: {
    searchParams: Promise<{
        search?: string;
        category?: string;
        status?: string;
        page?: string;
        pageSize?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const userRole = user?.role;

    if (!session || (userRole !== "BARANGAY_CAPTAIN" && userRole !== "ADMIN")) {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "{{BARANGAY_NAME}}";
    const params = await props.searchParams;

    const page = Math.max(1, parseInt(params.page || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(params.pageSize || "10", 10)));
    const search = params.search || "";
    const category = params.category || "All";
    const status = params.status || "All";

    // Strict Barangay Scope with case-insensitivity
    const where: any = {
        barangay: { equals: managedBarangay, mode: "insensitive" }
    };

    if (category && category !== "All") {
        where.category = category;
    }

    if (status && status !== "All") {
        where.status = status;
    }

    if (search.trim()) {
        where.AND = [
            {
                OR: [
                    { title: { contains: search.trim(), mode: "insensitive" } },
                    { location: { contains: search.trim(), mode: "insensitive" } },
                    { contractor: { contains: search.trim(), mode: "insensitive" } },
                    { description: { contains: search.trim(), mode: "insensitive" } },
                ]
            }
        ];
    }

    const projectDelegate = (prisma as any).project;

    const [projectsData, totalCount] = await Promise.all([
        projectDelegate.findMany({
            where,
            select: {
                id: true,
                title: true,
                description: true,
                category: true,
                status: true,
                location: true,
                budget: true,
                contractor: true,
                startDate: true,
                endDate: true,
                progress: true,
                imageUrl: true,
                barangay: true,
                isPublished: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        projectDelegate.count({ where }),
    ]);

    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] transition-colors pb-12">
            <CaptainReportsHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
                title="Barangay Infrastructure & Projects"
                subtitle={`Barangay ${managedBarangay} Public Works & Community Projects`}
                iconName="folder-kanban"
            />
            <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white leading-tight">
                            Barangay Infrastructure Projects
                        </h1>
                        <p className="text-xs font-semibold text-slate-400 italic">
                            Barangay {managedBarangay} Development & Infrastructure Tracking
                        </p>
                    </div>
                </div>

                <MayorProjectsProvider
                    initialData={projectsData}
                    totalCount={totalCount}
                    page={page}
                    pageSize={pageSize}
                    search={search}
                    category={category}
                    status={status}
                    currentBarangay={managedBarangay}
                    activeBarangays={[managedBarangay]}
                >
                    <MayorProjectsCards />

                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                        <MayorProjectsFilters />
                        <MayorProjectsTable />
                    </div>
                </MayorProjectsProvider>
            </div>
        </div>
    );
}
