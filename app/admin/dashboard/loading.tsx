import React from "react";

export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-pulse">
      {/* Header Section Skeleton */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#2a3040]">
        <div className="space-y-3 flex-1">
          <div className="h-9 w-64 bg-slate-200 dark:bg-[#1e2330] rounded-2xl" />
          <div className="h-4 w-96 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
        </div>
        <div className="h-12 w-48 bg-slate-200 dark:bg-[#1e2330] rounded-2xl" />
      </div>

      {/* Stat Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-36 bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040]/30 flex flex-col justify-between"
          >
            <div>
              <div className="h-3 w-24 bg-slate-200 dark:bg-[#2a3040] rounded-lg mb-2" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-[#2a3040] rounded-xl" />
            </div>
            <div className="h-5 w-28 bg-slate-200 dark:bg-[#2a3040] rounded-full" />
          </div>
        ))}
      </div>

      {/* Strategic Operations & Activity Logs Side-by-Side Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-[22rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[3rem] border border-slate-200 dark:border-[#2a3040]/30" />
        <div className="h-[22rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[3rem] border border-slate-200 dark:border-[#2a3040]/30" />
      </div>

      {/* Charts Skeleton */}
      <div className="space-y-8">
        <div className="h-[28rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040]/30" />
        <div className="h-[28rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040]/30" />
        <div className="h-[28rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040]/30" />
      </div>

      {/* Announcements & News Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[20rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040]/30" />
        <div className="h-[20rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040]/30" />
      </div>

      {/* Events & Projects Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-[20rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040]/30" />
        <div className="h-[20rem] bg-slate-100 dark:bg-[#1e2330]/50 rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040]/30" />
      </div>
    </div>
  );
}
