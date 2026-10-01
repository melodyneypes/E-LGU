"use client";

import React, { useState } from "react";
import { Pill, AlertTriangle, Bell, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RHUInventorySidebarItem {
    id: string;
    name: string;
    genericName?: string | null;
    brandName?: string | null;
    category: "MEDICINE" | "MEDICAL_SUPPLY";
    dosage?: string | null;
    unit: string;
    quantity: number;
    reorderLevel: number;
    expirationDate?: string | Date | null;
    batchNumber?: string | null;
    remarks?: string | null;
    healthCenterId?: string | null;
    healthCenterName?: string | null;
}

interface RHUInventorySidebarProps {
    items: RHUInventorySidebarItem[];
    activeStockFilter: string;
    onFilterChange: (filter: string) => void;
    onItemSelect?: (item: RHUInventorySidebarItem) => void;
    healthCenterName?: string | null;
    onCollapse?: () => void;
}

export function RHUInventorySidebar({
    items,
    activeStockFilter,
    onFilterChange,
    onItemSelect,
    healthCenterName,
    onCollapse
}: RHUInventorySidebarProps) {
    const [showAllCritical, setShowAllCritical] = useState(false);

    // Compute medicine statistics
    const medicineItems = items.filter(i => i.category === "MEDICINE");
    const totalMedicines = medicineItems.length;
    const inStockCount = medicineItems.filter(i => i.quantity > i.reorderLevel).length;
    const lowStockCount = medicineItems.filter(i => i.quantity > 0 && i.quantity <= i.reorderLevel).length;
    const outOfStockCount = medicineItems.filter(i => i.quantity <= 0).length;

    // Critical shortages: medicines with quantity <= reorderLevel or 0 stock
    // Sort out-of-stock first, then lowest quantity
    const criticalItems = medicineItems
        .filter(i => i.quantity <= i.reorderLevel || i.quantity <= 0)
        .sort((a, b) => {
            if (a.quantity <= 0 && b.quantity > 0) return -1;
            if (b.quantity <= 0 && a.quantity > 0) return 1;
            return a.quantity - b.quantity;
        });

    const displayedCritical = showAllCritical ? criticalItems : criticalItems.slice(0, 3);

    // Donut chart math
    const radius = 50;
    const circumference = 2 * Math.PI * radius; // ~314.159
    const activeSegmentsCount = (inStockCount > 0 ? 1 : 0) + (lowStockCount > 0 ? 1 : 0) + (outOfStockCount > 0 ? 1 : 0);
    const gap = activeSegmentsCount > 1 ? 4 : 0;

    // Segment 1: In Stock (Green)
    const inStockLen = totalMedicines > 0 ? (inStockCount / totalMedicines) * circumference : 0;
    const inStockDash = Math.max(0, inStockLen - gap);

    // Segment 2: Low Stock (Amber)
    const lowStockLen = totalMedicines > 0 ? (lowStockCount / totalMedicines) * circumference : 0;
    const lowStockDash = Math.max(0, lowStockLen - gap);

    // Segment 3: Out of Stock (Pink)
    const outOfStockLen = totalMedicines > 0 ? (outOfStockCount / totalMedicines) * circumference : 0;
    const outOfStockDash = Math.max(0, outOfStockLen - gap);

    const handleViewAll = () => {
        if (criticalItems.length > 3) {
            setShowAllCritical(prev => !prev);
        } else {
            // Filter the main inventory table to low/out of stock
            onFilterChange(activeStockFilter === "LOW_STOCK" ? "ALL" : "LOW_STOCK");
        }
    };

    return (
        <aside className="w-full space-y-4 font-sans select-none">
            {/* Card 1: Stock Overview */}
            <div className="rounded-2xl p-5 bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-sm dark:shadow-xl transition-colors">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#0f1b34] border border-blue-200 dark:border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-slate-100 shadow-inner">
                            <Pill className="w-5 h-5 -rotate-45" />
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            Stock Overview
                        </h3>
                    </div>

                    {onCollapse && (
                        <button
                            type="button"
                            onClick={onCollapse}
                            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                            title="Collapse side panel"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Donut Chart & Legend */}
                <div className="flex items-center justify-between gap-4">
                    {/* SVG Donut */}
                    <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
                            {/* Track circle */}
                            <circle
                                cx="64"
                                cy="64"
                                r={radius}
                                fill="transparent"
                                className="stroke-slate-200 dark:stroke-[#162340]"
                                strokeWidth="13"
                            />

                            {/* In Stock - Green (#00d084) */}
                            {inStockCount > 0 && (
                                <circle
                                    cx="64"
                                    cy="64"
                                    r={radius}
                                    fill="transparent"
                                    stroke="#00d084"
                                    strokeWidth="13"
                                    strokeDasharray={`${inStockDash} ${circumference - inStockDash}`}
                                    strokeDashoffset="0"
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                />
                            )}

                            {/* Low Stock - Amber (#f89a1c) */}
                            {lowStockCount > 0 && (
                                <circle
                                    cx="64"
                                    cy="64"
                                    r={radius}
                                    fill="transparent"
                                    stroke="#f89a1c"
                                    strokeWidth="13"
                                    strokeDasharray={`${lowStockDash} ${circumference - lowStockDash}`}
                                    strokeDashoffset={-inStockLen}
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                />
                            )}

                            {/* Out of Stock - Pink (#ff0055) */}
                            {outOfStockCount > 0 && (
                                <circle
                                    cx="64"
                                    cy="64"
                                    r={radius}
                                    fill="transparent"
                                    stroke="#ff0055"
                                    strokeWidth="13"
                                    strokeDasharray={`${outOfStockDash} ${circumference - outOfStockDash}`}
                                    strokeDashoffset={-(inStockLen + lowStockLen)}
                                    strokeLinecap="round"
                                    className="transition-all duration-500"
                                />
                            )}
                        </svg>

                        {/* Center Label */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                                {totalMedicines}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center leading-tight mt-1 max-w-[62px]">
                                Total Medicines
                            </span>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex-1 space-y-3 pl-1">
                        <button
                            type="button"
                            onClick={() => onFilterChange(activeStockFilter === "IN_STOCK" ? "ALL" : "IN_STOCK")}
                            className={cn(
                                "w-full flex items-center justify-between text-left group px-2 py-1.5 -mx-2 rounded-lg transition-colors",
                                activeStockFilter === "IN_STOCK"
                                    ? "bg-emerald-500/15 ring-1 ring-emerald-500/40"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800/40"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#00d084] shadow-sm shadow-[#00d084]/50 shrink-0" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    In Stock
                                </span>
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                                {inStockCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onFilterChange(activeStockFilter === "LOW_STOCK" ? "ALL" : "LOW_STOCK")}
                            className={cn(
                                "w-full flex items-center justify-between text-left group px-2 py-1.5 -mx-2 rounded-lg transition-colors",
                                activeStockFilter === "LOW_STOCK"
                                    ? "bg-amber-500/15 ring-1 ring-amber-500/40"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800/40"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#f89a1c] shadow-sm shadow-[#f89a1c]/50 shrink-0" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    Low Stock
                                </span>
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                                {lowStockCount}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => onFilterChange(activeStockFilter === "OUT_OF_STOCK" ? "ALL" : "OUT_OF_STOCK")}
                            className={cn(
                                "w-full flex items-center justify-between text-left group px-2 py-1.5 -mx-2 rounded-lg transition-colors",
                                activeStockFilter === "OUT_OF_STOCK"
                                    ? "bg-rose-500/15 ring-1 ring-rose-500/40"
                                    : "hover:bg-slate-100 dark:hover:bg-slate-800/40"
                            )}
                        >
                            <div className="flex items-center gap-2.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#ff0055] shadow-sm shadow-[#ff0055]/50 shrink-0" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                    Out of Stock
                                </span>
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                                {outOfStockCount}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Card 2: Critical Shortages */}
            <div className="rounded-2xl p-5 bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-sm dark:shadow-xl transition-colors">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#ff0055]">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                            Critical Shortages
                        </h3>
                    </div>
                    {criticalItems.length > 0 && (
                        <button
                            type="button"
                            onClick={handleViewAll}
                            className="text-xs font-semibold text-[#ff0055] hover:text-rose-400 transition-colors cursor-pointer"
                        >
                            {criticalItems.length > 3 ? (showAllCritical ? "Show Less" : "View All") : "View All"}
                        </button>
                    )}
                </div>

                {/* List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {criticalItems.length === 0 ? (
                        <div className="py-4 text-center">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-2">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                No critical shortages.
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                                All medicine stock levels are healthy.
                            </p>
                        </div>
                    ) : (
                        displayedCritical.map((item) => {
                            const isOutOfStock = item.quantity <= 0;
                            const dosageDisplay = item.dosage && !item.name.toLowerCase().includes(item.dosage.toLowerCase())
                                ? ` ${item.dosage}`
                                : "";
                            const centerLabel = item.healthCenterName || healthCenterName || "RHU Mapandan";

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => onItemSelect?.(item)}
                                    className="py-3 flex items-center justify-between gap-3 group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/30 px-2 -mx-2 rounded-xl transition-all"
                                    title={`Click to locate ${item.name}`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors truncate">
                                            {item.name}{dosageDisplay}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-400 mt-0.5 truncate">
                                            {centerLabel}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            "shrink-0 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-bold text-white tracking-tight shadow-sm shadow-[#ff0055]/30",
                                            "bg-[#ff0055]"
                                        )}
                                    >
                                        {isOutOfStock ? "Out of Stock" : "Critical"}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Card 3: Reminder */}
            <div className="rounded-2xl p-5 bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-sm dark:shadow-xl transition-colors">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-[#ff0055] shrink-0">
                        <Bell className="w-4 h-4 text-[#ff0055]" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        Reminder
                    </h3>
                </div>

                {/* Notification Box */}
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-[#0c0916] border border-rose-200 dark:border-rose-500/40 flex items-center gap-3.5 shadow-sm dark:shadow-[0_0_15px_rgba(255,0,85,0.04)]">
                    <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                        <svg className="w-7 h-7 shrink-0 drop-shadow-sm" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="11" fill="#ff0055" />
                            <path d="M12 8.5v.01M12 11.5v4.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <p className="text-xs sm:text-[12.5px] text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                        Please coordinate with the Municipal Health Office for urgent procurement of medicines with critical shortages.
                    </p>
                </div>
            </div>
        </aside>
    );
}
