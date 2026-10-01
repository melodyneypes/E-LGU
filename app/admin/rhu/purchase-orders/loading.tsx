import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Pill, Clock, CheckCircle2, Search, RefreshCcw, FileText, FileSpreadsheet } from "lucide-react";

export default function DispenseLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 pb-16 w-full max-w-full animate-in fade-in duration-300">
            {/* Header Banner Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 shrink-0">
                            <Pill className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            RHU <span className="text-rose-600">Medicine Dispense</span>
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Manage, track, and export summaries for RHU prescription medicine dispensing.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="h-10 px-4 bg-rose-600/80 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-sm flex items-center gap-2">
                        <FileText className="w-4 h-4" /> EXPORT PDF
                    </div>
                    <div className="h-10 px-4 bg-emerald-600/80 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-sm flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" /> EXPORT EXCEL
                    </div>
                </div>
            </div>

            {/* Quick Metrics Cards Skeleton (4 Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Dispenses */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Dispenses</span>
                        <Pill className="w-4 h-4 text-rose-500" />
                    </div>
                    <Skeleton className="h-9 w-16 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
                </div>

                {/* Pending Approval */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-500">Pending Approval</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <Skeleton className="h-9 w-16 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
                </div>

                {/* Dispense Approved */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-teal-500">Dispense Approved</span>
                        <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    </div>
                    <Skeleton className="h-9 w-16 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
                </div>

                {/* Completed & Dispensed */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-500">Completed &amp; Dispensed</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <Skeleton className="h-9 w-16 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
                </div>
            </div>

            {/* Filter & Controls Bar Skeleton */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <div className="pl-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs flex items-center text-slate-400">
                        Search dispense #, patient, control #...
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Skeleton className="w-full md:w-60 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10" />
                    <div className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                        <RefreshCcw className="w-4 h-4 animate-spin text-rose-500" />
                    </div>
                </div>
            </div>

            {/* Dispense Table Skeleton */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-3 px-5 py-3.5 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-[10px] font-black uppercase tracking-wider italic text-slate-500">
                        <div className="col-span-2">Ref / Control #</div>
                        <div className="col-span-2">Patient / Applicant</div>
                        <div className="col-span-2 text-sky-600 dark:text-sky-400">Doctor Prescribed</div>
                        <div className="col-span-2 text-emerald-600 dark:text-emerald-400">Actual Pharmacy Qty</div>
                        <div className="col-span-1">Appt Date</div>
                        <div className="col-span-1">Dispensed By</div>
                        <div className="col-span-1">Status</div>
                        <div className="col-span-1 text-right">Action</div>
                    </div>

                    {/* Shimmering Rows */}
                    <div className="divide-y divide-slate-100 dark:divide-white/5 p-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="grid grid-cols-12 gap-3 px-3 py-4 items-center">
                                <div className="col-span-2">
                                    <Skeleton className="h-4 w-24 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Skeleton className="h-4 w-36 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                    <Skeleton className="h-3 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
                                </div>
                                <div className="col-span-2">
                                    <Skeleton className="h-4 w-32 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                                <div className="col-span-2">
                                    <Skeleton className="h-4 w-36 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                                <div className="col-span-1">
                                    <Skeleton className="h-3.5 w-20 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                                <div className="col-span-1">
                                    <Skeleton className="h-3.5 w-24 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                                <div className="col-span-1">
                                    <Skeleton className="h-6 w-24 rounded-full bg-emerald-500/15" />
                                </div>
                                <div className="col-span-1 flex justify-end">
                                    <Skeleton className="h-8 w-16 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
