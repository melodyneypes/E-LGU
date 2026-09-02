"use client";

import React, { useState, useEffect } from "react";
import { useCollections } from "./CollectionsProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, Calculator } from "lucide-react";
import { issueStallTicket } from "../actions";

export function IssueTicketModal() {
    const { isIssueModalOpen, setIsIssueModalOpen, stalls, collectorId, themeColor } = useCollections();

    const [selectedStallId, setSelectedStallId] = useState("");
    const [ticketNumber, setTicketNumber] = useState("");
    const [baseAmount, setBaseAmount] = useState("0");
    const [otherFeesPaid, setOtherFeesPaid] = useState("0");
    const [overdueFeePaid, setOverdueFeePaid] = useState("0");
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "EPAYMENT">("CASH");
    const [remarks, setRemarks] = useState("");
    const [loading, setLoading] = useState(false);

    const handleStallSelect = (stallId: string) => {
        setSelectedStallId(stallId);
        const found = stalls.find((s) => s.id === stallId);
        if (found) {
            setBaseAmount(found.dailyRate.toString());

            // Calculate sum of attached other fees if any
            let sumOther = 0;
            if (found.otherFees && found.otherFees.length > 0) {
                sumOther = found.otherFees.reduce((acc, curr) => acc + (curr.otherFee?.amount || 0), 0);
            }
            setOtherFeesPaid(sumOther.toString());
        }
    };

    // Auto-generate ticket number & select initial stall
    useEffect(() => {
        if (!isIssueModalOpen) return;
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        setTicketNumber(`TKT-${randomNum}`);

        if (stalls.length > 0 && !selectedStallId) {
            handleStallSelect(stalls[0].id);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isIssueModalOpen, stalls]);

    const calculatedTotal =
        (parseFloat(baseAmount) || 0) +
        (parseFloat(otherFeesPaid) || 0) +
        (parseFloat(overdueFeePaid) || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStallId || !ticketNumber.trim()) {
            alert("Please select a stall and provide a ticket number");
            return;
        }

        setLoading(true);
        const res = await issueStallTicket({
            stallId: selectedStallId,
            collectorId,
            ticketNumber,
            baseAmount: parseFloat(baseAmount) || 0,
            otherFeesPaid: parseFloat(otherFeesPaid) || 0,
            overdueFeePaid: parseFloat(overdueFeePaid) || 0,
            paymentMethod,
            remarks: remarks.trim() || null,
        });

        setLoading(false);
        if (res.success) {
            setIsIssueModalOpen(false);
            setRemarks("");
        } else {
            alert(res.error || "Failed to issue ticket");
        }
    };

    return (
        <Dialog open={isIssueModalOpen} onOpenChange={setIsIssueModalOpen}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <Receipt className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Issue Ticket Payment
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Record daily market stall collection and rental fee payment.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Select Stall */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Select Market Stall *</label>
                        <Select value={selectedStallId} onValueChange={handleStallSelect}>
                            <SelectTrigger className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                <SelectValue placeholder="Select Stall" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b]">
                                {stalls.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        Stall {s.stallNumber} ({s.stallType.name}) - Vendor: {s.vendor?.name || "Unassigned"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Ticket Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ticket / OR Number *</label>
                            <Input
                                required
                                value={ticketNumber}
                                onChange={(e) => setTicketNumber(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Payment Method *</label>
                            <Select value={paymentMethod} onValueChange={(val: any) => setPaymentMethod(val)}>
                                <SelectTrigger className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                    <SelectValue placeholder="Method" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b]">
                                    <SelectItem value="CASH">CASH</SelectItem>
                                    <SelectItem value="EPAYMENT">EPAYMENT</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Breakdown Inputs */}
                    <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Base Daily (₱)</label>
                            <Input
                                type="number"
                                step="any"
                                value={baseAmount}
                                onChange={(e) => setBaseAmount(e.target.value)}
                                className="h-9 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Other Fees (₱)</label>
                            <Input
                                type="number"
                                step="any"
                                value={otherFeesPaid}
                                onChange={(e) => setOtherFeesPaid(e.target.value)}
                                className="h-9 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Overdue (₱)</label>
                            <Input
                                type="number"
                                step="any"
                                value={overdueFeePaid}
                                onChange={(e) => setOverdueFeePaid(e.target.value)}
                                className="h-9 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>

                    {/* Calculated Total Display */}
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs uppercase tracking-wider">
                            <Calculator className="w-4 h-4" />
                            <span>Total Payable Amount</span>
                        </div>
                        <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                            ₱{calculatedTotal.toLocaleString()}
                        </span>
                    </div>

                    {/* Remarks */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Remarks / Collector Notes</label>
                        <Input
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Optional payment notes..."
                            className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsIssueModalOpen(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: themeColor }}
                            className="rounded-xl text-xs font-black uppercase italic tracking-wider text-white px-5"
                        >
                            {loading ? "Processing..." : "Issue Receipt & Collect"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
