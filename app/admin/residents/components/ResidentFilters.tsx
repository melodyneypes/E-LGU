"use client";

import { useResident, ResidentCategory } from "../providers/ResidentProvider";
import { Search, Plus, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { getResidentCategories, getBarangayList } from "../../actions";
import { useSession } from "next-auth/react";

export function ResidentFilters() {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const managedBarangay = (session?.user as any)?.managedBarangay;
    const isBarangayAdmin = role === "BARANGAY_ADMIN";

    const {
        searchQuery, setSearchQuery,
        setIsAddModalOpen,
        selectedBarangay, setSelectedBarangay,
        selectedGender, setSelectedGender,
        selectedCategory, setSelectedCategory,
        themeColor
    } = useResident();

    const [mounted, setMounted] = useState(false);
    const [categories, setCategories] = useState<ResidentCategory[]>([]);
    const [barangayList, setBarangayList] = useState<string[]>([]);
    const [localSearch, setLocalSearch] = useState(searchQuery);

    // Keep local search input in sync if URL query changes
    useEffect(() => {
        setLocalSearch(searchQuery);
    }, [searchQuery]);

    // Debounce updates to the URL query parameter
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localSearch !== searchQuery) {
                setSearchQuery(localSearch);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [localSearch, searchQuery, setSearchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setMounted(true);
            getResidentCategories().then(res => {
                if (res.success && res.categories) {
                    setCategories(res.categories);
                }
            });
            getBarangayList().then(res => {
                if (res.success && res.data) {
                    setBarangayList(res.data);
                }
            });
        }, 0);
        return () => clearTimeout(timer);
    }, []);

    // If Barangay Admin, force the selection to their barangay if not already set correctly
    useEffect(() => {
        if (isBarangayAdmin && managedBarangay && selectedBarangay !== managedBarangay) {
            setSelectedBarangay(managedBarangay);
        }
    }, [isBarangayAdmin, managedBarangay, selectedBarangay, setSelectedBarangay]);

    const genders = ["All", "Male", "Female", "Other"];

    if (!mounted) {
        return <div className="p-4 h-[76px] bg-slate-50 dark:bg-[#151b2b] animate-pulse border-b border-slate-200 dark:border-[#2a3040]"></div>;
    }

    return (
        <div className="flex flex-col border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
            {/* Filters Row */}
            <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    <div className="relative w-full sm:w-[350px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search resident name..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-0 rounded-xl transition-all"
                        />
                    </div>

                    <div className="w-full sm:w-auto flex flex-wrap gap-2">
                        {/* Only show/enable Barangay Filter for non-Barangay Admins */}
                        {!isBarangayAdmin ? (
                            <Select value={selectedBarangay} onValueChange={setSelectedBarangay}>
                                <SelectTrigger className="h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center min-w-[130px]">
                                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Barangay" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] max-h-[300px]">
                                    <SelectItem value="All">All Barangays</SelectItem>
                                    {barangayList.map(bg => (
                                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="h-11 px-4 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center gap-2 border border-slate-200 dark:border-slate-700">
                                <Filter className="w-3 h-3" style={{ color: themeColor }} />
                                <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-400">{managedBarangay}</span>
                            </div>
                        )}

                        <Select value={selectedGender} onValueChange={setSelectedGender}>
                            <SelectTrigger className="h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center min-w-[100px]">
                                <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                {genders.map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center min-w-[140px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                <SelectItem value="All">All Categories</SelectItem>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full lg:w-auto">
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}33` }}
                        className="h-11 hover:opacity-90 active:scale-95 text-white px-6 rounded-xl w-full sm:w-auto transition-all duration-200"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Register Resident
                    </Button>
                </div>
            </div>
        </div>
    );
}
