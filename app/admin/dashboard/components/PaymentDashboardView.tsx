"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingUp, Calendar, Folder, RotateCcw, CreditCard } from "lucide-react";

interface PaymentChartPoint {
  date: string;
  amount: number;
}

interface PaymentDashboardViewProps {
  data: PaymentChartPoint[];
  initialFrom: string;
  initialTo: string;
  categories: string[];
  activeCategory: string;
  activeMethod: string;
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
}: PaymentDashboardViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  const totalAmount = data.reduce((acc, curr) => acc + curr.amount, 0);

  const handleFilterChange = (newFrom: string, newTo: string, newCategory: string, newMethod: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("payFrom", newFrom);
    params.set("payTo", newTo);
    params.set("payCategory", newCategory);
    params.set("payMethod", newMethod);
    startTransition(() => {
      router.push(`/admin/dashboard?${params.toString()}`, { scroll: false });
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
      router.push(`/admin/dashboard?${params.toString()}`, { scroll: false });
    });
  };

  const hasActiveFilters =
    searchParams.has("payFrom") ||
    searchParams.has("payTo") ||
    searchParams.has("payCategory") ||
    searchParams.has("payMethod");

  return (
    <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl space-y-6">
      {/* Header and Controls Row */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Collections Ledger</span>
          </h3>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
            Total Revenue: <span className="font-bold text-emerald-600 dark:text-emerald-400">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>

        {/* Date Inputs + Category Select + Method Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* From Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                handleFilterChange(e.target.value, toDate, activeCategory, activeMethod);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
            />
          </div>

          <span className="text-slate-400 text-xs font-bold">to</span>

          {/* To Input */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl shrink-0">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                handleFilterChange(fromDate, e.target.value, activeCategory, activeMethod);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none border-none cursor-pointer [color-scheme:light|dark]"
            />
          </div>

          {/* Category Dropdown Selection */}
          <div className="relative w-full sm:w-[130px]">
            <select
              value={activeCategory}
              onChange={(e) => handleFilterChange(fromDate, toDate, e.target.value, activeMethod)}
              className="w-full pl-9 pr-10 py-2.5 bg-slate-100 dark:bg-[#1e2330] border border-slate-200/50 dark:border-[#2a3040]/50 text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Folder className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          {/* Payment Method Selector Dropdown */}
          <div className="relative w-full sm:w-[130px]">
            <select
              value={activeMethod}
              onChange={(e) => handleFilterChange(fromDate, toDate, activeCategory, e.target.value)}
              className="w-full pl-9 pr-10 py-2.5 bg-slate-100 dark:bg-[#1e2330] border border-slate-200/50 dark:border-[#2a3040]/50 text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200 shadow-sm"
            >
              <option value="ALL">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
              <option value="E_PAYMENT">E-Payment</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 dark:text-slate-400">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="flex items-center justify-center p-2.5 bg-white dark:bg-[#1e2330] text-slate-500 hover:text-red-500 border border-slate-200 dark:border-[#2a3040] hover:border-red-500/30 rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
              title="Reset Filters"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Recharts Render Area / Skeleton Loader */}
      {isPending ? (
        <ChartSkeleton />
      ) : (
        <div className="h-[320px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenueOnly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                formatter={(value: any) => [
                  `₱${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  "Collections",
                ]}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />

              <Area
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenueOnly)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
