import React from "react";
import FeedbackSkeleton from "./components/FeedbackSkeleton";

export default function Loading() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header Skeleton */}
            <div className="space-y-2">
                <div className="h-7 w-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-3.5 w-96 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            </div>

            {/* Dashboard Skeleton */}
            <FeedbackSkeleton />
        </div>
    );
}
