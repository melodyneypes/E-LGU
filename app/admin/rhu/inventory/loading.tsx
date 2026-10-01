import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function InventoryLoading() {
    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            {/* Header Banner Skeleton */}
            <div className="p-6 sm:p-7 rounded-3xl bg-[#091122] border border-[#162340] shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl bg-[#0f1b34] shrink-0" />
                    <div className="space-y-2">
                        <Skeleton className="h-7 w-60 bg-[#162340] rounded-xl" />
                        <Skeleton className="h-4 w-96 max-w-full bg-[#162340]/60 rounded-lg" />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-10 w-28 bg-[#162340] rounded-2xl" />
                    <Skeleton className="h-10 w-32 bg-[#162340] rounded-2xl" />
                </div>
            </div>

            {/* Top Metric Cards Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] space-y-2 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3.5 w-20 rounded-md" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-16 rounded-lg" />
                        <Skeleton className="h-3 w-28 rounded-md" />
                    </div>
                ))}
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="flex flex-col xl:flex-row items-start gap-6">
                {/* Main Table Area */}
                <div className="flex-1 min-w-0 w-full space-y-4">
                    {/* Filter Bar */}
                    <div className="p-3 rounded-2xl border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] flex flex-wrap gap-2.5 items-center justify-between shadow-sm">
                        <div className="flex flex-wrap gap-2 items-center flex-1">
                            <Skeleton className="h-9 w-36 rounded-xl" />
                            <Skeleton className="h-9 w-36 rounded-xl" />
                            <Skeleton className="h-9 w-40 rounded-xl" />
                        </div>
                        <Skeleton className="h-9 w-48 rounded-xl" />
                    </div>

                    {/* Table Skeleton */}
                    <div className="rounded-2xl border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-[#162340] flex items-center justify-between">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-4 w-24 rounded" />
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-[#162340]/60 p-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="py-3 px-3 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="w-8 h-8 rounded-lg" />
                                        <div className="space-y-1.5">
                                            <Skeleton className="h-4 w-44 rounded-md" />
                                            <Skeleton className="h-3 w-28 rounded" />
                                        </div>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-6">
                                        <Skeleton className="h-4 w-20 rounded" />
                                        <Skeleton className="h-4 w-16 rounded" />
                                        <Skeleton className="h-6 w-20 rounded-full" />
                                    </div>
                                    <Skeleton className="h-8 w-20 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar Skeleton */}
                <div className="w-full xl:w-[340px] 2xl:w-[350px] shrink-0 space-y-4 xl:sticky xl:top-4">
                    {/* Stock Overview Card Skeleton */}
                    <div className="rounded-2xl p-5 border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] space-y-4 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Skeleton className="w-9 h-9 rounded-xl" />
                                <Skeleton className="h-4 w-28 rounded-md" />
                            </div>
                            <Skeleton className="w-7 h-7 rounded-lg" />
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-2">
                            <Skeleton className="w-28 h-28 rounded-full shrink-0" />
                            <div className="space-y-3 flex-1">
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="h-4 w-full rounded" />
                            </div>
                        </div>
                    </div>

                    {/* Low Stock Alert Skeleton */}
                    <div className="rounded-2xl p-5 border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-4 w-32 rounded-md" />
                            <Skeleton className="h-3 w-14 rounded" />
                        </div>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="py-2 flex items-center justify-between gap-2">
                                <div className="space-y-1">
                                    <Skeleton className="h-3.5 w-28 rounded" />
                                    <Skeleton className="h-2.5 w-16 rounded" />
                                </div>
                                <Skeleton className="h-7 w-16 rounded-full" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
