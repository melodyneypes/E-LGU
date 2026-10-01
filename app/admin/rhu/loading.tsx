import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Activity,
    Clock,
    CheckCircle2,
    ArrowRight,
    Building2,
    Calendar
} from "lucide-react";

export default function RHUDashboardLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 pb-16 animate-in fade-in duration-300 w-full max-w-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-6 h-6 text-rose-500 shrink-0" />
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            Rural Health Unit <span className="text-rose-500">Dashboard</span>
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Overview analytics, appointment summary metrics, and operational counter controls.
                    </p>
                </div>

                {/* Counter Selector Skeleton */}
                <div className="flex items-center gap-3 flex-wrap relative z-10">
                    <Skeleton className="h-10 w-44 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                </div>
            </div>

            {/* Metrics Overview (6 Stat Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Total */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Total</span>
                    <div className="flex items-baseline justify-between mt-3">
                        <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
                        <Activity className="w-4 h-4 text-rose-500 opacity-60" />
                    </div>
                </div>

                {/* Booked */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-500">Booked</span>
                    <div className="flex items-baseline justify-between mt-3">
                        <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
                        <Clock className="w-4 h-4 text-sky-500 opacity-60" />
                    </div>
                </div>

                {/* Checked In */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Checked In</span>
                    <div className="flex items-baseline justify-between mt-3">
                        <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
                        <CheckCircle2 className="w-4 h-4 text-indigo-500 opacity-60" />
                    </div>
                </div>

                {/* Consultation */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Consultation</span>
                    <div className="flex items-baseline justify-between mt-3">
                        <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
                        <Activity className="w-4 h-4 text-amber-500 opacity-60" />
                    </div>
                </div>

                {/* Referred */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500">Referred</span>
                    <div className="flex items-baseline justify-between mt-3">
                        <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
                        <Activity className="w-4 h-4 text-fuchsia-500 opacity-60" />
                    </div>
                </div>

                {/* Completed */}
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Completed</span>
                    <div className="flex items-baseline justify-between mt-3">
                        <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" />
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-60" />
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Consultations Snapshot */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                        <div>
                            <h3 className="text-base font-black uppercase italic tracking-tight text-slate-800 dark:text-white">
                                Recent Appointments Snapshot
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                Latest patient consultations filed
                            </p>
                        </div>
                        <div className="h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-rose-500">
                            View All <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>

                    {/* Shimmer Rows */}
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 animate-pulse"
                            >
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
                                    <Skeleton className="h-3 w-36 rounded-md bg-slate-100 dark:bg-slate-800/60" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-4 w-20 rounded-md bg-rose-500/20" />
                                    <Skeleton className="h-4 w-4 rounded-md bg-slate-200 dark:bg-slate-800" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Modules Navigation Links */}
                <div className="space-y-4">
                    {/* Consultations Hub */}
                    <div className="bg-rose-600 text-white rounded-3xl p-6 shadow-md shadow-rose-600/20 flex flex-col justify-between min-h-[160px]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest opacity-80">Consultations Hub</span>
                            <Activity className="w-6 h-6 opacity-80" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase italic tracking-tight">Manage Consultations</h4>
                            <p className="text-[10px] font-bold opacity-90 uppercase tracking-wider mt-1">
                                Evaluate, confirm, and process patient check-ups
                            </p>
                        </div>
                    </div>

                    {/* Staff & Health Centers */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between min-h-[140px] border border-slate-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Locations &amp; Facilities</span>
                            <Building2 className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase italic tracking-tight">Staff &amp; Health Centers</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                Manage health centers, stations, and medical staff roster
                            </p>
                        </div>
                    </div>

                    {/* Appointment Settings */}
                    <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col justify-between min-h-[140px]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Settings</span>
                            <Calendar className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase italic tracking-tight">Appointment Settings</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                Manage daily capacity and operating schedule
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
