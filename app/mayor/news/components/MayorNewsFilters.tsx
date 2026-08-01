"use client";

import { useMayorNews } from "./MayorNewsProvider";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

export function MayorNewsFilters() {
    const { searchTerm, setIsPending } = useMayorNews();

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

    // Sync local search input with URL param
    useEffect(() => {
        setSearchInput(searchTerm || "");
    }, [searchTerm]);

    // 400ms debounced search
    useEffect(() => {
        const handler = setTimeout(() => {
            const currentSearchInUrl = searchParams.get("search") || "";
            if (searchInput !== currentSearchInUrl) {
                updateUrlParam({ search: searchInput });
            }
        }, 400);
        return () => clearTimeout(handler);
    }, [searchInput, searchParams, updateUrlParam]);

    return (
        <div className="p-6 border-b border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#151b2b]">
            <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Search articles..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-10 h-12 w-full sm:w-80 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium italic focus-visible:ring-1"
                />
            </div>
        </div>
    );
}
