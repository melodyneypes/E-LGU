"use client";

import React, { useEffect } from "react";
import { useCollections } from "./CollectionsProvider";
import { Receipt, X } from "lucide-react";
import { format } from "date-fns";

export function TicketReceiptModal() {
    const { selectedReceipt, setSelectedReceipt, themeColor } = useCollections();

    // Lock body scroll when modal is open & close on Escape key
    useEffect(() => {
        if (!selectedReceipt) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSelectedReceipt(null);
        };
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener("keydown", handleEscape);
        };
    }, [selectedReceipt, setSelectedReceipt]);

    if (!selectedReceipt) return null;

    return (
        <div
            onClick={() => setSelectedReceipt(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-md bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors cursor-default"
            >
                {/* Header Banner */}
                <div className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] space-y-3 bg-slate-50/50 dark:bg-[#1a202c]/50 relative text-center">
                    <button
                        onClick={() => setSelectedReceipt(null)}
                        className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>

                    <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: themeColor }}>
                        <Receipt className="w-6 h-6" />
                    </div>

                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                        Official Ticket Receipt
                    </h2>
                    <p className="text-xs text-slate-400 font-medium italic">
                        Municipality of E-LGU · Treasury Dept
                    </p>
                </div>

                {/* Body Receipt Slip */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 dark:text-slate-200 custom-scrollbar pr-3">
                    {/* Ticket No & Date */}
                    <div className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-100 dark:border-[#2a3040] text-xs">
                        <div>
                            <span className="text-[9px] font-black uppercase text-slate-400 block">Ticket No</span>
                            <span className="font-black text-slate-900 dark:text-white">{selectedReceipt.ticketNumber}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-black uppercase text-slate-400 block">Date</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">
                                {format(new Date(selectedReceipt.collectedDate), "MMM d, yyyy")}
                            </span>
                        </div>
                    </div>

                    {/* Stall & Vendor Card */}
                    <div className="p-4 rounded-2xl border border-slate-100 dark:border-[#2a3040] space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-medium">Stall Unit:</span>
                            <span className="font-black text-slate-900 dark:text-white">Stall {selectedReceipt.stall.stallNumber}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-400 font-medium">Section:</span>
                            <span className="font-bold text-slate-700 dark:text-slate-300">{selectedReceipt.stall.stallType.name}</span>
                        </div>
                        <div className="flex justify-between text-xs border-t border-slate-100 dark:border-[#2a3040] pt-2">
                            <span className="text-slate-400 font-medium">Vendor:</span>
                            <span className="font-bold text-slate-900 dark:text-white">{selectedReceipt.vendor?.name || "Anonymous"}</span>
                        </div>
                    </div>

                    {/* Financial Breakdown Table */}
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#2a3040]">
                            <span className="text-slate-500 font-medium">Daily Rental Base Fee:</span>
                            <span className="font-bold">₱{selectedReceipt.baseAmount.toLocaleString()}</span>
                        </div>
                        {selectedReceipt.otherFeesPaid > 0 && (
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#2a3040]">
                                <span className="text-slate-500 font-medium">Utility / Sanitation Fees:</span>
                                <span className="font-bold">₱{selectedReceipt.otherFeesPaid.toLocaleString()}</span>
                            </div>
                        )}
                        {selectedReceipt.overdueFeePaid > 0 && (
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#2a3040]">
                                <span className="text-slate-500 font-medium">Overdue Surcharge:</span>
                                <span className="font-bold">₱{selectedReceipt.overdueFeePaid.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="flex justify-between pt-3 text-sm font-black text-slate-900 dark:text-white">
                            <span>TOTAL PAID:</span>
                            <span className="text-emerald-600 dark:text-emerald-400">₱{selectedReceipt.totalAmountPaid.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#1a202c] text-center text-[10px] text-slate-400 font-medium italic space-y-1">
                        <p>Collector: {selectedReceipt.collector.name || selectedReceipt.collector.email}</p>
                        <p>Payment Method: {selectedReceipt.paymentMethod}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
