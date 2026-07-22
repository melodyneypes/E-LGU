"use client";

import { useAnnouncements } from "../providers/AnnouncementProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, MapPin } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

export function AnnouncementFilters() {
    const {
        searchTerm,
        setIsAddModalOpen,
        selectedCategory,
        selectedPriority,
        currentBarangay,
        activeBarangays = [],
        themeColor,
        setIsPending,
    } = useAnnouncements();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchInput, setSearchInput] = useState(searchTerm || "");

    const updateUrlParam = useCallback(
        (paramsToUpdate: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
            // Reset to page 1 whenever search/filter values change
            params.set("page", "1");

            Object.entries(paramsToUpdate).forEach(([key, value]) => {
                if (!value || value === "All" || value.trim() === "") {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            });

            setIsPending(true);
            router.push(`${pathname}?${params.toString()}`);
        },
        [searchParams, pathname, router, setIsPending]
    );

    // Keep input field synced with URL search parameter
    useEffect(() => {
        setSearchInput(searchTerm || "");
    }, [searchTerm]);

    // Perform 400ms debounced search navigation
    useEffect(() => {
        const handler = setTimeout(() => {
            const currentSearchInUrl = searchParams.get("search") || "";
            if (searchInput !== currentSearchInUrl) {
                updateUrlParam({ search: searchInput });
            }
        }, 400);

        return () => clearTimeout(handler);
    }, [searchInput, searchParams, updateUrlParam]);

    const handleCategoryChange = (value: string) => {
        updateUrlParam({ category: value });
    };

    const handlePriorityChange = (value: string) => {
        updateUrlParam({ priority: value });
    };

    const handleBarangayChange = (value: string) => {
        updateUrlParam({ barangay: value });
    };

    return (
        <div className="p-6 border-b border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#151b2b]">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex flex-wrap flex-1 gap-4 w-full sm:w-auto">
                    <div className="relative flex-1 min-w-[280px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search title or details..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="pl-10 h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic transition-all"
                        />
                    </div>

                    <Select value={selectedCategory || "All"} onValueChange={handleCategoryChange}>
                        <SelectTrigger className="w-[150px] h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-black uppercase tracking-widest text-[9px]">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectItem value="All">All Types</SelectItem>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Weather">Weather</SelectItem>
                            <SelectItem value="Public Service">Public Service</SelectItem>
                            <SelectItem value="Emergency">Emergency</SelectItem>
                            <SelectItem value="Health">Health</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedPriority || "All"} onValueChange={handlePriorityChange}>
                        <SelectTrigger className="w-[150px] h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-black uppercase tracking-widest text-[9px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectItem value="All">All Priorities</SelectItem>
                            <SelectItem value="Normal">Normal</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Barangay Filter for Super Admins */}
                    {activeBarangays.length > 0 && (
                        <Select value={currentBarangay || "All"} onValueChange={handleBarangayChange}>
                            <SelectTrigger className="w-[160px] h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic">
                                <MapPin className="w-4 h-4 mr-2" style={{ color: themeColor }} />
                                <SelectValue placeholder="Barangay" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                <SelectItem value="All" className="font-bold italic text-blue-600">
                                    All Locations
                                </SelectItem>
                                {activeBarangays.map((b) => (
                                    <SelectItem key={b} value={b} className="font-bold italic">
                                        {b}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </div>

                <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="w-full sm:w-auto h-12 text-white font-black uppercase tracking-widest text-[10px] px-8 rounded-xl transition-all shadow-xl flex items-center gap-2 hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                >
                    <Plus className="w-4 h-4" />
                    New Notice
                </Button>
            </div>
        </div>
    );
}
