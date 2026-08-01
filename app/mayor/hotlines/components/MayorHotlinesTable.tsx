"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, PhoneCall, Phone, Smartphone, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { MayorHotlinesDetailModal, HotlineDetailItem } from "./MayorHotlinesDetailModal";

interface MayorHotlinesTableProps {
    hotlineData: HotlineDetailItem[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    searchQuery: string;
    selectedCategory: string;
    activeStatus: string;
    themeColor: string;
}

export function MayorHotlinesTable({
    hotlineData,
    totalCount,
    currentPage,
    pageSize,
    searchQuery,
    activeStatus,
    themeColor,
}: MayorHotlinesTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState(searchQuery);
    const [selectedItem, setSelectedItem] = useState<HotlineDetailItem | null>(null);

    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    const updateParams = (newParams: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.keys(newParams).forEach((key) => {
            const val = newParams[key];
            if (val === null || val === "" || val === "All") {
                params.delete(key);
            } else {
                params.set(key, String(val));
            }
        });
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    // 400ms Debounce effect for real-time search input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== searchQuery) {
                updateParams({ search, page: 1 });
            }
        }, 400);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateParams({ search, page: 1 });
    };

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search agency name, hotline number..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    />
                    {isPending && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </form>

                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={activeStatus}
                        onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Active">Active / Published</option>
                        <option value="Inactive">Inactive / Draft</option>
                    </select>

                    <div className="text-xs font-black uppercase tracking-wider text-slate-400 italic px-3">
                        Total: <span style={{ color: themeColor }}>{totalCount}</span> Hotlines
                    </div>
                </div>
            </div>

            {/* Hotlines Data Table */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl overflow-hidden shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#121622]/70 text-[11px] font-black uppercase italic tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="py-4 px-6 w-12">#</th>
                                <th className="py-4 px-6">Agency / Department</th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Contact Number</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6">Date Registered</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 dark:divide-[#2a3040] text-sm font-medium">
                            {hotlineData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                        No emergency hotlines found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                hotlineData.map((item, idx) => (
                                    <tr
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                        title="Click to view details (Read-Only)"
                                    >
                                        {/* Row Number */}
                                        <td className="py-4 px-6 text-xs font-bold text-slate-400 tabular-nums">
                                            {(currentPage - 1) * pageSize + idx + 1}
                                        </td>

                                        {/* Agency Name */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-500/20 group-hover:scale-105 transition-transform">
                                                    <PhoneCall size={18} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight group-hover:text-purple-500 transition-colors">
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 truncate max-w-xs">
                                                        {item.address || "Mapandan, Pangasinan"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="py-4 px-6">
                                            <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-black uppercase italic tracking-wider">
                                                {item.category || "General"}
                                            </span>
                                        </td>

                                        {/* Contact Number */}
                                        <td className="py-4 px-6">
                                            <div className="space-y-0.5">
                                                {item.mobileNumber && (
                                                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-xs">
                                                        <Smartphone size={13} className="text-emerald-500 shrink-0" />
                                                        <span>{item.mobileNumber}</span>
                                                    </div>
                                                )}
                                                {item.telephone && (
                                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                                        <Phone size={12} className="text-purple-500 shrink-0" />
                                                        <span>{item.telephone}</span>
                                                    </div>
                                                )}
                                                {!item.mobileNumber && !item.telephone && (
                                                    <span className="text-slate-400 italic text-xs">N/A</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-6">
                                            {item.isActive ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase italic tracking-wider">
                                                    <CheckCircle2 size={13} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-black uppercase italic tracking-wider">
                                                    <XCircle size={13} /> Inactive
                                                </span>
                                            )}
                                        </td>

                                        {/* Date Registered */}
                                        <td className="py-4 px-6 text-xs text-slate-400 italic">
                                            {new Date(item.createdAt).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Bar */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121622]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-slate-400 font-medium italic">
                            Showing page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of{" "}
                            <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span>
                        </p>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium italic">Show:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => updateParams({ pageSize: Number(e.target.value), page: 1 })}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer shadow-sm"
                            >
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={currentPage <= 1 || isPending}
                            onClick={() => updateParams({ page: currentPage - 1 })}
                            className="p-2 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title="Previous Page"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <span className="px-3 text-xs font-black text-slate-700 dark:text-slate-200">
                            {currentPage} / {totalPages}
                        </span>

                        <button
                            type="button"
                            disabled={currentPage >= totalPages || isPending}
                            onClick={() => updateParams({ page: currentPage + 1 })}
                            className="p-2 rounded-xl border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            title="Next Page"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Read-Only Modal View */}
            <MayorHotlinesDetailModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                themeColor={themeColor}
            />
        </div>
    );
}
