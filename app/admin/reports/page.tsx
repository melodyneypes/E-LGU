import { getAdminReports } from "@/app/admin/actions";
import { ReportsTable } from "./components/ReportsTable";
import { AlertTriangle, BarChart3, Clock, CheckCircle2 } from "lucide-react";
import { getSystemSetting } from "@/lib/settings";

export default async function AdminReportsPage() {
    const { reports = [] } = await getAdminReports();
    const themeColor = await getSystemSetting("theme_color", "#2563eb");
    
    const stats = {
        total: reports.length,
        pending: reports.filter((r: { status: string }) => r.status === "PENDING").length,
        inProgress: reports.filter((r: { status: string }) => r.status === "IN_PROGRESS").length,
        completed: reports.filter((r: { status: string }) => r.status === "COMPLETED").length,
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                        Public <span className="text-primary">Reports</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium italic">Manage and track community concerns submitted by residents.</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-6 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Reports</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.pending}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">In Progress</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.inProgress}</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Completed</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.completed}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reports Table Component */}
            <div 
                style={{ boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--primary-theme) 10%, transparent)' }}
                className="bg-white dark:bg-[#151b2b] rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040] p-6 shadow-sm overflow-hidden"
            >
                <ReportsTable initialReports={reports} themeColor={themeColor} />
            </div>
        </div>
    );
}

