"use client";

import React, { useState } from "react";
import { useStallTypes, StallTypeItem } from "./StallTypesProvider";
import { Tag, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toggleStallTypeStatus } from "../actions/stall-types.actions";
import { toast } from "sonner";

export function StallTypesCardsGrid() {
    const {
        stallTypes,
        setStallTypes,
        debouncedSearch,
        currentPage,
        pageSize,
        setSelectedStallType,
        setIsEditOpen,
        setEditingStallType,
    } = useStallTypes();

    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleToggle = async (item: StallTypeItem) => {
        const currentActive = item.isActive !== false;
        const newActive = !currentActive;

        // Instant Optimistic Update
        setTogglingId(item.id);
        setStallTypes((prev) =>
            prev.map((t) => (t.id === item.id ? { ...t, isActive: newActive } : t))
        );

        try {
            const res = await toggleStallTypeStatus(item.id, currentActive);
            if (res.success) {
                toast.success(`Market section is now ${newActive ? "Active" : "Inactive"}`);
            } else {
                setStallTypes((prev) =>
                    prev.map((t) => (t.id === item.id ? { ...t, isActive: currentActive } : t))
                );
                toast.error(res.error || "Failed to update status");
            }
        } catch (err: any) {
            setStallTypes((prev) =>
                prev.map((t) => (t.id === item.id ? { ...t, isActive: currentActive } : t))
            );
            toast.error(err.message || "Failed to update status");
        } finally {
            setTogglingId(null);
        }
    };

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
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={item.isActive !== false}
                                    disabled={togglingId === item.id}
                                    onCheckedChange={() => handleToggle(item)}
                                    size="sm"
                                    className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500 cursor-pointer"
                                />
                                <span
                                    className={`inline-flex items-center gap-1 text-[10px] font-black tracking-wider uppercase ${
                                        item.isActive !== false
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-slate-400 dark:text-slate-500"
                                    }`}
                                >
                                    {togglingId === item.id ? (
                                        <Loader2 className="w-2.5 h-2.5 animate-spin text-purple-500" />
                                    ) : (
                                        <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                                item.isActive !== false ? "bg-emerald-500" : "bg-slate-400"
                                            }`}
                                        />
                                    )}
                                    {item.isActive !== false ? "Active" : "Inactive"}
                                </span>
                            </div>
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
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
