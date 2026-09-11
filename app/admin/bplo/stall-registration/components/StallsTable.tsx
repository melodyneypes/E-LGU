"use client";

import React from "react";
import { useStalls, StallItem } from "./StallsProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Store, User, Edit, Trash2, Tag, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StallsTable() {
    const {
        stalls,
        debouncedSearch,
        selectedStatus,
        selectedStallType,
        isSearching,
        isRefreshing,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
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
            stall.stallType.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (stall.address && stall.address.toLowerCase().includes(debouncedSearch.toLowerCase()));

        const matchesStatus =
            selectedStatus === "ALL" || stall.status === selectedStatus;

        const matchesType =
            selectedStallType === "ALL" || stall.stallTypeId === selectedStallType;

        return matchesSearch && matchesStatus && matchesType;
    });

    const totalPages = Math.ceil(filteredStalls.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedStalls = filteredStalls.slice(startIndex, startIndex + pageSize);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "OCCUPIED":
                return <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">Occupied</span>;
            case "VACANT":
                return <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">Vacant</span>;
            case "MAINTENANCE":
                return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">Maintenance</span>;
            case "RESERVED":
                return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider">Reserved</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 text-[10px] font-black uppercase tracking-wider">{status}</span>;
        }
    };

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl flex flex-col">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="w-[110px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                Stall #
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Section / Category
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Location / Address
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Vendor Occupant
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Status
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Rates (Daily / Monthly)
                            </TableHead>
                            <TableHead className="w-[120px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-right pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isSearching || isRefreshing ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={idx} className="border-b border-slate-100 dark:border-[#2a3040]">
                                    <TableCell className="pl-8 py-4"><Skeleton className="h-4 w-16 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
                                    <TableCell className="pr-8 text-right"><Skeleton className="h-8 w-20 rounded-xl ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : paginatedStalls.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Store className="w-10 h-10 mb-2 stroke-1 opacity-50" />
                                        <p className="text-sm font-bold uppercase tracking-wider">No Stalls Found</p>
                                        <p className="text-xs text-slate-500 italic mt-0.5">Try searching with a different keyword or filter.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedStalls.map((item: StallItem) => (
                                <TableRow
                                    key={item.id}
                                    onClick={() => setSelectedStall(item)}
                                    className="group hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-[#2a3040] cursor-pointer"
                                >
                                    {/* Stall # */}
                                    <TableCell className="pl-8 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-black text-slate-900 dark:text-white text-xs uppercase italic tracking-wider">
                                                {item.stallNumber}
                                            </span>
                                            {item.latitude && item.longitude && (
                                                <span title={`Pinned GPS: ${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}>
                                                    <MapPin className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 shrink-0" />
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Section */}
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <Tag className="w-3.5 h-3.5 text-purple-500" />
                                            <span>{item.stallType.name}</span>
                                        </div>
                                    </TableCell>

                                    {/* Location / Address */}
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[220px] truncate" title={item.address || "No address"}>
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span className="truncate">
                                                {item.address || <em className="text-slate-400 font-normal italic">No address</em>}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Vendor */}
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200">
                                            <User className="w-3.5 h-3.5 text-blue-500" />
                                            <span>{item.vendor?.name || <em className="text-slate-400">Unassigned</em>}</span>
                                        </div>
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell>{getStatusBadge(item.status)}</TableCell>

                                    {/* Rates */}
                                    <TableCell>
                                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            <span>₱{item.dailyRate.toLocaleString()}</span>
                                            <span className="text-slate-400 font-normal italic text-[11px]"> / ₱{item.monthlyRate.toLocaleString()}</span>
                                        </div>
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="pr-8 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingStall(item);
                                                    setIsDeleteOpen(true);
                                                }}
                                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                title="Delete Stall"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a202c]/30">
                <div className="text-xs font-medium text-slate-500">
                    Showing <span className="font-bold text-slate-900 dark:text-white">{filteredStalls.length === 0 ? 0 : startIndex + 1}</span> to{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{Math.min(startIndex + pageSize, filteredStalls.length)}</span> of{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{filteredStalls.length}</span> stalls
                </div>

                <div className="flex items-center gap-4">
                    {/* Items Per Page Selector */}
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <span>Per Page:</span>
                        <Select
                            value={String(pageSize)}
                            onValueChange={(val) => {
                                setPageSize(Number(val));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-16 text-xs font-bold rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#151b2b]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent side="top" className="min-w-[4rem] rounded-xl bg-white dark:bg-[#151b2b]">
                                <SelectItem value="5" className="text-xs font-bold">5</SelectItem>
                                <SelectItem value="10" className="text-xs font-bold">10</SelectItem>
                                <SelectItem value="25" className="text-xs font-bold">25</SelectItem>
                                <SelectItem value="50" className="text-xs font-bold">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Prev / Next Controls */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1 || isSearching || isRefreshing}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="h-8 px-2.5 rounded-xl text-xs font-bold border-slate-200 dark:border-[#2a3040] cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" />
                            <span>Previous</span>
                        </Button>

                        <div className="px-3 text-xs font-black text-slate-600 dark:text-slate-300">
                            Page {currentPage} of {totalPages}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages || isSearching || isRefreshing}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="h-8 px-2.5 rounded-xl text-xs font-bold border-slate-200 dark:border-[#2a3040] cursor-pointer"
                        >
                            <span>Next</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
