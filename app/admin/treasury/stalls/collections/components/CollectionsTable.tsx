"use client";

import React from "react";
import { useCollections, CollectionRecord } from "./CollectionsProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Receipt, User, Eye, Ban, CheckCircle2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cancelStallTicket } from "../actions";

export function CollectionsTable() {
    const {
        collections,
        search,
        paymentMethodFilter,
        setSelectedReceipt,
    } = useCollections();

    // Filter collections logic
    const filteredCollections = collections.filter((item) => {
        const matchesSearch =
            item.ticketNumber.toLowerCase().includes(search.toLowerCase()) ||
            item.stall.stallNumber.toLowerCase().includes(search.toLowerCase()) ||
            (item.vendor?.name && item.vendor.name.toLowerCase().includes(search.toLowerCase()));

        const matchesMethod =
            paymentMethodFilter === "ALL" || item.paymentMethod === paymentMethodFilter;

        return matchesSearch && matchesMethod;
    });

    const handleCancel = async (id: string, ticketNumber: string) => {
        if (confirm(`Are you sure you want to cancel ticket "${ticketNumber}"?`)) {
            const res = await cancelStallTicket(id);
            if (!res.success) {
                alert(res.error || "Failed to cancel ticket");
            }
        }
    };

    if (filteredCollections.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] text-center">
                <Receipt className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase italic">No Collections Found</h3>
                <p className="text-xs text-slate-400 font-medium italic mt-1">Try adjusting your search query or filter settings.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="w-[140px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
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
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Status
                            </TableHead>
                            <TableHead className="w-[100px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-right pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredCollections.map((item: CollectionRecord) => (
                            <TableRow
                                key={item.id}
                                className="group hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors border-b border-slate-100 dark:border-[#2a3040]"
                            >
                                {/* Ticket # & Date */}
                                <TableCell className="pl-8 py-4">
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
                                <TableCell>
                                    {item.status === "PAID" ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                                            <CheckCircle2 size={10} /> Paid
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 text-[10px] font-black uppercase tracking-wider">
                                            <Ban size={10} /> Cancelled
                                        </span>
                                    )}
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="pr-8 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedReceipt(item)}
                                            className="h-8 w-8 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer"
                                            title="View Official Receipt"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </Button>
                                        {item.status === "PAID" && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleCancel(item.id, item.ticketNumber)}
                                                className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                title="Cancel Ticket"
                                            >
                                                <Ban className="w-3.5 h-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
