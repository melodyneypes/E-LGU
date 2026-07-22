import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-96 rounded-xl" />
                    <Skeleton className="h-4 w-72 rounded-lg" />
                </div>
            </div>

            {/* Table Card Skeleton */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl p-6 space-y-6">
                {/* Search & Filter bar */}
                <div className="flex flex-col md:flex-row justify-between gap-4">
                    <Skeleton className="h-11 w-full max-w-md rounded-xl" />
                    <div className="flex gap-3">
                        <Skeleton className="h-11 w-40 rounded-xl" />
                        <Skeleton className="h-11 w-40 rounded-xl" />
                    </div>
                </div>

                {/* Table Rows Skeleton */}
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-xl" />
                    ))}
                </div>

                {/* Footer Pagination Skeleton */}
                <div className="flex justify-between items-center pt-4">
                    <Skeleton className="h-4 w-48 rounded" />
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-20 rounded-xl" />
                        <Skeleton className="h-9 w-24 rounded-xl" />
                        <Skeleton className="h-9 w-20 rounded-xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
