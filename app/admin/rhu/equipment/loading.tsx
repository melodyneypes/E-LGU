import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
    Boxes,
    ShoppingCart,
    ClipboardCheck,
    Truck,
    RotateCcw,
    Wrench,
    FileSpreadsheet,
    Search,
    Plus,
    Building2,
    RefreshCw
} from "lucide-react";

export default function EquipmentLoading() {
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 w-full max-w-full animate-in fade-in duration-300">
            {/* Top Banner Skeleton */}
            <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-r from-slate-100 via-white to-slate-50 dark:from-[#161a24] dark:via-[#161a24] dark:to-[#1a202c] border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2.5">
                        {/* Status Badges */}
                        <div className="flex items-center gap-2">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                Live Sync
                            </div>
                            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                                COA Compliant
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-xl md:text-2xl lg:text-3xl font-black italic tracking-tight uppercase text-slate-900 dark:text-white leading-tight">
                            Medical Equipment &amp; Stockroom Monitoring
                        </h1>

                        {/* Description */}
                        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl">
                            Granular room-by-room physical equipment tracking, purchase intakes, BHS requisitions, stock transfers, and COA audit reports.
                        </p>
                    </div>

                    {/* Sync Button Skeleton */}
                    <div className="flex items-center gap-2.5 shrink-0">
                        <div className="h-10 px-4 rounded-2xl border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/10 flex items-center gap-2 text-slate-600 dark:text-white font-bold text-xs uppercase">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                            <span>Loading...</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Metrics Bar (6 Cards) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                    { label: "Total Units", sub: "unique equipment" },
                    { label: "In Stockroom", sub: "batches" },
                    { label: "Deployed (BHS)", sub: "deployed records" },
                    { label: "PPE (> ₱50k)", sub: "" },
                    { label: "Semi-Expendable", sub: "" },
                    { label: "Defective / Return", sub: "" },
                ].map((item, idx) => (
                    <Card key={idx} className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] p-4 text-center space-y-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                            {item.label}
                        </span>
                        <div className="flex justify-center py-1">
                            <Skeleton className="h-7 w-16 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                        </div>
                        {item.sub ? (
                            <div className="flex justify-center">
                                <Skeleton className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                            </div>
                        ) : (
                            <div className="h-2.5" />
                        )}
                    </Card>
                ))}
            </div>

            {/* Sub-Navigation Tabs Carousel Skeleton */}
            <div className="relative flex items-center">
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 overflow-x-hidden w-full px-8 sm:px-9">
                    {[
                        { label: "Master Ledger & Rooms", icon: Boxes, active: true },
                        { label: "Purchase Orders", icon: ShoppingCart },
                        { label: "Requisitions", icon: ClipboardCheck },
                        { label: "Stock Transfers", icon: Truck },
                        { label: "Receiving & Returns", icon: RotateCcw },
                        { label: "Defects & IIRUP", icon: Wrench },
                        { label: "COA Audit Reports", icon: FileSpreadsheet },
                    ].map((tab, idx) => {
                        const Icon = tab.icon;
                        return (
                            <div
                                key={idx}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider whitespace-nowrap transition-all ${
                                    tab.active
                                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border-b-2 border-sky-500"
                                        : "text-slate-400 dark:text-slate-500 opacity-60"
                                }`}
                            >
                                <Icon className="w-4 h-4 shrink-0" />
                                <span>{tab.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Master Ledger Skeleton Content */}
            <div className="space-y-4">
                {/* Filters & Actions Bar */}
                <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-[#161a24] border border-slate-200 dark:border-slate-800 shadow-xs">
                    {/* Search & Filters */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        {/* Search Input Skeleton */}
                        <div className="relative flex-1 min-w-[170px] sm:min-w-[210px] max-w-sm">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <div className="h-9 pl-9 pr-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center">
                                <span className="text-xs text-slate-400 font-medium">Search property #, name, brand...</span>
                            </div>
                        </div>

                        {/* Dropdown Skeletons */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
                            <Skeleton className="h-9 w-[165px] rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" />
                            <Skeleton className="h-9 w-[125px] rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" />
                            <Skeleton className="h-9 w-[118px] rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10" />
                        </div>
                    </div>

                    {/* Action Buttons Skeleton */}
                    <div className="flex items-center gap-2 shrink-0 self-end xl:self-center">
                        <div className="h-9 px-3.5 rounded-xl font-black text-xs uppercase tracking-wider text-white bg-sky-600/80 flex items-center gap-1.5 shadow-xs">
                            <Plus className="w-3.5 h-3.5" /> Register Item
                        </div>
                        <div className="h-9 px-3 rounded-xl font-bold text-xs uppercase border border-slate-200 dark:border-white/20 bg-slate-50 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" /> BHS Legacy / Donation
                        </div>
                    </div>
                </div>

                {/* Table Skeleton */}
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161a24] overflow-hidden shadow-sm">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                        <div className="col-span-2">Asset Tag / QR</div>
                        <div className="col-span-3">Equipment Name &amp; Brand</div>
                        <div className="col-span-2">Location (Facility / Room)</div>
                        <div className="col-span-2">Custodian</div>
                        <div className="col-span-1">COA Class</div>
                        <div className="col-span-2 text-right">Current Stock &amp; Value</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 p-1">
                        {Array.from({ length: 7 }).map((_, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-3.5 items-center">
                                {/* Asset Tag */}
                                <div className="col-span-2 flex items-center gap-2">
                                    <Skeleton className="w-6 h-6 rounded-lg bg-sky-500/10 shrink-0" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-3.5 w-24 rounded bg-slate-200 dark:bg-slate-700/60" />
                                        <Skeleton className="h-2.5 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                                    </div>
                                </div>

                                {/* Equipment Name & Brand */}
                                <div className="col-span-3 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-40 rounded-md bg-slate-200 dark:bg-slate-700/60" />
                                        <Skeleton className="h-4 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                                    </div>
                                    <Skeleton className="h-3 w-28 rounded bg-slate-100 dark:bg-slate-800" />
                                </div>

                                {/* Location */}
                                <div className="col-span-2 space-y-1">
                                    <Skeleton className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700/60" />
                                    <Skeleton className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                                </div>

                                {/* Custodian */}
                                <div className="col-span-2 flex items-center gap-2">
                                    <Skeleton className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                                    <Skeleton className="h-3.5 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
                                </div>

                                {/* COA Class */}
                                <div className="col-span-1">
                                    <Skeleton className="h-5 w-20 rounded-full bg-teal-500/10" />
                                </div>

                                {/* Stock & Value */}
                                <div className="col-span-2 flex flex-col items-end space-y-1">
                                    <Skeleton className="h-4 w-20 rounded bg-emerald-500/10" />
                                    <Skeleton className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
}
