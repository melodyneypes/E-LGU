"use client";

import React from "react";
import { useStallTypes } from "./StallTypesProvider";
import { Tag, Plus, LayoutGrid, Table as TableIcon, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StallTypesHeader() {
    const {
        stallTypes,
        themeColor,
        search,
        setSearch,
        viewMode,
        setViewMode,
        setIsAddOpen,
    } = useStallTypes();

    const totalSections = stallTypes.length;

    return (
        <div className="space-y-6">
            {/* Header Title & Add Action Card */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-6 lg:p-8 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Tag className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                            Market Sections <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold not-italic">Categories</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-0.5">
                            {totalSections} total market sections & stall types registered.
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setIsAddOpen(true)}
                    className="h-12 px-6 rounded-2xl text-xs font-black uppercase italic tracking-wider shadow-lg flex items-center gap-2 text-white transition-all active:scale-95 cursor-pointer"
                    style={{ backgroundColor: themeColor }}
                >
                    <Plus className="w-4 h-4" />
                    <span>Add New Section</span>
                </Button>
            </div>

            {/* Search & View Mode Switcher Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-4 rounded-2xl shadow-md">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search Section Code or Name..."
                        className="pl-10 h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium"
                    />
                </div>

                {/* View Mode Toggle */}
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
    );
}
