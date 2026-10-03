"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, Compass, MapPin, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { MayorTourismDetailModal, TourismDetailItem } from "./MayorTourismDetailModal";

interface MayorTourismTableProps {
    tourismData: TourismDetailItem[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    searchQuery: string;
    selectedBarangay: string;
    activeStatus: string;
    themeColor: string;
}

export function MayorTourismTable({
    tourismData,
    totalCount,
    currentPage,
    pageSize,
    searchQuery,
    selectedBarangay,
    activeStatus,
    themeColor,
}: MayorTourismTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState(searchQuery);
    const [selectedItem, setSelectedItem] = useState<TourismDetailItem | null>(null);

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
                        placeholder="Search tourism spot, category, address..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                    {isPending && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </form>

                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={activeStatus}
                        onChange={(e) => updateParams({ status: e.target.value, page: 1 })}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="Published">Active / Published</option>
                        <option value="Draft">Draft / Inactive</option>
                    </select>

                    <div className="text-xs font-black uppercase tracking-wider text-slate-400 italic px-3">
                        Total: <span style={{ color: themeColor }}>{totalCount}</span> Spots
                    </div>
                </div>
            </div>

            {/* Tourism Data Table */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl overflow-hidden shadow-sm transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#121622]/70 text-[11px] font-black uppercase italic tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="py-4 px-6 w-12">#</th>
                                <th className="py-4 px-6">Tourism Spot</th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Location / Barangay</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6">Date Registered</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 dark:divide-[#2a3040] text-sm font-medium">
                            {tourismData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                        No tourism spots found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                tourismData.map((item, idx) => (
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
                                        {/* Tourism Spot Photo + Name */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1e2330] overflow-hidden shrink-0 relative border border-slate-200/60 dark:border-[#2a3040]">
                                                    {item.imageUrl ? (
                                                        <Image
                                                            src={item.imageUrl}
                                                            alt={item.name}
                                                            fill
                                                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                            <Compass size={20} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight group-hover:text-emerald-500 transition-colors">
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 truncate max-w-xs">
                                                        {item.address || "Municipality of E-LGU"}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Category */}
                                        <td className="py-4 px-6">
                                            <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase italic tracking-wider">
                                                {item.category || "General"}
                                            </span>
                                        </td>

                                        {/* Barangay Location */}
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-xs">
                                                <MapPin size={14} className="text-emerald-500 shrink-0" />
                                                <span>{item.barangay || selectedBarangay || "E-LGU"}</span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-6">
                                            {item.isPublished ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase italic tracking-wider">
                                                    <CheckCircle2 size={13} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-black uppercase italic tracking-wider">
                                                    <XCircle size={13} /> Draft
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
                                <option value={100}>100 per page</option>
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
            <MayorTourismDetailModal
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
            />
        </div>
    );
}
