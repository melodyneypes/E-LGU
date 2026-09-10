"use client";

import React from "react";
import { useStalls } from "./StallsProvider";
import { Store, User, Edit, Trash2, Eye, Tag, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function StallsCardsGrid() {
    const {
        stalls,
        debouncedSearch,
        selectedStatus,
        selectedStallType,
        isSearching,
        isRefreshing,
        setSelectedStall,
        setIsEditOpen,
        setEditingStall,
        setIsDeleteOpen,
        setDeletingStall,
    } = useStalls();

    // Filter stalls logic
    const filteredStalls = stalls.filter((stall) => {
        const matchesSearch =
            stall.stallNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (stall.vendor?.name && stall.vendor.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            stall.stallType.name.toLowerCase().includes(debouncedSearch.toLowerCase());

        const matchesStatus =
            selectedStatus === "ALL" || stall.status === selectedStatus;

        const matchesType =
            selectedStallType === "ALL" || stall.stallTypeId === selectedStallType;

        return matchesSearch && matchesStatus && matchesType;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OCCUPIED":
                return <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Occupied</span>;
            case "VACANT":
                return <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">Vacant</span>;
            case "MAINTENANCE":
                return <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">Maintenance</span>;
            case "RESERVED":
                return <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider">Reserved</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] font-black uppercase tracking-wider">{status}</span>;
        }
    };

    if (isSearching || isRefreshing) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-6 w-20 rounded-xl" />
                            <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-28 rounded-md" />
                        <Skeleton className="h-12 w-full rounded-2xl" />
                        <div className="grid grid-cols-2 gap-2">
                            <Skeleton className="h-10 w-full rounded-xl" />
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (filteredStalls.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] text-center">
                <Store className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase italic">No Stalls Found</h3>
                <p className="text-xs text-slate-400 font-medium italic mt-1">Try searching with a different keyword or filter.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredStalls.map((item) => (
                <div
                    key={item.id}
                    className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-lg flex flex-col justify-between hover:border-blue-500/50 transition-all duration-300 group"
                >
                    {/* Header: Stall # & Status */}
                    <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-1.5">
                                <span className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#1a202c] text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider border border-slate-200 dark:border-[#2a3040]">
                                    {item.stallNumber}
                                </span>
                                {item.latitude && item.longitude && (
                                    <span title={`Pinned GPS: ${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}>
                                        <MapPin className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 shrink-0" />
                                    </span>
                                )}
                            </div>
                            {getStatusBadge(item.status)}
                        </div>

                        {/* Section / Stall Type */}
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 italic mb-4">
                            <Tag className="w-3.5 h-3.5 text-purple-500" />
                            <span>{item.stallType.name}</span>
                        </div>

                        {/* Vendor Profile Info */}
                        <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040] space-y-1 mb-4">
                            <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase italic tracking-wider">
                                <User size={12} className="text-blue-500" /> Current Vendor
                            </div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {item.vendor?.name || <span className="text-slate-400 italic font-medium">No assigned vendor</span>}
                            </p>
                        </div>

                        {/* Rates Info Grid */}
                        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                            <div className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-[#2a3040]">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Daily Rate</span>
                                <span className="font-black text-slate-900 dark:text-white">₱{item.dailyRate.toLocaleString()}</span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-100 dark:border-[#2a3040]">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Monthly</span>
                                <span className="font-black text-slate-900 dark:text-white">₱{item.monthlyRate.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-[#2a3040] pt-4 mt-5">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedStall(item)}
                            className="h-8 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                        </Button>

                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setEditingStall(item);
                                    setIsEditOpen(true);
                                }}
                                className="h-8 w-8 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                title="Edit Stall"
                            >
                                <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    setDeletingStall(item);
                                    setIsDeleteOpen(true);
                                }}
                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                title="Delete Stall"
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
