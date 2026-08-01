import React from "react";

export default function Loading() {
    return (
        <div className="p-8 w-full space-y-8 min-h-screen bg-slate-50 dark:bg-[#0c111d] animate-pulse">
            <div className="max-w-7xl mx-auto h-16 bg-slate-200 dark:bg-[#1e2330] rounded-2xl"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto">
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-3xl"></div>
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-3xl"></div>
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-3xl"></div>
                <div className="h-28 bg-slate-200 dark:bg-[#1e2330] rounded-3xl"></div>
            </div>
            <div className="max-w-7xl mx-auto h-96 bg-slate-200 dark:bg-[#1e2330] rounded-3xl"></div>
        </div>
    );
}
