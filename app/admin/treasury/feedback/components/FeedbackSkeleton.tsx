import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedbackSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Card key={i} className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] space-y-3">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3 w-24 rounded-md" />
                            <Skeleton className="h-7 w-7 rounded-lg" />
                        </div>
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-3 w-32 rounded-md pt-2" />
                    </Card>
                ))}
            </div>

            {/* Filter Bar Skeleton */}
            <Card className="p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] flex flex-col md:flex-row items-center justify-between gap-3">
                <Skeleton className="h-10 w-full md:max-w-md rounded-xl" />
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Skeleton className="h-10 w-36 rounded-xl" />
                    <Skeleton className="h-10 w-10 rounded-xl" />
                </div>
            </Card>

            {/* Table Skeleton */}
            <Card className="rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] overflow-hidden p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                </div>

                <div className="space-y-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100/60 dark:border-white/[0.02] last:border-none">
                            <div className="space-y-1.5 w-1/4">
                                <Skeleton className="h-3.5 w-32 rounded-md" />
                                <Skeleton className="h-2.5 w-24 rounded-md" />
                            </div>
                            <Skeleton className="h-6 w-24 rounded-lg" />
                            <Skeleton className="h-5 w-20 rounded-md" />
                            <Skeleton className="h-3.5 w-48 rounded-md hidden md:block" />
                            <Skeleton className="h-3 w-20 rounded-md" />
                            <Skeleton className="h-8 w-16 rounded-xl" />
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
