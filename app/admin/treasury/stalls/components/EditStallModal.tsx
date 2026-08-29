"use client";

import React, { useState, useEffect } from "react";
import { useStalls } from "./StallsProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus, Trash2, X } from "lucide-react";
import { updateStall } from "../actions/stalls.actions";

interface OtherFeeItem {
    id?: string;
    name: string;
    amount: string | number;
    feeType: "DAILY" | "MONTHLY";
    remarks?: string;
}

export function EditStallModal() {
    const { isEditOpen, setIsEditOpen, editingStall, stallTypes, vendors, themeColor, triggerRefresh } = useStalls();

    const [stallNumber, setStallNumber] = useState("");
    const [stallTypeId, setStallTypeId] = useState("");
    const [vendorId, setVendorId] = useState<string>("NONE");
    const [status, setStatus] = useState<"VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED">("VACANT");
    const [dailyRate, setDailyRate] = useState("0");
    const [monthlyRate, setMonthlyRate] = useState("0");
    const [dailyRateOverdueFee, setDailyRateOverdueFee] = useState("0");
    const [monthlyRateOverdueFee, setMonthlyRateOverdueFee] = useState("0");
    const [otherFees, setOtherFees] = useState<OtherFeeItem[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!editingStall) return;
        setStallNumber(editingStall.stallNumber);
        setStallTypeId(editingStall.stallTypeId);
        setVendorId(editingStall.vendorId || "NONE");
        setStatus(editingStall.status);
        setDailyRate(editingStall.dailyRate.toString());
        setMonthlyRate(editingStall.monthlyRate.toString());
        setDailyRateOverdueFee(editingStall.dailyRateOverdueFee.toString());
        setMonthlyRateOverdueFee(editingStall.monthlyRateOverdueFee.toString());
        setOtherFees(
            (editingStall.otherFees || []).map((f: any) => ({
                id: f.id,
                name: f.name || "",
                amount: f.amount !== undefined ? f.amount.toString() : "0",
                feeType: f.feeType || "DAILY",
                remarks: f.remarks || "",
            }))
        );
    }, [editingStall]);

    const handleAddFee = () => {
        setOtherFees((prev) => [
            ...prev,
            { name: "", amount: "", feeType: "DAILY", remarks: "" },
        ]);
    };

    const handleRemoveFee = (index: number) => {
        setOtherFees((prev) => prev.filter((_, i) => i !== index));
    };

    const handleFeeChange = (index: number, field: keyof OtherFeeItem, value: any) => {
        setOtherFees((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingStall || !stallNumber.trim() || !stallTypeId) return;

        setLoading(true);
        const res = await updateStall(editingStall.id, {
            stallNumber,
            stallTypeId,
            vendorId: vendorId === "NONE" ? null : vendorId,
            status,
            dailyRate: parseFloat(dailyRate) || 0,
            monthlyRate: parseFloat(monthlyRate) || 0,
            dailyRateOverdueFee: parseFloat(dailyRateOverdueFee) || 0,
            monthlyRateOverdueFee: parseFloat(monthlyRateOverdueFee) || 0,
            otherFees: otherFees.map((f) => ({
                id: f.id,
                name: f.name.trim(),
                amount: parseFloat(String(f.amount)) || 0,
                feeType: f.feeType,
                remarks: f.remarks?.trim() || null,
            })),
        });

        setLoading(false);
        if (res.success) {
            setIsEditOpen(false);
            triggerRefresh();
        } else {
            alert(res.error || "Failed to update stall");
        }
    };

    if (!editingStall) return null;

    return (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent showCloseButton={false} className="sm:max-w-xl p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-[#2a3040] flex flex-row items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl text-white shadow-md" style={{ backgroundColor: themeColor }}>
                            <Edit className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                Edit Stall ({editingStall.stallNumber})
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500 font-medium italic">
                                Update stall parameters, rates, or vendor assignment.
                            </DialogDescription>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsEditOpen(false)}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stall Number *</label>
                            <Input
                                required
                                value={stallNumber}
                                onChange={(e) => setStallNumber(e.target.value)}
                                className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                            />
                        </div>

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

                    {/* Other Fees Section */}
                    <div className="pt-4 border-t border-slate-100 dark:border-[#2a3040] space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    Other Stall Fees (Utilities & Charges)
                                </h4>
                                <p className="text-[10px] text-slate-400 font-medium">
                                    Add custom fees like Garbage, Security, or Sanitation.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddFee}
                                className="h-8 px-3 rounded-xl border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Other Fee</span>
                            </Button>
                        </div>

                        {otherFees.length === 0 ? (
                            <div className="p-4 bg-slate-50/50 dark:bg-[#1a202c]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#2a3040] text-center text-xs text-slate-400 italic">
                                No additional stall fees configured. Click &quot;+ Add Other Fee&quot; to create one.
                            </div>
                        ) : (
                            <div className="space-y-2.5">
                                {otherFees.map((fee, idx) => (
                                    <div
                                        key={idx}
                                        className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 dark:bg-[#1a202c] p-3 rounded-2xl border border-slate-200 dark:border-[#2a3040]"
                                    >
                                        <Input
                                            placeholder="Fee Name (e.g. Garbage)"
                                            value={fee.name}
                                            onChange={(e) => handleFeeChange(idx, "name", e.target.value)}
                                            className="h-9 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium flex-1 min-w-[120px]"
                                        />

                                        <Input
                                            type="number"
                                            step="any"
                                            placeholder="Amount"
                                            value={fee.amount}
                                            onChange={(e) => handleFeeChange(idx, "amount", e.target.value)}
                                            className="h-9 w-24 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                                        />

                                        <Select
                                            value={fee.feeType}
                                            onValueChange={(val: any) => handleFeeChange(idx, "feeType", val)}
                                        >
                                            <SelectTrigger className="h-9 w-28 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-[#151b2b]">
                                                <SelectItem value="DAILY">DAILY</SelectItem>
                                                <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleRemoveFee(idx)}
                                            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl shrink-0 cursor-pointer"
                                            title="Delete Fee"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#2a3040] shrink-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsEditOpen(false)}
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
                            {loading ? "Updating..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
