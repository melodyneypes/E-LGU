"use client";

import React from "react";
import { useCollectors, CollectorItem } from "./CollectorProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CreditCard, ChevronLeft, ChevronRight, UserCheck, Ticket } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export function CollectorTable() {
    const {
        collectors,
        debouncedSearch,
        rfidFilter,
        isSearching,
        isRefreshing,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        setIsEditOpen,
        setEditingCollector,
        setIsDeleteOpen,
        setDeletingCollector,
        setIsRfidOpen,
        setRfidCollector,
    } = useCollectors();

    const filtered = collectors.filter((item) => {
        const query = debouncedSearch.toLowerCase().trim();
        const matchesSearch =
            !query ||
            (item.name && item.name.toLowerCase().includes(query)) ||
            (item.email && item.email.toLowerCase().includes(query)) ||
            (item.rfid && item.rfid.toLowerCase().includes(query));

        const hasRfid = Boolean(item.rfid);
        const matchesFilter =
            rfidFilter === "ALL" ||
            (rfidFilter === "WITH_RFID" && hasRfid) ||
            (rfidFilter === "WITHOUT_RFID" && !hasRfid);

        return matchesSearch && matchesFilter;
    });

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl flex flex-col">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/80 dark:bg-[#1a202c]/80 border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="w-12 text-center text-[10px] font-black uppercase tracking-wider text-slate-400 pl-6 py-4">#</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">Collector Name</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">Email Address</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">RFID Badge</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">Tickets Issued</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">Date Registered</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 pr-6 text-right py-4">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isSearching || isRefreshing ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={idx} className="border-b border-slate-100 dark:border-[#2a3040]">
                                    <TableCell className="pl-6 py-4"><Skeleton className="h-4 w-4 rounded-md mx-auto" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                                    <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-16 rounded-xl ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Ticket className="w-10 h-10 mb-2 stroke-1 opacity-50" />
                                        <p className="text-sm font-bold uppercase tracking-wider">No Collectors Found</p>
                                        <p className="text-xs text-slate-500 italic mt-0.5">Try adjusting your search criteria or register a new collector.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((item: CollectorItem, index: number) => {
                                const rowNumber = startIndex + index + 1;
                                return (
                                    <TableRow
                                        key={item.id}
                                        className="hover:bg-slate-50/50 dark:hover:bg-[#1a202c]/50 transition-colors border-b border-slate-100 dark:border-[#2a3040]"
                                    >
                                        <TableCell className="text-center font-bold text-xs text-slate-400 pl-6 py-4">
                                            {rowNumber}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tight">
                                                {item.name || "N/A"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                {item.email || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {item.rfid ? (
                                                <button
                                                    onClick={() => {
                                                        setRfidCollector(item);
                                                        setIsRfidOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-colors cursor-pointer"
                                                    title="Click to view or edit RFID card"
                                                >
                                                    <CreditCard size={10} /> {item.rfid}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setRfidCollector(item);
                                                        setIsRfidOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-colors cursor-pointer"
                                                >
                                                    + Bind RFID
                                                </button>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                                                {item._count?.collectorCollections || 0} tickets
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {format(new Date(item.createdAt), "MMM d, yyyy")}
                                            </span>
                                        </TableCell>
                                        <TableCell className="pr-6 text-right py-4">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setRfidCollector(item);
                                                        setIsRfidOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer"
                                                    title="Configure RFID Badge"
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingCollector(item);
                                                        setIsEditOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                                    title="Edit Collector"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setDeletingCollector(item);
                                                        setIsDeleteOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                    title="Delete Collector"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {!isSearching && !isRefreshing && filtered.length > 0 && (
                <div className="p-4 border-t border-slate-100 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#1a202c]/50">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Show</span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(val) => {
                                setPageSize(Number(val));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-16 text-xs bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b]">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                        <span>entries (Total {filtered.length})</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                            className="h-8 px-3 text-xs rounded-xl border-slate-200 dark:border-[#2a3040]"
                        >
                            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                        </Button>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                            className="h-8 px-3 text-xs rounded-xl border-slate-200 dark:border-[#2a3040]"
                        >
                            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
