import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminReportsLoading() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Top Navigation & Header Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-4 w-36 rounded-md bg-slate-200 dark:bg-white/10" />
                <div className="space-y-2">
                    <Skeleton className="h-9 w-64 rounded-xl bg-slate-200 dark:bg-white/10" />
                    <Skeleton className="h-4 w-96 rounded-md bg-slate-200 dark:bg-white/10" />
                </div>
            </div>

            {/* Quick KPI Stats Cards Grid Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                        <Skeleton className="w-12 h-12 rounded-xl shrink-0 bg-slate-200 dark:bg-white/10" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-3 w-20 rounded bg-slate-200 dark:bg-white/10" />
                            <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-white/10" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Container Skeleton */}
            <div className="bg-white dark:bg-[#151b2b] rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040] p-6 shadow-sm space-y-6">
                {/* Filters Row Skeleton */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Skeleton className="h-11 w-36 rounded-xl bg-slate-200 dark:bg-white/10" />
                        <Skeleton className="h-11 w-40 rounded-xl bg-slate-200 dark:bg-white/10" />
                    </div>
                    <Skeleton className="h-11 w-full sm:w-[320px] rounded-xl bg-slate-200 dark:bg-white/10" />
                </div>

                {/* Table Header & Rows Skeleton */}
                <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-6 gap-4 pb-3 border-b border-slate-100 dark:border-[#2a3040]/50 px-2">
                        <Skeleton className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10" />
                        <Skeleton className="h-4 w-20 rounded bg-slate-200 dark:bg-white/10" />
                        <Skeleton className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10" />
                        <Skeleton className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10" />
                        <Skeleton className="h-4 w-16 rounded bg-slate-200 dark:bg-white/10" />
                        <Skeleton className="h-4 w-12 rounded bg-slate-200 dark:bg-white/10 justify-self-end" />
                    </div>

                    {[1, 2, 3, 4, 5, 6].map((row) => (
                        <div key={row} className="grid grid-cols-6 gap-4 py-3 border-b border-slate-50 dark:border-[#2a3040]/30 px-2 items-center">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/10 shrink-0" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-28 rounded bg-slate-200 dark:bg-white/10" />
                                    <Skeleton className="h-3 w-36 rounded bg-slate-200 dark:bg-white/10" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-24 rounded-lg bg-slate-200 dark:bg-white/10" />
                            <Skeleton className="h-6 w-20 rounded-lg bg-slate-200 dark:bg-white/10" />
                            <Skeleton className="h-4 w-28 rounded bg-slate-200 dark:bg-white/10" />
                            <Skeleton className="h-6 w-20 rounded-full bg-slate-200 dark:bg-white/10" />
                            <Skeleton className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-white/10 justify-self-end" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
