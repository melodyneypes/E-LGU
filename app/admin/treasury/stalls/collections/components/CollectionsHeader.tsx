"use client";

import React from "react";
import { useCollections } from "./CollectionsProvider";
import { DollarSign, CheckCircle2, CreditCard, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CollectionsHeader() {
    const {
        collections,
        stalls,
        search,
        setSearch,
        paymentMethodFilter,
        setPaymentMethodFilter,
    } = useCollections();

    // Calculate today's metrics
    const todayStr = new Date().toISOString().split("T")[0];

    const todayCollections = collections.filter((c) => {
        const cDate = new Date(c.collectedDate).toISOString().split("T")[0];
        return cDate === todayStr && c.status === "PAID";
    });

    const totalRevenueToday = todayCollections.reduce((acc, curr) => acc + curr.totalAmountPaid, 0);
    const totalPaidStallsToday = new Set(todayCollections.map((c) => c.stallId)).size;
    const totalOccupiedStalls = stalls.length;
    const pendingStallsToday = Math.max(0, totalOccupiedStalls - totalPaidStallsToday);

    return (
        <div className="space-y-6">
            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Total Revenue Today */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-5 rounded-3xl shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Revenue Collected Today</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">₱{totalRevenueToday.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Stalls Paid Today */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-5 rounded-3xl shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Stalls Paid Today</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalPaidStallsToday} <span className="text-xs text-slate-400 font-normal italic">/ {totalOccupiedStalls} stalls</span></h3>
                    </div>
                </div>

                {/* Pending Stalls Today */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-5 rounded-3xl shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Pending / Unpaid Today</span>
                        <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingStallsToday} <span className="text-xs text-slate-400 font-normal italic">stalls</span></h3>
                    </div>
                </div>
            </div>

            {/* Toolbar Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-4 rounded-2xl shadow-md">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Ticket # or Stall #..."
                        className="pl-10 h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium"
                    />
                </div>

                <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="h-10 w-[160px] bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                        <SelectValue placeholder="All Payment Methods" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#151b2b]">
                        <SelectItem value="ALL">All Methods</SelectItem>
                        <SelectItem value="CASH">CASH</SelectItem>
                        <SelectItem value="EPAYMENT">EPAYMENT</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
