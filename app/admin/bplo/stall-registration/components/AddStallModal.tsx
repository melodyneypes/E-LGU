"use client";

import React, { useState } from "react";
import { useStalls } from "./StallsProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, Plus, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { createStall } from "../actions/stalls.actions";

interface OtherFeeInput {
    id: string;
    name: string;
    amount: string;
    feeType: "DAILY" | "MONTHLY";
    remarks: string;
}

export function AddStallModal() {
    const { isAddOpen, setIsAddOpen, stallTypes, vendors, themeColor, triggerRefresh, setStalls } = useStalls();

    const [stallNumber, setStallNumber] = useState("");
    const [stallTypeId, setStallTypeId] = useState(stallTypes[0]?.id || "");
    const [vendorId, setVendorId] = useState<string>("NONE");
    const [vendorSearch, setVendorSearch] = useState("");
    const [status, setStatus] = useState<"VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED">("VACANT");
    const [dailyRate, setDailyRate] = useState("");
    const [monthlyRate, setMonthlyRate] = useState("");
    const [dailyRateOverdueFee, setDailyRateOverdueFee] = useState("");
    const [monthlyRateOverdueFee, setMonthlyRateOverdueFee] = useState("");
    const [otherFees, setOtherFees] = useState<OtherFeeInput[]>([]);
    const [loading, setLoading] = useState(false);

    // Filter vendor list by search input
    const filteredVendors = vendors.filter((v) => {
        const query = vendorSearch.toLowerCase().trim();
        if (!query) return true;
        return (
            (v.name && v.name.toLowerCase().includes(query)) ||
            (v.email && v.email.toLowerCase().includes(query))
        );
    });

    const handleAddOtherFee = () => {
        setOtherFees([
            ...otherFees,
            {
                id: Math.random().toString(),
                name: "",
                amount: "",
                feeType: "DAILY",
                remarks: "",
            },
        ]);
    };

    const handleRemoveOtherFee = (id: string) => {
        setOtherFees(otherFees.filter((fee) => fee.id !== id));
    };

    const handleUpdateOtherFee = (id: string, field: keyof OtherFeeInput, value: string) => {
        setOtherFees(
            otherFees.map((fee) => (fee.id === id ? { ...fee, [field]: value } : fee))
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stallNumber.trim() || !stallTypeId) {
            alert("Please fill in the stall number and section");
            return;
        }

        setLoading(true);
        const validOtherFees = otherFees
            .filter((fee) => fee.name.trim() !== "" && parseFloat(fee.amount) > 0)
            .map((fee) => ({
                name: fee.name.trim(),
                amount: parseFloat(fee.amount) || 0,
                feeType: fee.feeType,
                remarks: fee.remarks.trim() || null,
            }));

        const res = await createStall({
            stallNumber,
            stallTypeId,
            vendorId: vendorId === "NONE" ? null : vendorId,
            status,
            dailyRate: parseFloat(dailyRate) || 0,
            monthlyRate: parseFloat(monthlyRate) || 0,
            dailyRateOverdueFee: parseFloat(dailyRateOverdueFee) || 0,
            monthlyRateOverdueFee: parseFloat(monthlyRateOverdueFee) || 0,
            otherFees: validOtherFees,
        });

        setLoading(false);
        if (res.success && res.data) {
            // Instant Optimistic Insertion: 0ms delay in table and grid
            setStalls((prev) => [res.data as any, ...prev]);
            toast.success(`Market Stall "${stallNumber}" created successfully!`);
            setIsAddOpen(false);
            setStallNumber("");
            setVendorId("NONE");
            setVendorSearch("");
            setDailyRate("");
            setMonthlyRate("");
            setDailyRateOverdueFee("");
            setMonthlyRateOverdueFee("");
            setOtherFees([]);
            triggerRefresh();
        } else {
            toast.error(res.error || "Failed to create stall");
        }
    };

    return (
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl">
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
                                Register a new stall unit and configure custom stall fees.
                            </DialogDescription>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAddOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
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

                        {/* Vendor Assignment with Searchbar inside Dropdown */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Assign Vendor (Role: VENDOR)</label>
                            <Select value={vendorId} onValueChange={setVendorId}>
                                <SelectTrigger className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                    <SelectValue placeholder="Select Vendor" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b] max-h-60">
                                    {/* Searchbar inside Dropdown */}
                                    <div className="p-2 sticky top-0 bg-white dark:bg-[#151b2b] border-b border-slate-100 dark:border-[#2a3040] z-10" onClick={(e) => e.stopPropagation()}>
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                            <Input
                                                placeholder="Search vendor name or email..."
                                                value={vendorSearch}
                                                onChange={(e) => setVendorSearch(e.target.value)}
                                                className="pl-8 h-8 rounded-lg bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-[11px]"
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>
                                    <SelectItem value="NONE">-- No Vendor Assigned --</SelectItem>
                                    {filteredVendors.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-slate-400 italic">No vendors matching search.</div>
                                    ) : (
                                        filteredVendors.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.name || v.email}
                                            </SelectItem>
                                        ))
                                    )}
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
                                placeholder="e.g. 50"
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
                                placeholder="e.g. 1500"
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
                                placeholder="e.g. 10"
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
                                placeholder="e.g. 100"
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>
                    </div>

                    {/* Dynamic StallOtherFee Section */}
                    <div className="pt-3 border-t border-slate-100 dark:border-[#2a3040] space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 block">
                                    Stall Other Fees
                                </label>
                                <span className="text-[10px] text-slate-400 font-medium italic">
                                    Add custom fees (e.g. Garbage Fee, Electricity Fee)
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddOtherFee}
                                className="h-8 px-3 rounded-xl text-xs font-bold border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Fee</span>
                            </Button>
                        </div>

                        {otherFees.length > 0 && (
                            <div className="space-y-3 bg-slate-50 dark:bg-[#10141d] p-3 rounded-2xl border border-slate-200/60 dark:border-[#2a3040]">
                                {otherFees.map((fee) => (
                                    <div key={fee.id} className="grid grid-cols-12 gap-2 items-center">
                                        <div className="col-span-4">
                                            <Input
                                                placeholder="Fee Name (e.g. Garbage)"
                                                value={fee.name}
                                                onChange={(e) => handleUpdateOtherFee(fee.id, "name", e.target.value)}
                                                className="h-8 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Input
                                                type="number"
                                                step="any"
                                                placeholder="Amount (₱)"
                                                value={fee.amount}
                                                onChange={(e) => handleUpdateOtherFee(fee.id, "amount", e.target.value)}
                                                className="h-8 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs"
                                            />
                                        </div>
                                        <div className="col-span-4">
                                            <Select
                                                value={fee.feeType}
                                                onValueChange={(val: any) => handleUpdateOtherFee(fee.id, "feeType", val)}
                                            >
                                                <SelectTrigger className="h-8 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-white dark:bg-[#151b2b]">
                                                    <SelectItem value="DAILY">Daily Fee</SelectItem>
                                                    <SelectItem value="MONTHLY">Monthly Fee</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleRemoveOtherFee(fee.id)}
                                                className="h-7 w-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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
                            className="rounded-xl text-xs font-black uppercase italic tracking-wider text-white px-5 cursor-pointer"
                        >
                            {loading ? "Saving..." : "Create Stall"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
