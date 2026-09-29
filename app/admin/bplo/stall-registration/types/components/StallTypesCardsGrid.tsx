"use client";

import React from "react";
import { useStallTypes } from "./StallTypesProvider";
import { Tag, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StallTypesCardsGrid() {
    const {
        stallTypes,
        debouncedSearch,
        currentPage,
        pageSize,
        setSelectedStallType,
        setIsEditOpen,
        setEditingStallType,
        setIsDeleteOpen,
        setDeletingStallType,
    } = useStallTypes();

    const filtered = stallTypes.filter(
        (item) =>
            item.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    if (paginatedItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] text-center">
                <Tag className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase italic">No Sections Found</h3>
                <p className="text-xs text-slate-400 font-medium italic mt-1">Try searching with a different section code or name.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {paginatedItems.map((item) => (
                <div
                    key={item.id}
                    onClick={() => setSelectedStallType(item)}
                    className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-lg flex flex-col justify-between hover:border-purple-500/50 transition-all duration-300 group cursor-pointer"
                >
                    <div>
                        {/* Section Code Badge & Status */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-xs uppercase tracking-wider border border-purple-500/20">
                                {item.code}
                            </span>
                            <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                                    item.isActive !== false
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40"
                                        : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                                }`}
                            >
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                        item.isActive !== false ? "bg-emerald-500" : "bg-slate-400"
                                    }`}
                                />
                                {item.isActive !== false ? "Active" : "Inactive"}
                            </span>
                        </div>

                        {/* Title Name */}
                        <h3 className="text-base font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-2 group-hover:text-purple-600 transition-colors">
                            {item.name}
                        </h3>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 italic mb-4">
                            {item.description || "No description provided."}
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-end border-t border-slate-100 dark:border-[#2a3040] pt-3 mt-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingStallType(item);
                                    setIsEditOpen(true);
                                }}
                                className="h-8 w-8 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
                                title="Edit Section"
                            >
                                <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingStallType(item);
                                    setIsDeleteOpen(true);
                                }}
                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                title="Delete Section"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
