"use client";

import React from "react";

export default function TreasuryDetailSkeleton() {
    return (
        <div className="space-y-8 animate-pulse p-2 md:p-6 max-w-7xl mx-auto select-none">
            {/* Header Breadcrumbs & Action Bar Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b28] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-900/5">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                        <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                    <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                </div>
            </div>

            {/* Main Layout Grid matching GenericServiceView */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left/Main Area (col-span-8): Applicant Profile, Assessment Form, Requirements Vault */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Primary Applicant Profile Skeleton */}
                    <div className="bg-white dark:bg-[#151b28] p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2 flex-1">
                                <div className="h-3 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg" />
                                <div className="h-8 w-64 bg-slate-300 dark:bg-slate-700 rounded-xl" />
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                        </div>

                        {/* Metrics Grid Skeleton */}
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                            <div className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2" />
                            <div className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2" />
                            <div className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2" />
                            <div className="h-16 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 space-y-2" />
                        </div>
                    </div>

                    {/* Requirements Vault Grid Skeleton */}
                    <div className="bg-white dark:bg-[#151b28] p-10 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
                            <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-800/50 rounded-2xl" />
                        </div>
                    </div>
                </div>

                {/* Right Area (col-span-4): Tracking Info Card & Action Controls */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Transaction Info Card Skeleton */}
                    <div className="bg-white dark:bg-[#151b28] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                            <div className="space-y-2 flex-1 min-w-0">
                                <div className="h-5 w-3/4 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                                <div className="h-3 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                            <div className="h-4 w-full bg-slate-100 dark:bg-slate-800/40 rounded-lg" />
                            <div className="h-4 w-5/6 bg-slate-100 dark:bg-slate-800/40 rounded-lg" />
                            <div className="h-4 w-2/3 bg-slate-100 dark:bg-slate-800/40 rounded-lg" />
                        </div>
                    </div>

                    {/* Actions Panel Skeleton */}
                    <div className="bg-white dark:bg-[#151b28] p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-4">
                        <div className="h-14 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                        <div className="h-14 w-full bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    );
}
