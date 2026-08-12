"use client";

import React, { useState, useEffect } from "react";
import { useCollections, CollectionRecord } from "./CollectionsProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Receipt, User, Ban, CheckCircle2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const ITEMS_PER_PAGE = 10;

export function CollectionsTable() {
    const {
        collections,
        search,
        paymentMethodFilter,
        statusFilter,
        startDate,
        endDate,
        isLoading,
        setSelectedReceipt,
    } = useCollections();

    const [currentPage, setCurrentPage] = useState(1);

    // Reset pagination to page 1 whenever search or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, paymentMethodFilter, statusFilter, startDate, endDate]);

    // Filter collections logic
    const filteredCollections = collections.filter((item) => {
        const matchesSearch =
            item.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
            item.stall.stallNumber.toLowerCase().includes(search.toLowerCase()) ||
            (item.vendor?.name && item.vendor.name.toLowerCase().includes(search.toLowerCase()));

        const matchesMethod =
            paymentMethodFilter === "ALL" || item.paymentMethod === paymentMethodFilter;

        const matchesStatus =
            statusFilter === "ALL" || item.status === statusFilter;

        const matchesDateRange = (() => {
            if (!startDate && !endDate) return true;
            const cDate = new Date(item.collectedDate);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (cDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (cDate > end) return false;
            }
            return true;
        })();

        return matchesSearch && matchesMethod && matchesStatus && matchesDateRange;
    });

    const totalPages = Math.ceil(filteredCollections.length / ITEMS_PER_PAGE) || 1;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedCollections = filteredCollections.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (!isLoading && filteredCollections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] text-center">
                <Receipt className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase italic">No Collections Found</h3>
                <p className="text-xs text-slate-400 font-medium italic mt-1">Try adjusting your search query or filter settings.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl space-y-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="w-[60px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                #
                            </TableHead>
                            <TableHead className="w-[140px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Ticket # / Date
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Stall & Section
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Vendor Occupant
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Amount Breakdown
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Payment Method
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                Status
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                                <TableRow key={`skel-${idx}`} className="border-b border-slate-100 dark:border-[#2a3040]">
                                    <TableCell className="pl-8 py-5"><Skeleton className="h-4 w-4 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-28 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-36 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24 rounded-md" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-20 rounded-full" /></TableCell>
                                    <TableCell className="pr-8"><Skeleton className="h-4 w-16 rounded-full" /></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            paginatedCollections.map((item: CollectionRecord, index: number) => (
                                <TableRow
                                    key={item.id}
                                    onClick={() => setSelectedReceipt(item)}
                                    className="group hover:bg-slate-100/80 dark:hover:bg-white/10 transition-colors border-b border-slate-100 dark:border-[#2a3040] cursor-pointer"
                                >
                                {/* Row Index (#) */}
                                <TableCell className="pl-8 py-4 font-black text-xs text-slate-400">
                                    {startIndex + index + 1}
                                </TableCell>

                                {/* Ticket # & Date */}
                                <TableCell>
                                    <div>
                                        <span className="font-black text-slate-900 dark:text-white text-xs uppercase italic tracking-wider block">
                                            {item.ticketNumber}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium italic flex items-center gap-1 mt-0.5">
                                            <Calendar size={10} />
                                            {format(new Date(item.collectedDate), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                </TableCell>

                                {/* Stall & Section */}
                                <TableCell>
                                    <div>
                                        <span className="font-black text-slate-800 dark:text-slate-100 text-xs">
                                            Stall {item.stall.stallNumber}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium italic block">
                                            {item.stall.stallType.name}
                                        </span>
                                    </div>
                                </TableCell>

                                {/* Vendor */}
                                <TableCell>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                        <User className="w-3.5 h-3.5 text-blue-500" />
                                        <span>{item.vendor?.name || <em className="text-slate-400">Anonymous</em>}</span>
                                    </div>
                                </TableCell>

                                {/* Amount Breakdown */}
                                <TableCell>
                                    <div>
                                        <span className="text-sm font-black text-slate-900 dark:text-white">
                                            ₱{item.totalAmountPaid.toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium block">
                                            Base: ₱{item.baseAmount} {item.otherFeesPaid > 0 && `+ Extra: ₱${item.otherFeesPaid}`}
                                        </span>
                                    </div>
                                </TableCell>

                                {/* Payment Method */}
                                <TableCell>
                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider">
                                        {item.paymentMethod}
                                    </span>
                                </TableCell>

                                {/* Status */}
                                <TableCell className="pr-8">
                                    {item.status === "PAID" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                                            <CheckCircle2 size={10} /> Paid
                                        </span>
                                    ) : item.status === "PARTIAL" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
                                            Partial
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-wider">
                                            <Ban size={10} /> {item.status}
                                        </span>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="px-8 py-4 bg-slate-50/50 dark:bg-[#1a1f2e] border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Showing <strong className="text-slate-900 dark:text-white">{startIndex + 1}</strong> to{" "}
                    <strong className="text-slate-900 dark:text-white">
                        {Math.min(startIndex + ITEMS_PER_PAGE, filteredCollections.length)}
                    </strong>{" "}
                    of <strong className="text-slate-900 dark:text-white">{filteredCollections.length}</strong> collections
                </span>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        className="h-8 px-3 text-xs font-bold rounded-xl border-slate-200 dark:border-[#2a3040]"
                    >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        className="h-8 px-3 text-xs font-bold rounded-xl border-slate-200 dark:border-[#2a3040]"
                    >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
