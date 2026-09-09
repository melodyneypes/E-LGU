"use client";

import { useHotlines } from "../providers/HotlinesProvider";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function HotlinesFilters() {
    const {
        searchTerm,
        setIsAddModalOpen,
        setEditingData,
        selectedStatus,
        themeColor,
        setIsPending,
    } = useHotlines();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [searchInput, setSearchInput] = useState(searchTerm || "");

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

    const handleStatusChange = (value: string) => {
        updateUrlParam({ status: value });
    };

    const handleAddNew = () => {
        setEditingData(null);
        setIsAddModalOpen(true);
    };

    return (
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border-b border-slate-200 dark:border-[#2a3040]">
            <div className="flex flex-wrap flex-1 items-center gap-3">
                <div className="relative flex-1 min-w-[260px] max-w-sm group">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-4 h-4" />
                    <Input
                        placeholder="Search agency, category or number..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10 h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 focus:ring-primary/20 font-medium italic"
                    />
                </div>

                <Select value={selectedStatus || "All"} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full sm:w-[150px] h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] text-xs font-bold uppercase tracking-wider">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                        <SelectItem value="All" className="text-xs font-bold uppercase tracking-wider">
                            All Statuses
                        </SelectItem>
                        <SelectItem value="Active" className="text-xs font-bold uppercase tracking-wider">
                            Active
                        </SelectItem>
                        <SelectItem value="Draft" className="text-xs font-bold uppercase tracking-wider">
                            Draft
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button
                onClick={handleAddNew}
                className="h-11 px-6 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ backgroundColor: themeColor }}
            >
                <Plus className="w-5 h-5 mr-2" />
                Add Hotline
            </Button>
        </div>
    );
}
