import { getCaptainReports } from "./actions";
import { MayorReportsTable } from "@/app/mayor/reports/components/MayorReportsTable";
import { getMultipleSystemSettings } from "@/lib/settings";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CaptainReportsHeader } from "./components/CaptainReportsHeader";

export const dynamic = "force-dynamic";

export default async function CaptainReportsPage(props: {
    searchParams: Promise<{
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

    if (user?.role !== "BARANGAY_CAPTAIN" && user?.role !== "ADMIN") {
        redirect("/auth/login");
    }

    const managedBarangay = user?.managedBarangay || "Apaya";
    const params = await props.searchParams;
    const search = params.search || "";
    const status = params.status || "All";
    const page = Math.max(1, parseInt(params.page || "1", 10));
    const limit = Math.max(1, parseInt(params.limit || "10", 10));

    const [settingsList, reportsRes] = await Promise.all([
        getMultipleSystemSettings(["theme_color"]),
        getCaptainReports({
            page,
            limit,
            search,
            status,
            barangay: managedBarangay,
        }),
    ]);

    const themeColor = settingsList.get("theme_color") || "#2563eb";
    const reports = reportsRes?.reports || [];
    const totalCount = reportsRes?.totalCount || 0;
    const totalPages = reportsRes?.totalPages || 0;
    const initialStats = reportsRes?.stats || { total: 0, pending: 0, inProgress: 0, completed: 0, rejected: 0 };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white transition-colors duration-300">
            {/* Header Navbar */}
            <CaptainReportsHeader
                session={session}
                themeColor={themeColor}
                managedBarangay={managedBarangay}
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
