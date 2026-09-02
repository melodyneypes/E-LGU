"use client";

import React from "react";
import { useStallTypes, StallTypeItem } from "./StallTypesProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tag, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StallTypesTable() {
    const {
        stallTypes,
        debouncedSearch,
        isSearching,
        isRefreshing,
        currentPage,
        setCurrentPage,
        pageSize,
        setPageSize,
        setSelectedStallType,
        setIsEditOpen,
        setEditingStallType,
        setIsDeleteOpen,
        setDeletingStallType,
    } = useStallTypes();

    const filtered = stallTypes.filter(
        (item) =>
            item.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            item.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(debouncedSearch.toLowerCase()))
    );

    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl flex flex-col">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="w-[60px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                #
                            </TableHead>
                            <TableHead className="w-[140px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Code
                            </TableHead>
                            <TableHead className="w-[240px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Section Name
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Description
                            </TableHead>
                            <TableHead className="w-[100px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-right pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isSearching || isRefreshing ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={idx} className="border-b border-slate-100 dark:border-[#2a3040]">
                                    <TableCell className="pl-8 py-4"><Skeleton className="h-4 w-4 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-16 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48 rounded-md" /></TableCell>
                                    <TableCell className="pr-8 text-right"><Skeleton className="h-8 w-16 rounded-xl ml-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : paginatedItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-16">
                                    <Tag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase italic">No Sections Found</h3>
                                    <p className="text-xs text-slate-400 font-medium italic mt-1">Try searching with a different section code or name.</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((item: StallTypeItem, index: number) => (
                                <TableRow
                                    key={item.id}
                                    onClick={() => setSelectedStallType(item)}
                                    className="group hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-[#2a3040] cursor-pointer"
                                >
                                    {/* Line Number */}
                                    <TableCell className="pl-8 py-4 text-xs font-bold text-slate-400">
                                        {startIndex + index + 1}
                                    </TableCell>
                                    {/* Code - Clickable */}
                                    <TableCell>
                                        <span className="font-black text-purple-600 dark:text-purple-400 text-xs uppercase tracking-wider hover:underline">
                                            {item.code}
                                        </span>
                                    </TableCell>
                                    {/* Section Name - Clickable */}
                                    <TableCell>
                                        <span className="font-black text-slate-900 dark:text-white text-xs uppercase italic hover:underline">
                                            {item.name}
                                        </span>
                                    </TableCell>
                                    {/* Description */}
                                    <TableCell>
                                        <span className="text-xs text-slate-500 font-medium italic line-clamp-1">
                                            {item.description || "N/A"}
                                        </span>
                                    </TableCell>
                                    {/* Actions */}
                                    <TableCell className="pr-8 text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingStallType(item);
                                                    setIsEditOpen(true);
                                                }}
                                                className="h-8 w-8 rounded-xl text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer"
                                                title="Edit Section"
                                            >
                                                <Edit className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingStallType(item);
                                                    setIsDeleteOpen(true);
                                                }}
                                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                title="Delete Section"
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

            {/* Pagination Controls Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a1f2e]">
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white">{filtered.length > 0 ? startIndex + 1 : 0}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white">{Math.min(startIndex + pageSize, filtered.length)}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white">{filtered.length}</strong> sections
                    </span>

                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-[10px] font-black uppercase tracking-wider">Per Page:</span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(val) => {
                                setPageSize(Number(val));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-16 text-xs bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="25">25</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Next / Previous Buttons */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage(currentPage - 1)}
                        className="h-8 px-3 rounded-xl text-xs font-bold gap-1 border-slate-200 dark:border-[#2a3040] disabled:opacity-40"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                    </Button>

                    <span className="text-xs font-bold px-3 text-slate-600 dark:text-slate-300">
                        Page {currentPage} of {totalPages}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage(currentPage + 1)}
                        className="h-8 px-3 rounded-xl text-xs font-bold gap-1 border-slate-200 dark:border-[#2a3040] disabled:opacity-40"
                    >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
