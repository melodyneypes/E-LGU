"use client";

import { useOfficials } from "../providers/OfficialsProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import type { CSSProperties } from "react";
import { useSession } from "next-auth/react";

export function OfficialsFilters() {
    const { data: session } = useSession();
    const { 
        searchTerm, setSearchTerm, setIsAddModalOpen, 
        selectedPosition, setSelectedPosition, 
        selectedCategory, setSelectedCategory,
        selectedStatus, setSelectedStatus,
        selectedBarangay, setSelectedBarangay,
        barangays, officialsData, themeColor 
    } = useOfficials();

    const isBarangayAdmin = (session?.user as any)?.role === "BARANGAY_ADMIN";

    // Get unique positions from current officials to populate the dropdown filter dynamically
    const positions = Array.from(new Set(officialsData.map(o => o.position))).filter(Boolean);

    return (
        <div className="p-4 border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap flex-1 items-center gap-3">
                    <div className="relative flex-1 min-w-[260px] max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search names..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl focus-visible:ring-2"
                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                        />
                    </div>

                    <Select disabled={isBarangayAdmin} value={selectedBarangay} onValueChange={setSelectedBarangay}>
                        <SelectTrigger className="w-full sm:w-[170px] h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic">
                            <SelectValue placeholder="Select Area" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectItem value="LGU" className="font-bold italic" style={{ color: themeColor }}>Municipal (LGU)</SelectItem>
                            {barangays.map(b => (
                                <SelectItem key={b} value={b} className="font-bold italic">Bgy. {b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                        <SelectTrigger className="w-full sm:w-[170px] h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl">
                            <SelectValue placeholder="Position" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectItem value="All">All Positions</SelectItem>
                            {positions.map(pos => (
                                <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-[170px] h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectItem value="All">All Categories</SelectItem>
                            <SelectItem value="LGU">Municipal (LGU)</SelectItem>
                            <SelectItem value="Barangay Council">Brgy Council</SelectItem>
                            <SelectItem value="SK Council">SK Members</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="w-full sm:w-[150px] h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full lg:w-auto h-11 text-white shadow-lg px-6 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}40` }}
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Official
                </Button>
            </div>
        </div>
    );
}