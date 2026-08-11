"use client";

import React from "react";
import { useRegistry } from "./RegistryProvider";
import { Users, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function RegistryHeader() {
    const {
        personnel,
        themeColor,
        search,
        setSearch,
        selectedRoleFilter,
        setSelectedRoleFilter,
        setIsAddOpen,
    } = useRegistry();

    const totalCount = personnel.length;
    const vendorCount = personnel.filter((p) => p.role === "VENDOR").length;
    const collectorCount = personnel.filter((p) => p.role === "COLLECTOR").length;

    return (
        <div className="space-y-6">
            {/* Header Title Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-6 lg:p-8 rounded-[2.5rem] shadow-xl">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Users className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-2">
                            Vendor & Collector <span className="text-xs px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold not-italic">Registry</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-0.5">
                            {totalCount} total registered personnel · {vendorCount} vendors · {collectorCount} collectors
                        </p>
                    </div>
                </div>

                <Button
                    onClick={() => setIsAddOpen(true)}
                    className="h-12 px-6 rounded-2xl text-xs font-black uppercase italic tracking-wider shadow-lg flex items-center gap-2 text-white transition-all active:scale-95 cursor-pointer shrink-0"
                    style={{ backgroundColor: themeColor }}
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Personnel</span>
                </Button>
            </div>

            {/* Quick Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-4 rounded-2xl shadow-md">
                {/* Search Input */}
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-xs font-medium focus-visible:ring-1 focus-visible:ring-purple-500"
                    />
                </div>

                {/* Filter & View Mode Controls */}
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <Select
                        value={selectedRoleFilter}
                        onValueChange={(val) => setSelectedRoleFilter(val as any)}
                    >
                        <SelectTrigger className="w-48 h-10 rounded-xl bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-xs font-bold uppercase tracking-wider">
                            <SelectValue placeholder="All Personnel Roles" />
                        </SelectTrigger>
                        <SelectContent side="bottom" className="rounded-xl bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] z-[99999]">
                            <SelectItem value="ALL" className="text-xs font-bold uppercase tracking-wider">
                                All Roles ({totalCount})
                            </SelectItem>
                            <SelectItem value="VENDOR" className="text-xs font-bold uppercase tracking-wider">
                                Market Vendors ({vendorCount})
                            </SelectItem>
                            <SelectItem value="COLLECTOR" className="text-xs font-bold uppercase tracking-wider">
                                Ticket Collectors ({collectorCount})
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
