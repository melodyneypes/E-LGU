"use client";

import React, { useState } from "react";
import { useStalls } from "./StallsProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store } from "lucide-react";
import { createStall } from "../actions";

export function AddStallModal() {
    const { isAddOpen, setIsAddOpen, stallTypes, vendors, themeColor } = useStalls();

    const [stallNumber, setStallNumber] = useState("");
    const [stallTypeId, setStallTypeId] = useState(stallTypes[0]?.id || "");
    const [vendorId, setVendorId] = useState<string>("NONE");
    const [status, setStatus] = useState<"VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED">("VACANT");
    const [dailyRate, setDailyRate] = useState("50");
    const [monthlyRate, setMonthlyRate] = useState("1500");
    const [dailyRateOverdueFee, setDailyRateOverdueFee] = useState("10");
    const [monthlyRateOverdueFee, setMonthlyRateOverdueFee] = useState("100");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stallNumber.trim() || !stallTypeId) {
            alert("Please fill in the stall number and section");
            return;
        }

        setLoading(true);
        const res = await createStall({
            stallNumber,
            stallTypeId,
            vendorId: vendorId === "NONE" ? null : vendorId,
            status,
            dailyRate: parseFloat(dailyRate) || 0,
            monthlyRate: parseFloat(monthlyRate) || 0,
            dailyRateOverdueFee: parseFloat(dailyRateOverdueFee) || 0,
            monthlyRateOverdueFee: parseFloat(monthlyRateOverdueFee) || 0,
        });

        setLoading(false);
        if (res.success) {
            setIsAddOpen(false);
            setStallNumber("");
        } else {
            alert(res.error || "Failed to create stall");
        }
    };

    return (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <Store className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Add Market Stall
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Register a new stall unit into the market database.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Stall Number */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stall Number *</label>
                            <Input
                                required
                                value={stallNumber}
                                onChange={(e) => setStallNumber(e.target.value)}
                                placeholder="e.g. STALL-101"
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>

                        {/* Section / Stall Type */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Section *</label>
                            <Select value={stallTypeId} onValueChange={setStallTypeId}>
                                <SelectTrigger className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                    <SelectValue placeholder="Select Section" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b]">
                                    {stallTypes.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status</label>
                            <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                                <SelectTrigger className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b]">
                                    <SelectItem value="VACANT">Vacant</SelectItem>
                                    <SelectItem value="OCCUPIED">Occupied</SelectItem>
                                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                    <SelectItem value="RESERVED">Reserved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Vendor Assignment */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Assign Vendor</label>
                            <Select value={vendorId} onValueChange={setVendorId}>
                                <SelectTrigger className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                    <SelectValue placeholder="Select Vendor" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b]">
                                    <SelectItem value="NONE">-- No Vendor --</SelectItem>
                                    {vendors.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.name || v.email}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Financial Rates */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Daily Rate (₱)</label>
                            <Input
                                type="number"
                                step="any"
                                value={dailyRate}
                                onChange={(e) => setDailyRate(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly Rate (₱)</label>
                            <Input
                                type="number"
                                step="any"
                                value={monthlyRate}
                                onChange={(e) => setMonthlyRate(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Daily Overdue Fee (₱)</label>
                            <Input
                                type="number"
                                step="any"
                                value={dailyRateOverdueFee}
                                onChange={(e) => setDailyRateOverdueFee(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly Overdue Fee (₱)</label>
                            <Input
                                type="number"
                                step="any"
                                value={monthlyRateOverdueFee}
                                onChange={(e) => setMonthlyRateOverdueFee(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsAddOpen(false)}
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
                            {loading ? "Saving..." : "Create Stall"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
