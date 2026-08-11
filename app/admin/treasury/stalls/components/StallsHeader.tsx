"use client";

import React from "react";
import { useStalls } from "./StallsProvider";
import { Store, LayoutGrid, Table as TableIcon, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function StallsHeader() {
    const {
        stalls,
        stallTypes,
        themeColor,
        search,
        setSearch,
        selectedStatus,
        setSelectedStatus,
        selectedStallType,
        setSelectedStallType,
        viewMode,
        setViewMode,
    } = useStalls();

    const totalStalls = stalls.length;
    const occupiedCount = stalls.filter((s) => s.status === "OCCUPIED").length;
    const vacantCount = stalls.filter((s) => s.status === "VACANT").length;

    return (
        <div className="space-y-6">
            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-6 lg:p-8 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Store className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                            Market Stalls <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold not-italic">Registry</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-0.5">
                            {totalStalls} total stalls · {occupiedCount} occupied · {vacantCount} vacant
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-4 rounded-2xl shadow-md">
                {/* Search Input */}
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Stall # or Vendor..."
                        className="pl-10 h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium"
                    />
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {/* Status Dropdown */}
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="h-10 w-[140px] bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="VACANT">Vacant</SelectItem>
                            <SelectItem value="OCCUPIED">Occupied</SelectItem>
                            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                            <SelectItem value="RESERVED">Reserved</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Stall Type Dropdown */}
                    <Select value={selectedStallType} onValueChange={setSelectedStallType}>
                        <SelectTrigger className="h-10 w-[160px] bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                            <SelectValue placeholder="All Sections" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                            <SelectItem value="ALL">All Sections</SelectItem>
                            {stallTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                    {type.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* View Mode Toggle (Grid / Table) */}
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-1.5 rounded-lg transition-colors ${
                                viewMode === "grid"
                                    ? "bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode("table")}
                            className={`p-1.5 rounded-lg transition-colors ${
                                viewMode === "table"
                                    ? "bg-white dark:bg-[#151b2b] text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            }`}
                            title="Table View"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
