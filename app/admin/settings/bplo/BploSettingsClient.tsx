"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Save, ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { saveBploSettingsAction } from "./actions";

interface BploSettingsClientProps {
    initialSettings: Record<string, string>;
    themeColor: string;
}

export function BploSettingsClient({ initialSettings, themeColor }: BploSettingsClientProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Helper to safely parse JSON from database settings
    const parseSafeJSON = (raw: string, fallback: any) => {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch {
            return fallback;
        }
    };

    // Helper to convert DB decimals to user percentages with floating-point precision rounding
    const toPercent = (val: string) => String(parseFloat((parseFloat(val) * 100).toFixed(4)));
    // Helper to convert user percentages to DB decimals
    const toDecimal = (val: string) => String(parseFloat(val) / 100);

    const mayorsMatrix = parseSafeJSON(initialSettings.bplo_mayors_permit_matrix, {});
    const sanitaryMatrix = parseSafeJSON(initialSettings.bplo_sanitary_fee_matrix, []);
    const garbageMatrix = parseSafeJSON(initialSettings.bplo_garbage_fee_matrix, {});

    // Helper to extract nested values
    const getMayorFee = (line: string, size: string, fallback: number) => {
        return mayorsMatrix[line]?.[size] !== undefined ? String(mayorsMatrix[line][size]) : String(fallback);
    };

    const getSanitaryFee = (minArea: number, fallback: number) => {
        const item = sanitaryMatrix.find((i: any) => i.minArea === minArea);
        return item ? String(item.fee) : String(fallback);
    };

    const getGarbageFee = (cat: string, rate: "low" | "high", fallback: number) => {
        return garbageMatrix[cat]?.[rate] !== undefined ? String(garbageMatrix[cat][rate]) : String(fallback);
    };

    const [formState, setFormState] = useState({
        bplo_tax_rate_new: toPercent(initialSettings.bplo_tax_rate_new),
        bplo_health_card_fee: initialSettings.bplo_health_card_fee,
        bplo_mayors_tax_clearance_fee: initialSettings.bplo_mayors_tax_clearance_fee || "85.00",
        bplo_retail_tax_rate_low: toPercent(initialSettings.bplo_retail_tax_rate_low),
        bplo_retail_tax_rate_high: toPercent(initialSettings.bplo_retail_tax_rate_high),
        bplo_manufacturer_tax_rate: toPercent(initialSettings.bplo_manufacturer_tax_rate),
        bplo_wholesaler_tax_rate: toPercent(initialSettings.bplo_wholesaler_tax_rate),

        // Mayor's Permit matrices
        mayors_manufacturers_micro: getMayorFee("Manufacturers/Importers/Producers", "MICRO", 400),
        mayors_manufacturers_small: getMayorFee("Manufacturers/Importers/Producers", "SMALL", 600),
        mayors_manufacturers_medium: getMayorFee("Manufacturers/Importers/Producers", "MEDIUM", 1100),
        mayors_manufacturers_large: getMayorFee("Manufacturers/Importers/Producers", "LARGE", 2100),

        mayors_banks_universal_large: getMayorFee("Banks (Universal)", "LARGE", 5100),
        mayors_banks_commercial_large: getMayorFee("Banks (Commercial/Development)", "LARGE", 3100),
        mayors_banks_rural_large: getMayorFee("Banks (Rural/Thrift/Savings)", "LARGE", 1600),

        mayors_financial_micro: getMayorFee("Other Financial Institutions", "MICRO", 1100),
        mayors_financial_small: getMayorFee("Other Financial Institutions", "SMALL", 1600),
        mayors_financial_medium: getMayorFee("Other Financial Institutions", "MEDIUM", 3100),
        mayors_financial_large: getMayorFee("Other Financial Institutions", "LARGE", 5100),

        mayors_contractors_micro: getMayorFee("Contractors/Service Establishments", "MICRO", 500),
        mayors_contractors_small: getMayorFee("Contractors/Service Establishments", "SMALL", 900),
        mayors_contractors_medium: getMayorFee("Contractors/Service Establishments", "MEDIUM", 1100),
        mayors_contractors_large: getMayorFee("Contractors/Service Establishments", "LARGE", 1600),

        mayors_wholesalers_micro: getMayorFee("Wholesalers/Retailers/Dealers", "MICRO", 500),
        mayors_wholesalers_small: getMayorFee("Wholesalers/Retailers/Dealers", "SMALL", 900),
        mayors_wholesalers_medium: getMayorFee("Wholesalers/Retailers/Dealers", "MEDIUM", 1100),
        mayors_wholesalers_large: getMayorFee("Wholesalers/Retailers/Dealers", "LARGE", 1600),

        mayors_others_micro: getMayorFee("Other Businesses", "MICRO", 500),
        mayors_others_small: getMayorFee("Other Businesses", "SMALL", 700),
        mayors_others_medium: getMayorFee("Other Businesses", "MEDIUM", 900),
        mayors_others_large: getMayorFee("Other Businesses", "LARGE", 1100),

        // Sanitary Inspection fees
        sanitary_25_50: getSanitaryFee(25, 100),
        sanitary_50_100: getSanitaryFee(50, 150),
        sanitary_100_200: getSanitaryFee(100, 200),
        sanitary_200_500: getSanitaryFee(200, 250),
        sanitary_500_1000: getSanitaryFee(500, 300),
        sanitary_1000_above: getSanitaryFee(1000, 350),

        // Garbage collection fees
        garbage_manufacturers_low: getGarbageFee("manufacturers", "low", 1500),
        garbage_manufacturers_high: getGarbageFee("manufacturers", "high", 2500),
        garbage_hotels_low: getGarbageFee("hotels", "low", 1000),
        garbage_hotels_high: getGarbageFee("hotels", "high", 1500),
        garbage_restaurants_low: getGarbageFee("restaurants", "low", 1000),
        garbage_restaurants_high: getGarbageFee("restaurants", "high", 2000),
        garbage_hospitals_low: getGarbageFee("hospitals", "low", 1000),
        garbage_hospitals_high: getGarbageFee("hospitals", "high", 1500),
        garbage_retail_low: getGarbageFee("others", "low", 800),
        garbage_retail_high: getGarbageFee("others", "high", 1200),
    });

    React.useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    React.useEffect(() => {
        if (!isDirty) return;

        const handleAnchorClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest("a");
            if (target && target.href) {
                const targetUrl = new URL(target.href, window.location.origin);
                const currentUrl = new URL(window.location.href);
                
                if (targetUrl.pathname !== currentUrl.pathname) {
                    const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to leave?");
                    if (!confirmLeave) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                }
            }
        };

        document.addEventListener("click", handleAnchorClick, true);
        return () => document.removeEventListener("click", handleAnchorClick, true);
    }, [isDirty]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const payloadMayors = {
            "Manufacturers/Importers/Producers": {
                MICRO: Number(formState.mayors_manufacturers_micro) || 0,
                SMALL: Number(formState.mayors_manufacturers_small) || 0,
                MEDIUM: Number(formState.mayors_manufacturers_medium) || 0,
                LARGE: Number(formState.mayors_manufacturers_large) || 0
            },
            "Banks (Universal)": {
                MICRO: 0, SMALL: 0, MEDIUM: 0,
                LARGE: Number(formState.mayors_banks_universal_large) || 0
            },
            "Banks (Commercial/Development)": {
                MICRO: 0, SMALL: 0, MEDIUM: 0,
                LARGE: Number(formState.mayors_banks_commercial_large) || 0
            },
            "Banks (Rural/Thrift/Savings)": {
                MICRO: 0, SMALL: 0, MEDIUM: 0,
                LARGE: Number(formState.mayors_banks_rural_large) || 0
            },
            "Other Financial Institutions": {
                MICRO: Number(formState.mayors_financial_micro) || 0,
                SMALL: Number(formState.mayors_financial_small) || 0,
                MEDIUM: Number(formState.mayors_financial_medium) || 0,
                LARGE: Number(formState.mayors_financial_large) || 0
            },
            "Contractors/Service Establishments": {
                MICRO: Number(formState.mayors_contractors_micro) || 0,
                SMALL: Number(formState.mayors_contractors_small) || 0,
                MEDIUM: Number(formState.mayors_contractors_medium) || 0,
                LARGE: Number(formState.mayors_contractors_large) || 0
            },
            "Wholesalers/Retailers/Dealers": {
                MICRO: Number(formState.mayors_wholesalers_micro) || 0,
                SMALL: Number(formState.mayors_wholesalers_small) || 0,
                MEDIUM: Number(formState.mayors_wholesalers_medium) || 0,
                LARGE: Number(formState.mayors_wholesalers_large) || 0
            },
            "Other Businesses": {
                MICRO: Number(formState.mayors_others_micro) || 0,
                SMALL: Number(formState.mayors_others_small) || 0,
                MEDIUM: Number(formState.mayors_others_medium) || 0,
                LARGE: Number(formState.mayors_others_large) || 0
            }
        };

        const payloadSanitary = [
            { minArea: 1000, fee: Number(formState.sanitary_1000_above) || 0 },
            { minArea: 500, fee: Number(formState.sanitary_500_1000) || 0 },
            { minArea: 200, fee: Number(formState.sanitary_200_500) || 0 },
            { minArea: 100, fee: Number(formState.sanitary_100_200) || 0 },
            { minArea: 50, fee: Number(formState.sanitary_50_100) || 0 },
            { minArea: 25, fee: Number(formState.sanitary_25_50) || 0 }
        ];

        const payloadGarbage = {
            manufacturers: { threshold: 100, low: Number(formState.garbage_manufacturers_low) || 0, high: Number(formState.garbage_manufacturers_high) || 0 },
            hotels: { threshold: 100, low: Number(formState.garbage_hotels_low) || 0, high: Number(formState.garbage_hotels_high) || 0 },
            restaurants: { threshold: 50, low: Number(formState.garbage_restaurants_low) || 0, high: Number(formState.garbage_restaurants_high) || 0 },
            hospitals: { threshold: 10, low: Number(formState.garbage_hospitals_low) || 0, high: Number(formState.garbage_hospitals_high) || 0 },
            others: { threshold: 10, low: Number(formState.garbage_retail_low) || 0, high: Number(formState.garbage_retail_high) || 0 }
        };

        const payload = {
            bplo_tax_rate_new: toDecimal(formState.bplo_tax_rate_new),
            bplo_health_card_fee: String(parseFloat(formState.bplo_health_card_fee) || 0),
            bplo_mayors_tax_clearance_fee: String(parseFloat(formState.bplo_mayors_tax_clearance_fee) || 0),
            bplo_retail_tax_rate_low: toDecimal(formState.bplo_retail_tax_rate_low),
            bplo_retail_tax_rate_high: toDecimal(formState.bplo_retail_tax_rate_high),
            bplo_manufacturer_tax_rate: toDecimal(formState.bplo_manufacturer_tax_rate),
            bplo_wholesaler_tax_rate: toDecimal(formState.bplo_wholesaler_tax_rate),
            bplo_mayors_permit_matrix: JSON.stringify(payloadMayors),
            bplo_sanitary_fee_matrix: JSON.stringify(payloadSanitary),
            bplo_garbage_fee_matrix: JSON.stringify(payloadGarbage),
        };

        try {
            const res = await saveBploSettingsAction(payload);
            if (res.success) {
                toast.success("BPLO calculator settings updated successfully!");
                setIsDirty(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to save settings.");
            }
        } catch {
            toast.error("An unexpected error occurred.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-[1400px] mx-auto w-full px-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </button>
                    <div className="space-y-0.5 text-left">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary italic" style={{ color: themeColor }}>Calculator Parameters</span>
                        <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
                            BPLO Calculator Configuration
                        </h2>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* General Fees Card */}
                    <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <Building2 className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">General Fees & Taxes</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Health Certificate Card Fee (₱)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    name="bplo_health_card_fee"
                                    value={formState.bplo_health_card_fee}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl text-xs font-bold font-mono"
                                />
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-wider">Fee charged per employee card application.</p>
                            </div>

                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mayor&apos;s / Tax Clearance Fee (₱)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    name="bplo_mayors_tax_clearance_fee"
                                    value={formState.bplo_mayors_tax_clearance_fee}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl text-xs font-bold font-mono"
                                />
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-wider">Clearance Fee charged for both New and Renewal applications.</p>
                            </div>

                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Initial Business Tax Rate (%)</Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    name="bplo_tax_rate_new"
                                    value={formState.bplo_tax_rate_new}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl text-xs font-bold font-mono"
                                />
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-wider">Tax percentage for newly-started businesses based on capitalization.</p>
                            </div>
                        </div>
                    </div>

                    {/* Graduated Tax Parameters */}
                    <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <HelpCircle className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">Graduated Tax Constants</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Retailer Low Gross Tax Rate (%)</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    name="bplo_retail_tax_rate_low"
                                    value={formState.bplo_retail_tax_rate_low}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl text-xs font-bold font-mono"
                                />
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-wider">Tax applied to retailers with gross sales &lt;= ₱400,000.</p>
                            </div>

                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Retailer High Gross Tax Rate (%)</Label>
                                <Input
                                    type="number"
                                    step="0.001"
                                    name="bplo_retail_tax_rate_high"
                                    value={formState.bplo_retail_tax_rate_high}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl text-xs font-bold font-mono"
                                />
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-wider">Tax applied to retailers with gross sales &gt; ₱400,000.</p>
                            </div>

                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Manufacturers Large Scale Rate (%)</Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    name="bplo_manufacturer_tax_rate"
                                    value={formState.bplo_manufacturer_tax_rate}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl text-xs font-bold font-mono"
                                />
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-wider">Tax applied to manufacturers with gross sales &gt;= ₱6.5M.</p>
                            </div>

                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Wholesalers Large Scale Rate (%)</Label>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    name="bplo_wholesaler_tax_rate"
                                    value={formState.bplo_wholesaler_tax_rate}
                                    onChange={handleChange}
                                    required
                                    className="h-12 rounded-xl text-xs font-bold font-mono"
                                />
                                <p className="text-[9px] text-slate-400 font-bold italic uppercase tracking-wider">Tax applied to wholesalers with gross sales &gt;= ₱2.0M.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mayor's Permit Scale Brackets */}
                <div className="grid grid-cols-1 gap-8 mt-8">
                    <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <Building2 className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">Mayor&apos;s Permit Scale Fee Brackets</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                            {/* Manufacturers */}
                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-black/20 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary" style={{ color: themeColor }}>Manufacturers & Producers</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Micro (₱)</Label>
                                        <Input type="number" step="1" name="mayors_manufacturers_micro" value={formState.mayors_manufacturers_micro} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Small (₱)</Label>
                                        <Input type="number" step="1" name="mayors_manufacturers_small" value={formState.mayors_manufacturers_small} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Medium (₱)</Label>
                                        <Input type="number" step="1" name="mayors_manufacturers_medium" value={formState.mayors_manufacturers_medium} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Large (₱)</Label>
                                        <Input type="number" step="1" name="mayors_manufacturers_large" value={formState.mayors_manufacturers_large} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Financial Institutions */}
                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-black/20 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary" style={{ color: themeColor }}>Other Financial Institutions</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Micro (₱)</Label>
                                        <Input type="number" step="1" name="mayors_financial_micro" value={formState.mayors_financial_micro} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Small (₱)</Label>
                                        <Input type="number" step="1" name="mayors_financial_small" value={formState.mayors_financial_small} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Medium (₱)</Label>
                                        <Input type="number" step="1" name="mayors_financial_medium" value={formState.mayors_financial_medium} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Large (₱)</Label>
                                        <Input type="number" step="1" name="mayors_financial_large" value={formState.mayors_financial_large} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Contractors */}
                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-black/20 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary" style={{ color: themeColor }}>Contractors & Services</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Micro (₱)</Label>
                                        <Input type="number" step="1" name="mayors_contractors_micro" value={formState.mayors_contractors_micro} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Small (₱)</Label>
                                        <Input type="number" step="1" name="mayors_contractors_small" value={formState.mayors_contractors_small} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Medium (₱)</Label>
                                        <Input type="number" step="1" name="mayors_contractors_medium" value={formState.mayors_contractors_medium} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Large (₱)</Label>
                                        <Input type="number" step="1" name="mayors_contractors_large" value={formState.mayors_contractors_large} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Wholesalers & Dealers */}
                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-black/20 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary" style={{ color: themeColor }}>Wholesalers & Dealers</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Micro (₱)</Label>
                                        <Input type="number" step="1" name="mayors_wholesalers_micro" value={formState.mayors_wholesalers_micro} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Small (₱)</Label>
                                        <Input type="number" step="1" name="mayors_wholesalers_small" value={formState.mayors_wholesalers_small} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Medium (₱)</Label>
                                        <Input type="number" step="1" name="mayors_wholesalers_medium" value={formState.mayors_wholesalers_medium} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Large (₱)</Label>
                                        <Input type="number" step="1" name="mayors_wholesalers_large" value={formState.mayors_wholesalers_large} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Other Businesses */}
                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-black/20 space-y-4">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary" style={{ color: themeColor }}>Other General Businesses</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Micro (₱)</Label>
                                        <Input type="number" step="1" name="mayors_others_micro" value={formState.mayors_others_micro} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Small (₱)</Label>
                                        <Input type="number" step="1" name="mayors_others_small" value={formState.mayors_others_small} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Medium (₱)</Label>
                                        <Input type="number" step="1" name="mayors_others_medium" value={formState.mayors_others_medium} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Large (₱)</Label>
                                        <Input type="number" step="1" name="mayors_others_large" value={formState.mayors_others_large} onChange={handleChange} required className="h-10 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                </div>
                            </div>

                            {/* Banks */}
                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-black/20 space-y-4 flex flex-col justify-between">
                                <h4 className="text-xs font-black uppercase tracking-wider text-primary" style={{ color: themeColor }}>Banking Institutions (Large Scale Fee)</h4>
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Universal Banks (₱)</Label>
                                        <Input type="number" step="1" name="mayors_banks_universal_large" value={formState.mayors_banks_universal_large} onChange={handleChange} required className="h-9 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Commercial Banks (₱)</Label>
                                        <Input type="number" step="1" name="mayors_banks_commercial_large" value={formState.mayors_banks_commercial_large} onChange={handleChange} required className="h-9 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                    <div>
                                        <Label className="text-[8px] font-black uppercase text-slate-400">Rural/Thrift/Savings (₱)</Label>
                                        <Input type="number" step="1" name="mayors_banks_rural_large" value={formState.mayors_banks_rural_large} onChange={handleChange} required className="h-9 text-xs font-bold font-mono rounded-lg mt-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Surcharges: Sanitary & Garbage */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                    {/* Sanitary Area Brackets */}
                    <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <HelpCircle className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">Sanitary Inspection Area Brackets</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[8px] font-black uppercase text-slate-400">25 to &lt; 50 sqm (₱)</Label>
                                <Input type="number" step="1" name="sanitary_25_50" value={formState.sanitary_25_50} onChange={handleChange} required className="h-11 text-xs font-bold font-mono rounded-xl mt-1" />
                            </div>
                            <div>
                                <Label className="text-[8px] font-black uppercase text-slate-400">50 to &lt; 100 sqm (₱)</Label>
                                <Input type="number" step="1" name="sanitary_50_100" value={formState.sanitary_50_100} onChange={handleChange} required className="h-11 text-xs font-bold font-mono rounded-xl mt-1" />
                            </div>
                            <div>
                                <Label className="text-[8px] font-black uppercase text-slate-400">100 to &lt; 200 sqm (₱)</Label>
                                <Input type="number" step="1" name="sanitary_100_200" value={formState.sanitary_100_200} onChange={handleChange} required className="h-11 text-xs font-bold font-mono rounded-xl mt-1" />
                            </div>
                            <div>
                                <Label className="text-[8px] font-black uppercase text-slate-400">200 to &lt; 500 sqm (₱)</Label>
                                <Input type="number" step="1" name="sanitary_200_500" value={formState.sanitary_200_500} onChange={handleChange} required className="h-11 text-xs font-bold font-mono rounded-xl mt-1" />
                            </div>
                            <div>
                                <Label className="text-[8px] font-black uppercase text-slate-400">500 to &lt; 1,000 sqm (₱)</Label>
                                <Input type="number" step="1" name="sanitary_500_1000" value={formState.sanitary_500_1000} onChange={handleChange} required className="h-11 text-xs font-bold font-mono rounded-xl mt-1" />
                            </div>
                            <div>
                                <Label className="text-[8px] font-black uppercase text-slate-400">1,000 sqm & above (₱)</Label>
                                <Input type="number" step="1" name="sanitary_1000_above" value={formState.sanitary_1000_above} onChange={handleChange} required className="h-11 text-xs font-bold font-mono rounded-xl mt-1" />
                            </div>
                        </div>
                    </div>

                    {/* Garbage Brackets */}
                    <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <HelpCircle className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">Garbage Collection Category Rates</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">Manufacturers</h4>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Threshold: 100 sqm</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" step="1" name="garbage_manufacturers_low" value={formState.garbage_manufacturers_low} onChange={handleChange} required placeholder="Low" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                    <Input type="number" step="1" name="garbage_manufacturers_high" value={formState.garbage_manufacturers_high} onChange={handleChange} required placeholder="High" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">Hotels & Apartments</h4>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Threshold: 100 sqm</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" step="1" name="garbage_hotels_low" value={formState.garbage_hotels_low} onChange={handleChange} required placeholder="Low" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                    <Input type="number" step="1" name="garbage_hotels_high" value={formState.garbage_hotels_high} onChange={handleChange} required placeholder="High" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">Restaurants & Eateries</h4>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Threshold: 50 sqm</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" step="1" name="garbage_restaurants_low" value={formState.garbage_restaurants_low} onChange={handleChange} required placeholder="Low" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                    <Input type="number" step="1" name="garbage_restaurants_high" value={formState.garbage_restaurants_high} onChange={handleChange} required placeholder="High" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">Hospitals & Clinics</h4>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Threshold: 10 sqm</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" step="1" name="garbage_hospitals_low" value={formState.garbage_hospitals_low} onChange={handleChange} required placeholder="Low" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                    <Input type="number" step="1" name="garbage_hospitals_high" value={formState.garbage_hospitals_high} onChange={handleChange} required placeholder="High" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-slate-800 dark:text-slate-200">Retail & Other Stores</h4>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">Threshold: 10 sqm</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" step="1" name="garbage_retail_low" value={formState.garbage_retail_low} onChange={handleChange} required placeholder="Low" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                    <Input type="number" step="1" name="garbage_retail_high" value={formState.garbage_retail_high} onChange={handleChange} required placeholder="High" className="h-9 text-xs font-bold font-mono rounded-lg" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-white/5 pt-6 mt-6">
                    <Button
                        type="submit"
                        disabled={saving}
                        className="h-12 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest text-white italic shadow-md gap-2"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving Changes..." : "Save Calculator Parameters"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
