"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { TrendingUp, Calendar, RotateCcw, CreditCard } from "lucide-react";

interface PaymentChartPoint {
  date: string;
  amount: number;
  [key: string]: any;
}

interface PaymentDashboardViewProps {
  data: PaymentChartPoint[];
  initialFrom: string;
  initialTo: string;
  categories: string[];
  activeCategory: string;
  activeMethod: string;
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
          <svg className="w-full h-32 text-emerald-200/10 dark:text-emerald-500/5" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path
              d="M0,90 C20,70 40,85 60,40 C80,20 90,60 100,30 L100,100 Z"
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

export function PaymentDashboardView({
  data,
  initialFrom,
  initialTo,
  categories,
  activeCategory,
  activeMethod,
  rowSpan = 1,
}: PaymentDashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  const totalAmount = data.reduce((acc, curr) => acc + curr.amount, 0);

  const pathname = usePathname();

  const handleFilterChange = (newFrom: string, newTo: string, newCategory: string, newMethod: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("payFrom", newFrom);
    params.set("payTo", newTo);
    params.set("payCategory", newCategory);
    params.set("payMethod", newMethod);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleReset = () => {
    setFromDate(initialFrom);
    setToDate(initialTo);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("payFrom");
      params.delete("payTo");
      params.delete("payCategory");
      params.delete("payMethod");
      router.push(pathname, { scroll: false });
    });
  };

  const hasActiveFilters =
    searchParams.has("payFrom") ||
    searchParams.has("payTo") ||
    searchParams.has("payCategory") ||
    searchParams.has("payMethod");

  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
      {/* Header Row: Title & Total Revenue Badge */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Collections Ledger</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Total Revenue: <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
      </div>

      {/* Sub-Header Dedicated Filter Toolbar Row - All Side-by-Side on 1 Single Line */}
      <div className="flex items-center gap-1.5 sm:gap-2 pt-1 overflow-x-auto no-scrollbar">
        {/* From Date Input */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-sm shrink-0">
          <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              handleFilterChange(e.target.value, toDate, activeCategory, activeMethod);
            }}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
          />
        </div>

        <span className="text-slate-400 text-[10px] font-bold italic shrink-0">to</span>

        {/* To Date Input */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-sm shrink-0">
          <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              handleFilterChange(fromDate, e.target.value, activeCategory, activeMethod);
            }}
            className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
          />
        </div>

        {/* Payment Method Selector Dropdown */}
        <div className="relative min-w-[110px] max-w-[130px] shrink-0">
          <select
            value={activeMethod}
            onChange={(e) => handleFilterChange(fromDate, toDate, activeCategory, e.target.value)}
            className="w-full pl-7 pr-6 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-[10px] font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200 shadow-sm truncate"
          >
            <option value="ALL">All Methods</option>
            <option value="CASH">Cash</option>
            <option value="E_PAYMENT">E-Pay</option>
            <option value="BANK_TRANSFER">Bank</option>
          </select>
          <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
            <CreditCard className="w-3 h-3 text-slate-400" />
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
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                width={70}
                tickFormatter={(val) => {
                  if (val >= 1e9) return `₱${(val / 1e9).toFixed(1)}B`;
                  if (val >= 1e6) return `₱${(val / 1e6).toFixed(1)}M`;
                  if (val >= 1e3) return `₱${(val / 1e3).toFixed(0)}K`;
                  return `₱${val}`;
                }}
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
                formatter={(value: any, name?: any) => [
                  `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  name === "amount" ? "Total Revenue" : String(name || ""),
                ]}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />

              <Legend 
                wrapperStyle={{ paddingTop: "12px", fontSize: "11px", fontWeight: "bold" }} 
                iconType="circle"
              />

              {/* Render category lines if ALL is selected, otherwise render selected category line */}
              {activeCategory === "ALL" ? (
                categories.length > 0 ? (
                  categories.map((cat, idx) => {
                    const colors = [
                      "#059669", // Dark Emerald / Teal
                      "#7c3aed", // Deep Royal Purple
                      "#2563eb", // Deep Electric Blue
                      "#d97706", // Dark Gold / Amber
                      "#b91c1c", // Dark Wine Red
                      "#0891b2", // Dark Cyan
                      "#ea580c", // Deep Burnt Orange
                      "#4f46e5"  // Deep Indigo
                    ];
                    const strokeColor = colors[idx % colors.length];
                    return (
                      <Line
                        key={cat}
                        type="monotone"
                        dataKey={cat}
                        name={cat}
                        stroke={strokeColor}
                        strokeWidth={3}
                        dot={{ r: 3, strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    );
                  })
                ) : (
                  <Line
                    type="monotone"
                    dataKey="amount"
                    name="Total Revenue"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                )
              ) : (
                <Line
                  type="monotone"
                  dataKey={activeCategory}
                  name={activeCategory}
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 7 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* View Full Ledger Button at the bottom */}
      <div className="pt-4 border-t border-slate-100 dark:border-[#2a3040]/50 flex justify-end">
        <Link
          href={`${pathname.startsWith("/captain") ? "/captain" : "/mayor"}/payments`}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95"
        >
          <CreditCard className="w-4 h-4" />
          Go to Payments Ledger
        </Link>
      </div>
    </div>
  );
}
