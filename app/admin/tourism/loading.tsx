import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <Skeleton className="h-4 w-96 rounded-xl bg-slate-100 dark:bg-slate-800/60" />
                </div>
            </div>

            {/* Metric Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 bg-white dark:bg-[#151b2b] rounded-xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                        <Skeleton className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800" />
                        <div className="space-y-1 text-right">
                            <Skeleton className="h-3 w-20 ml-auto rounded bg-slate-100 dark:bg-slate-800" />
                            <Skeleton className="h-7 w-12 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Container Skeleton */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                {/* Filter Bar Skeleton */}
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040]">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        <Skeleton className="h-11 w-full max-w-sm rounded-xl bg-slate-100 dark:bg-slate-800" />
                        <Skeleton className="h-11 w-36 rounded-xl bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <Skeleton className="h-11 w-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
                </div>

                {/* Table Rows Skeleton */}
                <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center justify-between py-3 px-4 border-b border-slate-100 dark:border-[#2a3040]/50">
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800" />
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                                    <Skeleton className="h-3 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                                </div>
                            </div>
                            <Skeleton className="h-6 w-20 rounded-lg bg-slate-200 dark:bg-slate-800" />
                            <Skeleton className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                            <Skeleton className="h-6 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                            <div className="flex gap-2">
                                <Skeleton className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                                <Skeleton className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
