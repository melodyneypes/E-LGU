import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Calendar, RefreshCcw } from "lucide-react";

export default function RHULedgerLoading() {
    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-300 w-full max-w-full">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-8 bg-rose-500 rounded-full" />
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            RHU Consultation <span className="text-rose-500">Ledger</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-xs md:text-sm">
                        Official historical records of completed Rural Health Unit patient consultations.
                    </p>
                </div>
            </div>

            {/* Main Table Container */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-rose-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                {/* Filters Row */}
                <div className="flex flex-col border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
                    <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                                {/* Search input skeleton */}
                                <div className="relative w-full sm:w-[350px]">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <div className="pl-10 h-11 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] rounded-xl text-xs flex items-center text-slate-400 font-bold">
                                        Search patient name, control #, barangay...
                                    </div>
                                </div>

                                {/* Category dropdown skeleton */}
                                <div className="h-11 w-full sm:w-52 rounded-xl bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] px-3 flex items-center justify-between text-xs font-bold text-slate-500">
                                    <span>All Checkups</span>
                                    <div className="w-4 h-4 rounded bg-slate-200 dark:bg-white/10" />
                                </div>
                            </div>

                            {/* Date range pickers skeleton */}
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="flex items-center gap-2 px-3 h-11 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] rounded-xl w-full sm:w-[170px] shrink-0">
                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex flex-col w-full text-[9px] text-slate-400 font-bold uppercase">
                                        <span className="leading-none text-[8px] mb-0.5">Date From</span>
                                        <span className="text-xs font-bold text-slate-400">mm/dd/yyyy</span>
                                    </div>
                                </div>

                                <span className="text-slate-400 text-xs font-bold shrink-0">to</span>

                                <div className="flex items-center gap-2 px-3 h-11 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] rounded-xl w-full sm:w-[170px] shrink-0">
                                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                                    <div className="flex flex-col w-full text-[9px] text-slate-400 font-bold uppercase">
                                        <span className="leading-none text-[8px] mb-0.5">Date To</span>
                                        <span className="text-xs font-bold text-slate-400">mm/dd/yyyy</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Refresh Button skeleton */}
                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <div className="h-11 w-11 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] flex items-center justify-center text-slate-400">
                                <RefreshCcw className="w-4 h-4 animate-spin text-rose-500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Skeleton */}
                <div className="overflow-x-auto">
                    <div className="w-full">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-3 px-5 py-4 bg-slate-50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-700 dark:text-slate-300">
                            <div className="col-span-1">#</div>
                            <div className="col-span-2">Ref / Control #</div>
                            <div className="col-span-3">Patient / Applicant ⇅</div>
                            <div className="col-span-2">Check-up Type ⇅</div>
                            <div className="col-span-2">Appt Date &amp; Slot ▼</div>
                            <div className="col-span-1">Priority</div>
                            <div className="col-span-1">Status ⇅</div>
                        </div>

                        {/* Shimmer Rows */}
                        <div className="divide-y divide-slate-100 dark:divide-[#2a3040]/50 p-2">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 px-3 py-4 items-center animate-pulse">
                                    <div className="col-span-1">
                                        <Skeleton className="h-4 w-4 rounded bg-rose-500/20" />
                                    </div>
                                    <div className="col-span-2">
                                        <Skeleton className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10" />
                                    </div>
                                    <div className="col-span-3 space-y-1.5">
                                        <Skeleton className="h-4 w-44 rounded bg-slate-200 dark:bg-white/10" />
                                        <Skeleton className="h-3 w-28 rounded bg-slate-100 dark:bg-white/5" />
                                    </div>
                                    <div className="col-span-2">
                                        <Skeleton className="h-4 w-32 rounded bg-slate-200 dark:bg-white/10" />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <Skeleton className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10" />
                                        <Skeleton className="h-3 w-28 rounded bg-rose-500/20" />
                                    </div>
                                    <div className="col-span-1">
                                        <Skeleton className="h-4 w-14 rounded bg-slate-200 dark:bg-white/10" />
                                    </div>
                                    <div className="col-span-1">
                                        <Skeleton className="h-6 w-24 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Pagination Footer Skeleton */}
                <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]/50">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span className="hidden sm:inline-block">Rows per page:</span>
                        <div className="h-8 w-[70px] border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] rounded-lg px-2 flex items-center justify-between">
                            <span>10</span>
                            <div className="w-3 h-3 rounded bg-slate-200 dark:bg-white/10" />
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-28 rounded bg-slate-200 dark:bg-white/10" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-16 rounded-xl bg-slate-200 dark:bg-white/10" />
                            <Skeleton className="h-10 w-16 rounded-xl bg-slate-200 dark:bg-white/10" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
