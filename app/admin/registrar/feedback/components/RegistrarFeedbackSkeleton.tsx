import React from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RegistrarFeedbackSkeleton() {
    return (
        <div className="space-y-6">
            {/* KPI Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card
                        key={i}
                        className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-3.5 w-24 rounded-md" />
                            <Skeleton className="h-7 w-7 rounded-lg" />
                        </div>
                        <Skeleton className="h-8 w-20 rounded-md" />
                        <Skeleton className="h-3 w-32 rounded-md pt-2" />
                    </Card>
                ))}
            </div>

            {/* Filter and Search Bar Skeleton */}
            <Card className="p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] flex flex-col md:flex-row items-center justify-between gap-3">
                <Skeleton className="h-10 w-full md:max-w-md rounded-xl" />
                <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <Skeleton className="h-10 w-36 rounded-xl" />
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                </div>
            </Card>

            {/* Table and Pagination Skeleton */}
            <Card className="rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121622] overflow-hidden">
                {/* Table Header Skeleton */}
                <div className="p-4 md:p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="w-7 h-7 rounded-lg" />
                        <Skeleton className="h-4 w-48 rounded-md" />
                    </div>
                </div>

                {/* Table Rows Skeleton */}
                <div className="p-4 space-y-3.5">
                    {/* Header Row */}
                    <div className="grid grid-cols-6 gap-4 pb-2 border-b border-slate-100 dark:border-white/5">
                        <Skeleton className="h-3 w-28 rounded-md col-span-1" />
                        <Skeleton className="h-3 w-20 rounded-md col-span-1" />
                        <Skeleton className="h-3 w-16 rounded-md col-span-1" />
                        <Skeleton className="h-3 w-36 rounded-md col-span-1" />
                        <Skeleton className="h-3 w-20 rounded-md col-span-1" />
                        <Skeleton className="h-3 w-12 rounded-md col-span-1 ml-auto" />
                    </div>

                    {/* Data Rows */}
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div
                            key={i}
                            className="grid grid-cols-6 gap-4 py-2.5 items-center border-b border-slate-100/60 dark:border-white/[0.02] last:border-none"
                        >
                            <Skeleton className="h-4 w-32 rounded-md col-span-1" />
                            <Skeleton className="h-6 w-24 rounded-lg col-span-1" />
                            <Skeleton className="h-5 w-20 rounded-md col-span-1" />
                            <Skeleton className="h-4 w-48 rounded-md col-span-1" />
                            <Skeleton className="h-3.5 w-24 rounded-md col-span-1" />
                            <Skeleton className="h-8 w-16 rounded-xl col-span-1 ml-auto" />
                        </div>
                    ))}
                </div>

                {/* Pagination Controls Skeleton matching Dashboard style */}
                <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]/50">
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-4 w-24 rounded-md" />
                        <Skeleton className="h-8 w-[70px] rounded-lg" />
                    </div>

                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-28 rounded-md" />
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-10 w-16 rounded-xl" />
                            <Skeleton className="h-10 w-16 rounded-xl" />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
