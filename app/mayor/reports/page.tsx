import prisma from "@/lib/db/prisma";
import { getMayorReports } from "./actions";
import { MayorReportsTable } from "./components/MayorReportsTable";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MayorReportsHeader } from "./components/MayorReportsHeader";

export const dynamic = "force-dynamic";

export default async function MayorReportsPage(props: {
    searchParams: Promise<{
        barangay?: string;
        search?: string;
        status?: string;
        page?: string;
        limit?: string;
    }>;
}) {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!session?.user) {
        redirect("/auth/login");
    }

    if (user?.role !== "MAYOR" && user?.role !== "ADMIN") {
        redirect("/auth/login");
    }

    const params = await props.searchParams;
    const selectedBarangay = params.barangay || "";
    const search = params.search || "";
    const status = params.status || "All";
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const limit = Math.max(1, parseInt(params.limit || "10", 10));

    const [settingsList, activeBarangays, reportsRes] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        prisma.barangayInfo.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
        getMayorReports({
            page,
            limit,
            search,
            status,
            barangay: selectedBarangay && selectedBarangay !== "All" ? selectedBarangay : undefined,
        }),
    ]);

    const themeColor = settingsList.get("theme_color") || "#2563eb";
    const reports = reportsRes?.reports || [];
    const totalCount = reportsRes?.totalCount || 0;
    const totalPages = reportsRes?.totalPages || 0;
    const initialStats = reportsRes?.stats || { total: 0, pending: 0, inProgress: 0, completed: 0, rejected: 0 };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300">
            {/* Header Navbar with Barangay Switcher */}
            <MayorReportsHeader
                session={session}
                themeColor={themeColor}
                activeBarangays={activeBarangays.map((b: { name: string }) => b.name)}
                selectedBarangay={selectedBarangay}
            />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 animate-in fade-in duration-500">
                <MayorReportsTable
                    initialReports={reports}
                    initialTotalCount={totalCount}
                    initialTotalPages={totalPages}
                    initialStats={initialStats}
                    themeColor={themeColor}
                />
            </main>
        </div>
    );
}
