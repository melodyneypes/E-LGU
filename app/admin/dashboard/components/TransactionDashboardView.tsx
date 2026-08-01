"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Eye, Calendar, RotateCcw, FileText } from "lucide-react";

interface ChartDataPoint {
  date: string;
  requests: number;
  evaluation: number;
  processing: number;
  released: number;
  rejected: number;
}

interface TransactionDashboardViewProps {
  data: ChartDataPoint[];
  initialFrom: string;
  initialTo: string;
  categories: string[];
  activeCategory: string;
  themeColor?: string;
  isCompact?: boolean;
  rowSpan?: number;
}

type FilterType = "requests" | "evaluation" | "processing" | "released" | "rejected";

function ChartSkeleton() {
  return (
    <div className="h-[320px] w-full mt-4 flex flex-col justify-between animate-pulse">
      <div className="w-full h-full flex flex-col justify-between py-2 border-l border-b border-slate-200/30 dark:border-[#2a3040]/30 pl-4 relative overflow-hidden">
        {/* Pulsing Grid Lines */}
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 w-full">
            <div className="w-6 h-2.5 bg-slate-200/50 dark:bg-[#2a3040]/50 rounded shrink-0" />
            <div className="w-full h-[1px] bg-slate-100 dark:bg-[#2a3040]/20" />
          </div>
        ))}
        {/* A stylized placeholder curve to mimic the chart line */}
        <div className="absolute inset-0 flex items-end pl-8">
          <svg className="w-full h-32 text-slate-200/20 dark:text-[#2a3040]/20" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M0,100 C15,80 30,50 50,70 C70,90 85,20 100,50 L100,100 Z"
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

export function TransactionDashboardView({
  data,
  initialFrom,
  initialTo,
  categories: _categories,
  activeCategory,
  rowSpan = 1,
}: TransactionDashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeFilter, setActiveFilter] = useState<FilterType>("requests");
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);



  // Sum calculations for display totals
  const totalRequests = data.reduce((acc, curr) => acc + curr.requests, 0);
  const totalEvaluation = data.reduce((acc, curr) => acc + curr.evaluation, 0);
  const totalProcessing = data.reduce((acc, curr) => acc + curr.processing, 0);
  const totalReleased = data.reduce((acc, curr) => acc + curr.released, 0);
  const totalRejected = data.reduce((acc, curr) => acc + curr.rejected, 0);

  // Dynamic config matching selection
  const filterConfigs = {
    requests: {
      label: "All Requests",
      total: totalRequests,
      color: "#8b5cf6",
      gradientId: "colorRequests",
      icon: Eye,
    },
    evaluation: {
      label: "For Evaluation",
      total: totalEvaluation,
      color: "#f59e0b",
      gradientId: "colorEvaluation",
      icon: Clock,
    },
    processing: {
      label: "In Processing",
      total: totalProcessing,
      color: "#0ea5e9",
      gradientId: "colorProcessing",
      icon: TrendingUp,
    },
    released: {
      label: "Released",
      total: totalReleased,
      color: "#10b981",
      gradientId: "colorReleased",
      icon: CheckCircle,
    },
    rejected: {
      label: "Rejected",
      total: totalRejected,
      color: "#f43f5e",
      gradientId: "colorRejected",
      icon: AlertTriangle,
    },
  };

  const currentConfig = filterConfigs[activeFilter];

  const handleFilterChange = (newFrom: string, newTo: string, newCategory: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("from", newFrom);
    params.set("to", newTo);
    params.set("category", newCategory);
    startTransition(() => {
      router.push(`/admin/dashboard?${params.toString()}`, { scroll: false });
    });
  };

  const handleReset = () => {
    // Reset inputs
    setFromDate(initialFrom);
    setToDate(initialTo);
    setActiveFilter("requests");

    // Clear URL parameters
    startTransition(() => {
      router.push("/admin/dashboard", { scroll: false });
    });
  };

  const hasActiveFilters = searchParams.has("from") || searchParams.has("to") || searchParams.has("category") || activeFilter !== "requests";

  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
      {/* Header Row: Title & Subtitle Badge */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{ color: currentConfig.color }} />
            <span>Daily Request</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Analyzing <span className="font-bold" style={{ color: currentConfig.color }}>{currentConfig.label}</span> ({currentConfig.total.toLocaleString()} total requests)
          </p>
        </div>
      </div>

      {/* Sub-Header Dedicated Filter Toolbar Row - All Side-by-Side on 1 Single Line */}
      <div className="flex items-center gap-1.5 sm:gap-2 pt-1 overflow-x-auto no-scrollbar">
        {/* From Date Input */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-sm shrink-0">
          <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              handleFilterChange(e.target.value, toDate, activeCategory);
            }}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
          />
        </div>

        <span className="text-slate-400 text-[10px] font-bold italic shrink-0">to</span>

        {/* To Date Input */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-sm shrink-0">
          <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              handleFilterChange(fromDate, e.target.value, activeCategory);
            }}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
          />
        </div>

        {/* Status Select Dropdown */}
        <div className="relative min-w-[110px] max-w-[130px] shrink-0">
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as FilterType)}
            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-[10px] font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none transition-all pr-6 shadow-sm truncate"
            style={{ color: currentConfig.color }}
          >
            {(Object.keys(filterConfigs) as FilterType[]).map((key) => (
              <option key={key} value={key} className="bg-white dark:bg-[#151b2b] text-slate-800 dark:text-slate-200">
                {filterConfigs[key].label}
              </option>
            ))}
          </select>
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
                <linearGradient id={currentConfig.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0.0} />
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
                  `${value} Request(s)`,
                  currentConfig.label,
                ]}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />

              <Area
                type="monotone"
                dataKey={activeFilter}
                stroke={currentConfig.color}
                strokeWidth={3}
                fillOpacity={1}
                fill={`url(#${currentConfig.gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* View Detailed Report Action Button (Bottom Right) */}
      <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-[#2a3040]/30">
        <Link
          href={`/admin/reports/daily-requests?from=${fromDate}&to=${toDate}&category=${activeCategory}&status=${
            activeFilter === "requests" ? "ALL" : activeFilter === "evaluation" ? "FOR_REQUESTING" : activeFilter === "processing" ? "FOR_PROCESSING" : activeFilter.toUpperCase()
          }`}
          className="px-6 py-3 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider transition-all active:scale-95 shadow-md flex items-center gap-2 hover:opacity-90 cursor-pointer"
          style={{ backgroundColor: currentConfig.color }}
        >
          <FileText className="w-4 h-4" />
          <span>View Detailed Report</span>
        </Link>
      </div>
    </div>
  );
}
