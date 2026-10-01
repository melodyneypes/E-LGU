import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Bed, Plus } from "lucide-react";

export default function BedsLoading() {
    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            {/* 2-Column Responsive Layout */}
            <div className="flex flex-col xl:flex-row items-start gap-6">
                {/* Main Content Area */}
                <div className="flex-1 min-w-0 w-full space-y-6">
                    {/* Header Banner */}
                    <div className="p-6 sm:p-7 rounded-3xl bg-[#091122] border border-[#162340] shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0f1b34] border border-blue-500/25 flex items-center justify-center text-slate-100 shrink-0 shadow-inner mt-0.5">
                                <Bed className="w-6 h-6 text-white" />
                            </div>
                            <div className="space-y-2 min-w-0">
                                <Skeleton className="h-7 w-64 bg-[#162340] rounded-xl" />
                                <Skeleton className="h-4 w-96 max-w-full bg-[#162340]/60 rounded-lg" />
                            </div>
                        </div>

                        {/* Add Bed Button Skeleton */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            <div className="h-9 px-3.5 rounded-xl bg-blue-600/80 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-600/30">
                                <Plus className="w-4 h-4" />
                                <span>Add Bed</span>
                            </div>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <Card className="rounded-2xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-3.5 sm:p-4">
                        <CardContent className="p-0 flex flex-wrap items-end gap-3">
                            <div className="w-full sm:w-[145px] space-y-1.5">
                                <Skeleton className="h-3 w-10 bg-slate-200 dark:bg-slate-700/60 rounded" />
                                <Skeleton className="h-9 w-full rounded-xl bg-slate-100 dark:bg-[#0d1629]" />
                            </div>
                            <div className="w-full sm:w-[155px] space-y-1.5">
                                <Skeleton className="h-3 w-16 bg-slate-200 dark:bg-slate-700/60 rounded" />
                                <Skeleton className="h-9 w-full rounded-xl bg-slate-100 dark:bg-[#0d1629]" />
                            </div>
                            <div className="w-full sm:w-[145px] space-y-1.5">
                                <Skeleton className="h-3 w-14 bg-slate-200 dark:bg-slate-700/60 rounded" />
                                <Skeleton className="h-9 w-full rounded-xl bg-slate-100 dark:bg-[#0d1629]" />
                            </div>
                            <div className="w-full sm:w-[175px] space-y-1.5">
                                <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-700/60 rounded" />
                                <Skeleton className="h-9 w-full rounded-xl bg-slate-100 dark:bg-[#0d1629]" />
                            </div>
                            <div className="flex-1 min-w-[200px] space-y-1.5">
                                <Skeleton className="h-3 w-12 bg-slate-200 dark:bg-slate-700/60 rounded" />
                                <div className="flex gap-2">
                                    <Skeleton className="h-9 flex-1 rounded-xl bg-slate-100 dark:bg-[#0d1629]" />
                                    <Skeleton className="h-9 w-10 rounded-xl bg-rose-500/20" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Bed Overview Table Card */}
                    <div className="rounded-2xl border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl overflow-hidden">
                        {/* Table Header Details */}
                        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#162340] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                                <Bed className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-700/60" />
                                    <Skeleton className="h-3 w-64 rounded bg-slate-100 dark:bg-slate-800" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Skeleton className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700/60" />
                                <Skeleton className="h-4 w-20 rounded bg-rose-500/20" />
                                <Skeleton className="h-4 w-20 rounded bg-emerald-500/20" />
                            </div>
                        </div>

                        {/* Table Rows Skeleton */}
                        <div className="divide-y divide-slate-100 dark:divide-[#162340]/60 p-2">
                            {/* Table Column Headers */}
                            <div className="grid grid-cols-12 gap-3 px-3 py-3 text-[11px] font-bold text-slate-500 uppercase">
                                <div className="col-span-2">Bed No.</div>
                                <div className="col-span-3">Facility / Center</div>
                                <div className="col-span-2">Bed Type</div>
                                <div className="col-span-2">Department</div>
                                <div className="col-span-2">Status</div>
                                <div className="col-span-1 text-right">Actions</div>
                            </div>

                            {/* 6 Shimmering Rows */}
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="grid grid-cols-12 gap-3 px-3 py-3.5 items-center">
                                    <div className="col-span-2 space-y-1">
                                        <Skeleton className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700/60" />
                                        <Skeleton className="h-2.5 w-14 rounded bg-slate-100 dark:bg-slate-800" />
                                    </div>
                                    <div className="col-span-3 flex items-center gap-2">
                                        <Skeleton className="w-6 h-6 rounded-lg bg-blue-500/10 shrink-0" />
                                        <Skeleton className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
                                    </div>
                                    <div className="col-span-2">
                                        <Skeleton className="h-3.5 w-16 rounded bg-slate-200 dark:bg-slate-700/60" />
                                    </div>
                                    <div className="col-span-2">
                                        <Skeleton className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
                                    </div>
                                    <div className="col-span-2">
                                        <Skeleton className="h-6 w-20 rounded-full bg-emerald-500/15" />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <Skeleton className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="w-full xl:w-[350px] shrink-0 space-y-4 xl:sticky xl:top-4">
                    {/* Bed Summary Card Skeleton */}
                    <Card className="rounded-3xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-5 sm:p-6 space-y-5">
                        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-[#162340]">
                            <Bed className="w-5 h-5 text-slate-500" />
                            <Skeleton className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700/60" />
                        </div>

                        {/* Donut Chart Skeleton */}
                        <div className="py-4 flex flex-col items-center justify-center space-y-5">
                            <Skeleton className="w-36 h-36 rounded-full bg-slate-200 dark:bg-[#162340]" />
                            <div className="w-full space-y-3">
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-3.5 w-20 rounded" />
                                    <Skeleton className="h-3.5 w-8 rounded" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-3.5 w-20 rounded" />
                                    <Skeleton className="h-3.5 w-8 rounded" />
                                </div>
                                <div className="flex justify-between items-center">
                                    <Skeleton className="h-3.5 w-24 rounded" />
                                    <Skeleton className="h-3.5 w-8 rounded" />
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Bed Availability by Department Card Skeleton */}
                    <Card className="rounded-3xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-[#162340]">
                            <Skeleton className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700/60" />
                        </div>
                        <div className="space-y-3 pt-1">
                            <div className="space-y-1.5">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-28 rounded" />
                                    <Skeleton className="h-3 w-10 rounded" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-20 rounded" />
                                    <Skeleton className="h-3 w-10 rounded" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
