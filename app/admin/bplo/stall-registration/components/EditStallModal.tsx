"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useStalls } from "./StallsProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus, Trash2, X, MapPin } from "lucide-react";
import { toast } from "sonner";
import { updateStall } from "../actions/stalls.actions";

// Dynamic import for Leaflet LocationPicker (must run client-side only)
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
    ssr: false,
    loading: () => (
        <div className="h-[280px] w-full rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold animate-pulse">
            Loading Mapandan Map...
        </div>
    ),
});

interface OtherFeeItem {
    id?: string;
    name: string;
    amount: string | number;
    feeType: "DAILY" | "MONTHLY";
    remarks?: string;
}

export function EditStallModal() {
    const { isEditOpen, setIsEditOpen, editingStall, stallTypes, vendors, themeColor, triggerRefresh, setStalls } = useStalls();

    const [stallNumber, setStallNumber] = useState("");
    const [stallTypeId, setStallTypeId] = useState("");
    const [vendorId, setVendorId] = useState<string>("NONE");
    const [status, setStatus] = useState<"VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED">("VACANT");
    const [latitude, setLatitude] = useState<string>("");
    const [longitude, setLongitude] = useState<string>("");
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
        setLatitude(editingStall.latitude !== null && editingStall.latitude !== undefined ? editingStall.latitude.toString() : "");
        setLongitude(editingStall.longitude !== null && editingStall.longitude !== undefined ? editingStall.longitude.toString() : "");
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
        const parsedLat = latitude.trim() !== "" ? parseFloat(latitude) : null;
        const parsedLng = longitude.trim() !== "" ? parseFloat(longitude) : null;

        const res = await updateStall(editingStall.id, {
            stallNumber,
            stallTypeId,
            vendorId: vendorId === "NONE" ? null : vendorId,
            status,
            latitude: parsedLat,
            longitude: parsedLng,
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
        if (res.success && res.data) {
            // Instant Optimistic Update: 0ms delay in table and grid
            setStalls((prev) => prev.map((s) => (s.id === editingStall.id ? (res.data as any) : s)));
            toast.success(`Market Stall "${stallNumber}" updated successfully!`);
            setIsEditOpen(false);
            triggerRefresh();
        } else {
            toast.error(res.error || "Failed to update stall");
        }
    };

    if (!editingStall) return null;

    return (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent showCloseButton={false} className="sm:max-w-5xl w-[95vw] p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl max-h-[90vh] flex flex-col">
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

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col justify-between custom-scrollbar">
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Stall Details, Rates, Custom Fees (7 cols) */}
                        <div className="lg:col-span-7 space-y-4">
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

                            <div className="grid grid-cols-2 gap-4 pt-1">
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

                            {/* Dynamic StallOtherFee Section */}
                            <div className="pt-3 border-t border-slate-100 dark:border-[#2a3040] space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                            Custom Stall Fees
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-medium italic">
                                            Modify recurring utility/maintenance fees.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddFee}
                                        className="h-8 px-3 rounded-xl text-xs font-bold border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add Fee</span>
                                    </Button>
                                </div>

                                {otherFees.length > 0 && (
                                    <div className="space-y-2 bg-slate-50 dark:bg-[#10141d] p-3 rounded-2xl border border-slate-200/60 dark:border-[#2a3040] max-h-48 overflow-y-auto custom-scrollbar">
                                        {otherFees.map((fee, idx) => (
                                            <div
                                                key={idx}
                                                className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white dark:bg-[#151b2b] p-2 rounded-xl border border-slate-200 dark:border-[#2a3040]"
                                            >
                                                <Input
                                                    placeholder="Fee Name"
                                                    value={fee.name}
                                                    onChange={(e) => handleFeeChange(idx, "name", e.target.value)}
                                                    className="h-8 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-medium flex-1 min-w-[100px]"
                                                />
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    placeholder="Amount"
                                                    value={fee.amount}
                                                    onChange={(e) => handleFeeChange(idx, "amount", e.target.value)}
                                                    className="h-8 w-20 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold"
                                                />
                                                <Select
                                                    value={fee.feeType}
                                                    onValueChange={(val: any) => handleFeeChange(idx, "feeType", val)}
                                                >
                                                    <SelectTrigger className="h-8 w-24 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold">
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
                                                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg shrink-0 cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: Persistent Map & Coordinates (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col space-y-3 bg-slate-50 dark:bg-[#10141d] p-4 rounded-3xl border border-slate-200 dark:border-[#2a3040]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-rose-500" />
                                    <div>
                                        <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">
                                            Market Location Pin
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-medium italic">
                                            Click on the map or drag pin inside Mapandan.
                                        </p>
                                    </div>
                                </div>
                                {(latitude || longitude) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLatitude("");
                                            setLongitude("");
                                        }}
                                        className="text-[11px] text-rose-500 hover:underline font-bold"
                                    >
                                        Clear Pin
                                    </button>
                                )}
                            </div>

                            {/* Coordinates readouts/inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Latitude</label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={latitude}
                                        onChange={(e) => setLatitude(e.target.value)}
                                        placeholder="e.g. 16.0245"
                                        className="h-9 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Longitude</label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={longitude}
                                        onChange={(e) => setLongitude(e.target.value)}
                                        placeholder="e.g. 120.4520"
                                        className="h-9 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-mono"
                                    />
                                </div>
                            </div>

                            {/* Embedded Persistent Map */}
                            <div className="flex-1 min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a3040] shadow-inner relative">
                                <LocationPicker
                                    lat={latitude ? parseFloat(latitude) : null}
                                    lng={longitude ? parseFloat(longitude) : null}
                                    onChange={(newLat, newLng) => {
                                        setLatitude(newLat.toFixed(6));
                                        setLongitude(newLng.toFixed(6));
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-5 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a202c]/50">
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
                            className="rounded-xl text-xs font-black uppercase italic tracking-wider text-white px-6 cursor-pointer"
                        >
                            {loading ? "Updating..." : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
