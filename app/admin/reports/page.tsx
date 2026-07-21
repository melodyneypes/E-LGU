import { getAdminReports } from "@/app/admin/actions";
import { ReportsTable } from "./components/ReportsTable";
import { getSystemSetting } from "@/lib/settings";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function AdminReportsPage() {
    const res = await getAdminReports({ page: 1, limit: 10 });
    const reports = res?.reports || [];
    const totalCount = res?.totalCount || 0;
    const totalPages = res?.totalPages || 0;
    const initialStats = res?.stats || { total: 0, pending: 0, inProgress: 0, completed: 0, rejected: 0 };
    const themeColor = await getSystemSetting("theme_color", "#2563eb");

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Top Navigation & Header */}
            <div className="space-y-4">
                <Link
                    href="/admin/dashboard"
                    prefetch={false}
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest italic text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                            Public <span style={{ color: themeColor }}>Reports</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium italic mt-1">
                            Manage and track community concerns submitted by residents.
                        </p>
                    </div>
                </div>
            </div>

            {/* Reports Content */}
            <ReportsTable 
                initialReports={reports} 
                initialTotalCount={totalCount} 
                initialTotalPages={totalPages} 
                initialStats={initialStats}
                themeColor={themeColor} 
            />
        </div>
    );
}

