import { Skeleton } from "@/components/ui/skeleton";

export default function AnnouncementsLoading() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Section Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
                        <Skeleton className="h-10 w-72 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <Skeleton className="h-4 w-96 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
                </div>
            </div>

            {/* Metric Cards Skeleton Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="bg-white dark:bg-[#151b2b] rounded-xl p-3 border border-slate-200 dark:border-[#2a3040] space-y-2 ring-1 ring-slate-200 dark:ring-white/5"
                    >
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Skeleton className="h-3 w-20 bg-slate-200 dark:bg-slate-800" />
                                <Skeleton className="h-6 w-12 bg-slate-200 dark:bg-slate-800" />
                            </div>
                            <Skeleton className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Table Card Skeleton */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                {/* Filters Skeleton Toolbar */}
                <div className="p-6 border-b border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="flex flex-wrap gap-4 w-full sm:w-auto flex-1">
                        <Skeleton className="h-12 w-64 rounded-xl bg-slate-200 dark:bg-slate-800" />
                        <Skeleton className="h-12 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
                        <Skeleton className="h-12 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <Skeleton className="h-12 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Table Rows Skeleton */}
                <div className="p-6 space-y-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800/50">
                            <div className="space-y-2 flex-1 max-w-sm">
                                <Skeleton className="h-4 w-48 bg-slate-200 dark:bg-slate-800" />
                                <Skeleton className="h-3 w-64 bg-slate-200/70 dark:bg-slate-800/70" />
                            </div>
                            <Skeleton className="h-6 w-24 rounded-lg bg-slate-200 dark:bg-slate-800" />
                            <Skeleton className="h-6 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
                            <Skeleton className="h-4 w-28 bg-slate-200 dark:bg-slate-800" />
                            <Skeleton className="h-8 w-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
