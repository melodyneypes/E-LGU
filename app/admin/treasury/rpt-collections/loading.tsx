import React from "react";

export default function Loading() {
    return (
        <div className="p-4 md:p-8 space-y-8 w-full min-h-screen animate-pulse">
            {/* Top header skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100 dark:border-[#2a3040]/30">
                <div className="space-y-3">
                    <div className="h-3 w-28 bg-slate-200 dark:bg-[#1e2330] rounded-md"></div>
                    <div className="h-9 w-80 bg-slate-200 dark:bg-[#1e2330] rounded-xl"></div>
                    <div className="h-4 w-96 bg-slate-200 dark:bg-[#1e2330] rounded-md"></div>
                </div>
                <div className="h-12 w-64 bg-slate-200 dark:bg-[#1e2330] rounded-2xl"></div>
            </div>

            {/* Quick KPI Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-[2rem]"></div>
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-[2rem]"></div>
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-[2rem]"></div>
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-[2rem]"></div>
            </div>

            {/* Filters Bar Skeleton */}
            <div className="h-24 bg-slate-200 dark:bg-[#1e2330] rounded-[2rem]"></div>

            {/* Table Skeleton */}
            <div className="h-96 bg-slate-200 dark:bg-[#1e2330] rounded-[2rem]"></div>
        </div>
    );
}
