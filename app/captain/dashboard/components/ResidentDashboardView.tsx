"use client";

import React, { useState, useTransition, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Users, Calendar, Folder, RotateCcw, Heart, UserCheck } from "lucide-react";

interface ResidentChartPoint {
  date: string;
  count: number;
}

interface ResidentDashboardViewProps {
  data: ResidentChartPoint[];
  initialFrom: string;
  initialTo: string;
  activeGender: string;
  activeCivilStatus: string;
  activeSector: string;
  isCompact?: boolean;
  rowSpan?: number;
}

function ChartSkeleton() {
  return (
    <div className="h-[320px] w-full mt-4 flex flex-col justify-between animate-pulse">
      <div className="w-full h-full flex flex-col justify-between py-2 border-l border-b border-slate-200/30 dark:border-[#2a3040]/30 pl-4 relative overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 w-full">
            <div className="w-6 h-2.5 bg-slate-200/50 dark:bg-[#2a3040]/50 rounded shrink-0" />
            <div className="w-full h-[1px] bg-slate-100 dark:bg-[#2a3040]/20" />
          </div>
        ))}
        <div className="absolute inset-0 flex items-end pl-8">
          <svg className="w-full h-32 text-blue-200/10 dark:text-blue-500/5" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M0,95 C30,70 50,90 70,60 C85,40 95,80 100,50 L100,100 Z"
              fill="currentColor"
            />
          </svg>
        </div>
      </div>
      <div className="flex justify-between items-center pl-10 pr-2 pt-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="w-10 h-3 bg-slate-200/50 dark:bg-[#2a3040]/50 rounded" />
        ))}
      </div>
    </div>
  );
}

export function ResidentDashboardView({
  data,
  initialFrom,
  initialTo,
  activeGender,
  activeCivilStatus,
  activeSector,
  rowSpan = 1,
}: ResidentDashboardViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  const totalCount = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.count, 0);
  }, [data]);

  const handleFilterChange = (
    newFrom: string,
    newTo: string,
    newGender: string,
    newCivil: string,
    newSector: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newFrom) params.set("resFrom", newFrom);
    if (newTo) params.set("resTo", newTo);
    if (newGender && newGender !== "ALL") params.set("resGender", newGender);
    else params.delete("resGender");

    if (newCivil && newCivil !== "ALL") params.set("resCivil", newCivil);
    else params.delete("resCivil");

    if (newSector && newSector !== "ALL") params.set("resSector", newSector);
    else params.delete("resSector");

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleReset = () => {
    setFromDate(initialFrom);
    setToDate(initialTo);
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasActiveFilters =
    searchParams.has("resFrom") ||
    searchParams.has("resTo") ||
    searchParams.has("resGender") ||
    searchParams.has("resCivil") ||
    searchParams.has("resSector");

  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
      {/* Header Row: Title & Total Count Badge */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Resident Analytics</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Approved Onboarded: <span className="font-bold text-blue-600 dark:text-blue-400">{totalCount.toLocaleString()} Residents</span>
          </p>
        </div>
      </div>

      {/* Sub-Header Dedicated Filter Toolbar Row - All Side-by-Side on 1 Single Line */}
      <div className="flex items-center gap-1.5 sm:gap-2 pt-1 overflow-x-auto no-scrollbar">
        {/* From Date Input */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-sm shrink-0">
          <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              handleFilterChange(e.target.value, toDate, activeGender, activeCivilStatus, activeSector);
            }}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
          />
        </div>

        <span className="text-slate-400 text-[10px] font-bold italic shrink-0">to</span>

        {/* To Date Input */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-sm shrink-0">
          <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              handleFilterChange(fromDate, e.target.value, activeGender, activeCivilStatus, activeSector);
            }}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
          />
        </div>

        {/* Gender Selector */}
        <div className="relative min-w-[100px] max-w-[120px] shrink-0">
          <select
            value={activeGender}
            onChange={(e) => handleFilterChange(fromDate, toDate, e.target.value, activeCivilStatus, activeSector)}
            className="w-full pl-7 pr-6 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-[10px] font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200 shadow-sm truncate"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
            <UserCheck className="w-3 h-3 text-slate-400" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>

        {/* Civil Status Selector */}
        <div className="relative min-w-[100px] max-w-[120px] shrink-0">
          <select
            value={activeCivilStatus}
            onChange={(e) => handleFilterChange(fromDate, toDate, activeGender, e.target.value, activeSector)}
            className="w-full pl-7 pr-6 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-[10px] font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200 shadow-sm truncate"
          >
            <option value="ALL">All Statuses</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
            <option value="Divorced">Divorced</option>
          </select>
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
            <Folder className="w-3 h-3 text-slate-400" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>

        {/* Sector Selector */}
        <div className="relative min-w-[100px] max-w-[120px] shrink-0">
          <select
            value={activeSector}
            onChange={(e) => handleFilterChange(fromDate, toDate, activeGender, activeCivilStatus, e.target.value)}
            className="w-full pl-7 pr-6 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-[10px] font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200 shadow-sm truncate"
          >
            <option value="ALL">All Sectors</option>
            <option value="SENIOR">Senior</option>
            <option value="PWD">PWD</option>
            <option value="SOLO_PARENT">Solo Parent</option>
            <option value="INDIGENOUS">Indigenous</option>
            <option value="VOTER">Voter</option>
            <option value="STUDENT">Student</option>
            <option value="EMPLOYED">Employed</option>
            <option value="UNEMPLOYED">Unemployed</option>
            <option value="FOUR_PS">4Ps Beneficiary</option>
          </select>
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
            <Heart className="w-3 h-3 text-slate-400" />
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500 dark:text-slate-400">
            <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
            </svg>
          </div>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl text-[10px] font-black uppercase italic tracking-wider hover:bg-rose-100 transition-colors shadow-sm shrink-0"
            title="Reset Filters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Dynamic Height Recharts Render Area / Skeleton Loader */}
      {isPending ? (
        <ChartSkeleton />
      ) : (
        <div
          style={{ height: `${280 + (rowSpan - 1) * 140}px` }}
          className="w-full mt-4 transition-all duration-300"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOnboarding" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity="0.4" />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />

              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />

              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                  borderRadius: "1rem",
                  color: "#fff",
                  fontSize: "12px",
                  fontFamily: "inherit",
                }}
                formatter={(value: any) => [
                  `${value} Approved`,
                  "Onboarded Residents",
                ]}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />

              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorOnboarding)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
