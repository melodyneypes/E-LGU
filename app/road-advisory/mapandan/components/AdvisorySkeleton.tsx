import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function PublicAdvisorySkeleton() {
    return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <div 
                    key={i} 
                    className="p-5 rounded-3xl bg-slate-900/60 shadow-lg space-y-4 animate-pulse"
                >
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-24 bg-slate-800 rounded-full" />
                        <Skeleton className="h-4 w-28 bg-slate-800/70 rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-3/4 bg-slate-800 rounded-lg" />
                        <Skeleton className="h-4 w-1/2 bg-slate-800/60 rounded-md" />
                    </div>
                    <div className="pt-2 flex items-center justify-between">
                        <Skeleton className="h-4 w-32 bg-slate-800/60 rounded-md" />
                        <Skeleton className="h-8 w-20 bg-slate-800 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    );
}
