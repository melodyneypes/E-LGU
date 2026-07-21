import React from "react";

export default function ResidentsLoading() {
  return (
    <div className="p-8 w-full space-y-8 animate-pulse">
      {/* Header Section Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-10 w-80 bg-slate-200 dark:bg-[#1e2330] rounded-2xl" />
          <div className="h-4 w-[500px] max-w-full bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
        </div>
      </div>

      {/* Stat Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#151b2b] p-6 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4"
          >
            <div className="p-4 rounded-xl w-14 h-14 bg-slate-200 dark:bg-[#1e2330]" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
              <div className="h-8 w-16 bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Table Container Wrapper */}
      <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
        {/* Filters Row Skeleton */}
        <div className="p-4 flex flex-wrap items-center gap-3 w-full border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
          <div className="h-11 w-[150px] bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
          <div className="h-11 w-[130px] bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
          <div className="h-11 w-[160px] bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
          <div className="h-11 w-[260px] bg-slate-200 dark:bg-[#1e2330] rounded-xl sm:ml-auto" />
          <div className="h-11 w-[180px] bg-slate-200 dark:bg-[#1e2330] rounded-xl" />
        </div>

        {/* Table Skeletons */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 dark:bg-[#1a1f2e] dark:border-[#2a3040]">
                <th className="py-5 px-6"><div className="h-4 w-12 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-[#1e2330] rounded-lg" /></th>
                <th className="px-6 text-right"><div className="h-4 w-16 bg-slate-200 dark:bg-[#1e2330] rounded-lg ml-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-[#2a3040]/50">
                  <td className="py-4 px-6">
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-[#1e2330]" />
                  </td>
                  <td className="px-4">
                    <div className="space-y-2">
                      <div className="h-4 w-40 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                      <div className="h-3 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                    </div>
                  </td>
                  <td className="px-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                  </td>
                  <td className="px-4">
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-16 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                      <div className="h-3 w-28 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                    </div>
                  </td>
                  <td className="px-4">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                  </td>
                  <td className="px-4">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                  </td>
                  <td className="px-4">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                  </td>
                  <td className="px-4">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-lg" />
                  </td>
                  <td className="px-6 text-right">
                    <div className="h-9 w-9 bg-slate-200 dark:bg-[#1e2330] rounded-xl ml-auto" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
