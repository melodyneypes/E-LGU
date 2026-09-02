"use client";

import React from "react";
import { useRegistry } from "./RegistryProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Store, Ticket, ChevronLeft, ChevronRight, UserCheck, CreditCard } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export function RegistryTable() {
    const {
        personnel,
        debouncedSearch,
        selectedRoleFilter,
        isSearching,
        isRefreshing,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        setIsEditOpen,
        setEditingPersonnel,
        setIsDeleteOpen,
        setDeletingPersonnel,
        setIsRFIDOpen,
        setRfidPersonnel,
    } = useRegistry();

    const filtered = personnel.filter((item) => {
        const matchesSearch =
            (item.name && item.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
            (item.email && item.email.toLowerCase().includes(debouncedSearch.toLowerCase()));

        const matchesRole =
            selectedRoleFilter === "ALL" || item.role === selectedRoleFilter;

        return matchesSearch && matchesRole;
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
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">Personnel Name</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">Email Address</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-400 py-4">Role</TableHead>
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
                                    <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                                    <TableCell className="pr-6 text-right"><Skeleton className="h-8 w-16 rounded-xl ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <UserCheck className="w-10 h-10 mb-2 stroke-1 opacity-50" />
                                        <p className="text-sm font-bold uppercase tracking-wider">No Personnel Found</p>
                                        <p className="text-xs text-slate-500 italic mt-0.5">Try searching with a different keyword or role filter.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((item, index) => {
                                const lineNumber = startIndex + index + 1;
                                return (
                                    <TableRow
                                        key={item.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-[#1a202c]/50 transition-colors border-b border-slate-100 dark:border-[#2a3040]"
                                    >
                                        {/* Line Number */}
                                        <TableCell className="pl-6 py-4 text-center font-bold text-xs text-slate-400">
                                            {lineNumber}
                                        </TableCell>

                                        {/* Personnel Name */}
                                        <TableCell className="font-bold text-xs text-slate-900 dark:text-white uppercase italic">
                                            {item.name || "N/A"}
                                        </TableCell>

                                        {/* Email */}
                                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                                            {item.email || "N/A"}
                                        </TableCell>

                                        {/* Role Badge */}
                                        <TableCell>
                                            {item.role === "VENDOR" ? (
                                                <span className="px-3 py-1 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-black text-[10px] uppercase tracking-wider border border-purple-500/20 inline-flex items-center gap-1">
                                                    <Store size={12} /> Vendor
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider border border-emerald-500/20 inline-flex items-center gap-1">
                                                    <Ticket size={12} /> Collector
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Date Registered */}
                                        <TableCell className="text-xs text-slate-500 font-medium">
                                            {format(new Date(item.createdAt), "MMM d, yyyy")}
                                        </TableCell>

                                        {/* Actions */}
                                        <TableCell className="pr-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setRfidPersonnel(item);
                                                        setIsRFIDOpen(true);
                                                    }}
                                                    className={`h-8 w-8 rounded-xl cursor-pointer ${
                                                        item.rfid
                                                            ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100"
                                                            : "text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                    }`}
                                                    title={item.rfid ? `Assigned RFID: ${item.rfid}` : "Assign RFID Tag"}
                                                >
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setEditingPersonnel(item);
                                                        setIsEditOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
                                                    title="Edit Personnel"
                                                >
                                                    <Edit className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setDeletingPersonnel(item);
                                                        setIsDeleteOpen(true);
                                                    }}
                                                    className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                    title="Delete Personnel"
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

            {/* Pagination Toolbar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a202c]/30">
                <div className="text-xs font-medium text-slate-500">
                    Showing <span className="font-bold text-slate-900 dark:text-white">{filtered.length === 0 ? 0 : startIndex + 1}</span> to{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{Math.min(startIndex + pageSize, filtered.length)}</span> of{" "}
                    <span className="font-bold text-slate-900 dark:text-white">{filtered.length}</span> personnel
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
