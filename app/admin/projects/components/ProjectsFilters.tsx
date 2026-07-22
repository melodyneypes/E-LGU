"use client";

import { useProjects } from "../providers/ProjectsProvider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

export function ProjectsFilters() {
    const {
        searchTerm,
        setIsAddModalOpen,
        selectedCategory,
        selectedStatus,
        currentBarangay,
        activeBarangays = [],
        themeColor,
        setIsPending,
    } = useProjects();

    const [locationSearch, setLocationSearch] = useState("");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchInput, setSearchInput] = useState(searchTerm || "");

    const filteredBarangays = activeBarangays.filter((barangay) =>
        barangay.toLowerCase().includes(locationSearch.toLowerCase())
    );

    const updateUrlParam = useCallback(
        (paramsToUpdate: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());
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

    useEffect(() => {
        setSearchInput(searchTerm || "");
    }, [searchTerm]);

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

    const handleStatusChange = (value: string) => {
        updateUrlParam({ status: value });
    };

    const handleBarangayChange = (value: string) => {
        updateUrlParam({ barangay: value });
    };

    const categories = ["All", "Infrastructure", "Health", "Education", "Social Services", "Agriculture", "Other"];
    const statuses = ["All", "Planned", "Ongoing", "Completed", "Suspended"];

    return (
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border-b border-slate-200 dark:border-[#2a3040]">
            <div className="flex flex-wrap flex-1 items-center gap-3">
                <div className="relative flex-1 min-w-[260px] max-w-sm group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-4 h-4" />
                    <Input
                        placeholder="Search projects, location..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 focus:ring-primary/20 font-medium italic"
                    />
                </div>

                <Select value={selectedCategory || "All"} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="w-full sm:w-[170px] h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] text-xs font-bold uppercase tracking-wider">
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                        {categories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs font-bold uppercase tracking-wider">
                                {cat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedStatus || "All"} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-[150px] h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] text-xs font-bold uppercase tracking-wider">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                        {statuses.map((stat) => (
                            <SelectItem key={stat} value={stat} className="text-xs font-bold uppercase tracking-wider">
                                {stat}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Barangay Filter */}
                {activeBarangays.length > 0 && (
                    <Select value={currentBarangay || "All"} onValueChange={handleBarangayChange}>
                        <SelectTrigger className="w-full sm:w-[170px] h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold italic text-xs">
                            <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                            <SelectValue placeholder="Location" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <div className="p-2 border-b border-slate-100 dark:border-white/10">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                    <Input
                                        value={locationSearch}
                                        onChange={(e) => setLocationSearch(e.target.value)}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => e.stopPropagation()}
                                        placeholder="Search locations..."
                                        className="h-9 pl-9 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-lg text-[11px] font-bold italic"
                                    />
                                </div>
                            </div>
                            <SelectItem value="All" className="font-bold italic text-blue-600">
                                All Locations
                            </SelectItem>
                            {filteredBarangays.map((b) => (
                                <SelectItem key={b} value={b} className="font-bold italic">
                                    {b}
                                </SelectItem>
                            ))}
                            {filteredBarangays.length === 0 && (
                                <div className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 italic text-center">
                                    No locations found
                                </div>
                            )}
                        </SelectContent>
                    </Select>
                )}
            </div>

            <Button
                onClick={() => setIsAddModalOpen(true)}
                className="h-11 px-6 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: themeColor }}
            >
                <Plus className="w-5 h-5 mr-2" />
                New Project
            </Button>
        </div>
    );
}
