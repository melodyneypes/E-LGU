"use client";
import { sanitizeLguText } from "@/lib/utils/lgu";


import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useStalls } from "./StallsProvider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Plus, Trash2, X, MapPin, Search, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { updateStall } from "../actions/stalls.actions";

// Dynamic import for Leaflet LocationPicker (must run client-side only)
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
    ssr: false,
    loading: () => (
        <div className="h-[280px] w-full rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-bold animate-pulse">
            Loading {sanitizeLguText("{{LGU_NAME}}")} Map...
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
    const [isSectionOpen, setIsSectionOpen] = useState(false);
    const [sectionSearch, setSectionSearch] = useState<string>("");
    const sectionDropdownRef = useRef<HTMLDivElement>(null);

    const [vendorId, setVendorId] = useState<string>("NONE");
    const [isVendorOpen, setIsVendorOpen] = useState(false);
    const [vendorSearch, setVendorSearch] = useState<string>("");
    const vendorDropdownRef = useRef<HTMLDivElement>(null);
    const [status, setStatus] = useState<"VACANT" | "OCCUPIED" | "MAINTENANCE" | "RESERVED">("VACANT");
    const [latitude, setLatitude] = useState<string>("");
    const [longitude, setLongitude] = useState<string>("");
    const [address, setAddress] = useState<string>("");
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
        setAddress(editingStall.address || "");
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
        setVendorSearch("");
        setSectionSearch("");
        setIsSectionOpen(false);
        setIsVendorOpen(false);
    }, [editingStall]);

    // Close custom dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sectionDropdownRef.current && !sectionDropdownRef.current.contains(event.target as Node)) {
                setIsSectionOpen(false);
            }
            if (vendorDropdownRef.current && !vendorDropdownRef.current.contains(event.target as Node)) {
                setIsVendorOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Filter section list: must be active (isActive !== false or currently assigned) and match search query
    const filteredStallTypes = stallTypes.filter((t) => {
        if (t.isActive === false && t.id !== stallTypeId) return false;
        const query = sectionSearch.toLowerCase().trim();
        if (!query) return true;
        return (
            (t.name && t.name.toLowerCase().includes(query)) ||
            (t.code && t.code.toLowerCase().includes(query))
        );
    });

    // Filter vendor list: must be active (isActive !== false) and match search query
    const filteredVendors = vendors.filter((v) => {
        if (v.isActive === false) return false;
        const query = vendorSearch.toLowerCase().trim();
        if (!query) return true;
        return (
            (v.name && v.name.toLowerCase().includes(query)) ||
            (v.email && v.email.toLowerCase().includes(query))
        );
    });

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
            address: address.trim() || null,
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

                                {/* Section / Stall Type Custom Searchable Combobox */}
                                <div className="space-y-1 relative" ref={sectionDropdownRef}>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Section *</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsSectionOpen((prev) => !prev);
                                            setIsVendorOpen(false);
                                        }}
                                        className={cn(
                                            "w-full h-10 px-3 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-left",
                                            isSectionOpen && "ring-2 ring-emerald-500/30 border-emerald-500"
                                        )}
                                    >
                                        <span className={cn("truncate", !stallTypeId && "text-slate-400 font-normal italic")}>
                                            {stallTypes.find((t) => t.id === stallTypeId)?.name || "Select Section"}
                                        </span>
                                        <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200", isSectionOpen && "rotate-180")} />
                                    </button>

                                    {/* Inline Absolute Dropdown Menu */}
                                    {isSectionOpen && (
                                        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl z-[100] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                                            {/* Search Header */}
                                            <div className="p-2 border-b border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121622]">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search section..."
                                                        value={sectionSearch}
                                                        onChange={(e) => setSectionSearch(e.target.value)}
                                                        autoFocus
                                                        className="w-full pl-8 pr-3 h-8 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* Options List */}
                                            <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                                                {filteredStallTypes.length === 0 ? (
                                                    <div className="py-4 text-center text-xs text-slate-400 italic">
                                                        No sections matching &quot;{sectionSearch}&quot;
                                                    </div>
                                                ) : (
                                                    filteredStallTypes.map((t) => {
                                                        const isSelected = stallTypeId === t.id;
                                                        return (
                                                            <button
                                                                key={t.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setStallTypeId(t.id);
                                                                    setIsSectionOpen(false);
                                                                    setSectionSearch("");
                                                                }}
                                                                className={cn(
                                                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer",
                                                                    isSelected
                                                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                                                                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2638]"
                                                                )}
                                                            >
                                                                <span className="truncate">
                                                                    {t.name} {t.isActive === false ? "(Inactive)" : ""}
                                                                </span>
                                                                {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
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

                                {/* Vendor Assignment Custom Searchable Combobox */}
                                <div className="space-y-1 relative" ref={vendorDropdownRef}>
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Assign Vendor</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsVendorOpen((prev) => !prev);
                                            setIsSectionOpen(false);
                                        }}
                                        className={cn(
                                            "w-full h-10 px-3 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-left",
                                            isVendorOpen && "ring-2 ring-emerald-500/30 border-emerald-500"
                                        )}
                                    >
                                        <span className={cn("truncate", (!vendorId || vendorId === "NONE") && "text-slate-400 font-normal italic")}>
                                            {!vendorId || vendorId === "NONE"
                                                ? "-- No Vendor --"
                                                : vendors.find((v) => v.id === vendorId)?.name || vendors.find((v) => v.id === vendorId)?.email || "Selected Vendor"}
                                        </span>
                                        <ChevronDown className={cn("w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200", isVendorOpen && "rotate-180")} />
                                    </button>

                                    {/* Inline Absolute Dropdown Menu */}
                                    {isVendorOpen && (
                                        <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl z-[100] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
                                            {/* Search Header */}
                                            <div className="p-2 border-b border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121622]">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        placeholder="Search vendor..."
                                                        value={vendorSearch}
                                                        onChange={(e) => setVendorSearch(e.target.value)}
                                                        autoFocus
                                                        className="w-full pl-8 pr-3 h-8 bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* Options List */}
                                            <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                                                {/* No Vendor Option */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVendorId("NONE");
                                                        setIsVendorOpen(false);
                                                        setVendorSearch("");
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer",
                                                        vendorId === "NONE" || !vendorId
                                                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                                                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2638]"
                                                    )}
                                                >
                                                    <span className="truncate italic">-- No Vendor --</span>
                                                    {(vendorId === "NONE" || !vendorId) && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
                                                </button>

                                                {filteredVendors.length === 0 ? (
                                                    <div className="py-4 text-center text-xs text-slate-400 italic">
                                                        No vendors matching &quot;{vendorSearch}&quot;
                                                    </div>
                                                ) : (
                                                    filteredVendors.map((v) => {
                                                        const isSelected = vendorId === v.id;
                                                        return (
                                                            <button
                                                                key={v.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    setVendorId(v.id);
                                                                    setIsVendorOpen(false);
                                                                    setVendorSearch("");
                                                                }}
                                                                className={cn(
                                                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer",
                                                                    isSelected
                                                                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold"
                                                                        : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1f2638]"
                                                                )}
                                                            >
                                                                <span className="truncate">{v.name || v.email}</span>
                                                                {isSelected && <Check className="w-4 h-4 text-emerald-500 shrink-0 ml-2" />}
                                                            </button>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Daily Rate (₱)</label>
                                    <Input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={dailyRate}
                                        onKeyDown={(e) => {
                                            if (e.key === "-" || e.key === "e") e.preventDefault();
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || parseFloat(val) >= 0) {
                                                setDailyRate(val);
                                            }
                                        }}
                                        className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly Rate (₱)</label>
                                    <Input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={monthlyRate}
                                        onKeyDown={(e) => {
                                            if (e.key === "-" || e.key === "e") e.preventDefault();
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || parseFloat(val) >= 0) {
                                                setMonthlyRate(val);
                                            }
                                        }}
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
                                        min="0"
                                        value={dailyRateOverdueFee}
                                        onKeyDown={(e) => {
                                            if (e.key === "-" || e.key === "e") e.preventDefault();
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || parseFloat(val) >= 0) {
                                                setDailyRateOverdueFee(val);
                                            }
                                        }}
                                        className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">Monthly Overdue Fee (₱)</label>
                                    <Input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={monthlyRateOverdueFee}
                                        onKeyDown={(e) => {
                                            if (e.key === "-" || e.key === "e") e.preventDefault();
                                        }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === "" || parseFloat(val) >= 0) {
                                                setMonthlyRateOverdueFee(val);
                                            }
                                        }}
                                        className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>

                            {/* Specific Physical Address / Location */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                    Specific Location / Stall Address
                                </label>
                                <Input
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="e.g. Dry Goods Section, Gate 2, Building A"
                                    className="h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium"
                                />
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
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {otherFees.map((fee, idx) => (
                                            <div
                                                key={idx}
                                                className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-slate-50 dark:bg-[#1a202c] p-2 rounded-xl border border-slate-200 dark:border-[#2a3040]"
                                            >
                                                <Input
                                                    placeholder="Fee Name"
                                                    value={fee.name}
                                                    onChange={(e) => handleFeeChange(idx, "name", e.target.value)}
                                                    className="h-8 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-medium flex-1 min-w-[100px]"
                                                />
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    min="0"
                                                    placeholder="Amount"
                                                    value={fee.amount}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "-" || e.key === "e") e.preventDefault();
                                                    }}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === "" || parseFloat(val) >= 0) {
                                                            handleFeeChange(idx, "amount", val);
                                                        }
                                                    }}
                                                    className="h-8 w-20 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold"
                                                />
                                                <Select
                                                    value={fee.feeType}
                                                    onValueChange={(val: any) => handleFeeChange(idx, "feeType", val)}
                                                >
                                                    <SelectTrigger className="h-8 w-24 bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold">
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

                        {/* RIGHT COLUMN: Persistent Map & Pin Location (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col space-y-2">
                            <div className="flex items-center justify-between pb-1">
                                <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-rose-500" />
                                    <div>
                                        <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900 dark:text-white">
                                            Market Location Pin
                                        </h4>
                                        <p className="text-[10px] text-slate-400 font-medium italic">
                                            Click on the map or drag pin inside {sanitizeLguText("{{LGU_NAME}}")}.
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

                            {/* Embedded Persistent Map */}
                            <div className="flex-1 min-h-[380px] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a3040] shadow-sm relative">
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
