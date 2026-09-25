import React from "react";

export default function Loading() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-7 sm:h-8 bg-primary/40 rounded-full animate-pulse" />
                        <div className="h-8 sm:h-9 w-64 bg-slate-200 dark:bg-white/10 rounded-xl" />
                    </div>
                    <div className="h-4 w-80 sm:w-96 bg-slate-100 dark:bg-white/5 rounded-lg" />
                </div>
                <div className="h-10 w-44 bg-slate-200 dark:bg-white/10 rounded-xl" />
            </div>

            {/* Metric Summary Cards Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c101b] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded" />
                            <div className="w-5 h-5 bg-slate-200 dark:bg-white/10 rounded-full" />
                        </div>
                        <div className="h-7 w-12 bg-slate-200 dark:bg-white/10 rounded-lg mt-2" />
                    </div>
                ))}
            </div>

            {/* Filter & Search Bar Skeleton */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#0c101b] p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm">
                <div className="h-10 w-full sm:max-w-xs bg-slate-100 dark:bg-white/5 rounded-xl" />
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-8 w-24 bg-slate-100 dark:bg-white/5 rounded-xl shrink-0" />
                    ))}
                </div>
            </div>

            {/* Announcement Listings Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#0c101b] border border-slate-200/80 dark:border-white/5 shadow-sm space-y-4"
                    >
                        <div className="space-y-3">
                            {/* Card badge skeleton */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="h-5 w-28 bg-slate-200 dark:bg-white/10 rounded-full" />
                                <div className="h-5 w-16 bg-slate-100 dark:bg-white/5 rounded-full" />
                            </div>

                            {/* Title & Content skeleton */}
                            <div className="h-5 w-3/4 bg-slate-200 dark:bg-white/10 rounded-md" />
                            <div className="space-y-1.5">
                                <div className="h-3.5 w-full bg-slate-100 dark:bg-white/5 rounded" />
                                <div className="h-3.5 w-5/6 bg-slate-100 dark:bg-white/5 rounded" />
                                <div className="h-3.5 w-2/3 bg-slate-100 dark:bg-white/5 rounded" />
                            </div>
                        </div>

                        {/* Card footer skeleton */}
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="h-3 w-20 bg-slate-100 dark:bg-white/5 rounded" />
                            <div className="flex gap-2">
                                <div className="w-8 h-8 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                <div className="w-8 h-8 bg-slate-100 dark:bg-white/5 rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
