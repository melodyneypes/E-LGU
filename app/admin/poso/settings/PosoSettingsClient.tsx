"use client";

import React, { useState, useTransition } from "react";
import { updatePosoPenaltySettings, updatePosoPortalInfoSettings, POSOPenaltySettings } from "@/app/admin/poso/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Settings, RefreshCw, CheckCircle2, ShieldAlert, Scale,
    Building2, MapPin, Phone, Clock, Mail, Globe
} from "lucide-react";
import { toast } from "sonner";

export default function PosoSettingsClient({
    initialSettings,
    initialPortalInfo,
}: {
    initialSettings: POSOPenaltySettings;
    initialPortalInfo?: {
        posoLocation?: string;
        posoHotline?: string;
        posoHours?: string;
        posoEmail?: string;
        posoFacebook?: string;
    };
}) {
    const [settings, setSettings] = useState<POSOPenaltySettings>(initialSettings);
    const [dueDaysVal, setDueDaysVal] = useState<string>(String(initialSettings.dueDays));
    const [surchargeVal, setSurchargeVal] = useState<string>(String(initialSettings.surchargeRate));
    const [interestVal, setInterestVal] = useState<string>(String(initialSettings.monthlyInterestRate));

    // POSO Public Portal Settings Form States
    const [locationVal, setLocationVal] = useState<string>(initialPortalInfo?.posoLocation || "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines");
    const [hotlineVal, setHotlineVal] = useState<string>(initialPortalInfo?.posoHotline || "(075) 529-XXXX / +63 917 123 4567");
    const [hoursVal, setHoursVal] = useState<string>(initialPortalInfo?.posoHours || "Monday - Friday: 8:00 AM - 5:00 PM");
    const [emailVal, setEmailVal] = useState<string>(initialPortalInfo?.posoEmail || "poso@mapandan.gov.ph");
    const [facebookVal, setFacebookVal] = useState<string>(initialPortalInfo?.posoFacebook || "https://facebook.com/MapandanPOSO");

    const [isPending, startTransition] = useTransition();
    const [isPendingPortal, startTransitionPortal] = useTransition();

    const handleSavePenaltySettings = () => {
        const parsedDays = parseInt(dueDaysVal, 10);
        const parsedSurcharge = parseFloat(surchargeVal);
        const parsedInterest = parseFloat(interestVal);

        if (isNaN(parsedDays) || parsedDays < 1) {
            toast.error("Please enter a valid grace period (minimum 1 day).");
            return;
        }

        if (isNaN(parsedSurcharge) || parsedSurcharge < 0 || parsedSurcharge > 100) {
            toast.error("Please enter a valid late surcharge percentage (0% to 100%).");
            return;
        }

        if (isNaN(parsedInterest) || parsedInterest < 0 || parsedInterest > 100) {
            toast.error("Please enter a valid monthly interest percentage (0% to 100%).");
            return;
        }

        startTransition(async () => {
            try {
                const res = await updatePosoPenaltySettings({
                    dueDays: parsedDays,
                    surchargeRate: parsedSurcharge,
                    monthlyInterestRate: parsedInterest,
                });

                if (res.success) {
                    setSettings({
                        dueDays: parsedDays,
                        surchargeRate: parsedSurcharge,
                        monthlyInterestRate: parsedInterest,
                    });
                    toast.success("POSO Citation penalty settings & grace period updated!");
                } else {
                    toast.error(res.error || "Failed to update penalty settings.");
                }
            } catch {
                toast.error("An error occurred while updating settings.");
            }
        });
    };

    const handleSavePortalInfo = () => {
        if (!locationVal.trim()) {
            toast.error("Please enter POSO office location.");
            return;
        }
        if (!hotlineVal.trim()) {
            toast.error("Please enter POSO hotline number.");
            return;
        }
        if (!hoursVal.trim()) {
            toast.error("Please enter office operating hours.");
            return;
        }
        if (!emailVal.trim()) {
            toast.error("Please enter official POSO email.");
            return;
        }

        startTransitionPortal(async () => {
            try {
                const res = await updatePosoPortalInfoSettings({
                    location: locationVal,
                    hotline: hotlineVal,
                    operatingHours: hoursVal,
                    officialEmail: emailVal,
                    facebookUrl: facebookVal,
                });

                if (res.success) {
                    toast.success("Public POSO Portal Office settings successfully updated!");
                } else {
                    toast.error(res.error || "Failed to update POSO portal info settings.");
                }
            } catch {
                toast.error("An error occurred while updating POSO portal settings.");
            }
        });
    };

    // Live preview computation example for a ₱1,000 fine overdue by 1 month
    const sampleFine = 1000;
    const previewSurcharge = (sampleFine * (parseFloat(surchargeVal) || 0)) / 100;
    const previewInterest = (sampleFine * ((parseFloat(interestVal) || 0) / 100)) * 1;
    const previewGrandTotal = sampleFine + previewSurcharge + previewInterest;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040] pb-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Settings className="mr-3 w-10 h-10 text-rose-600" />
                        POSO Department Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Configure POSO public portal contact details, citation grace period, and late payment surcharges.
                    </p>
                </div>
            </div>

            {/* Public POSO Portal Contact & Info Settings Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] p-6 md:p-8 shadow-xl space-y-6">
                <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-600">
                        <Building2 className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            Public POSO Portal Office Information Settings
                        </h2>
                        <p className="text-xs text-slate-500 font-medium italic">
                            Configure contact info displayed on public ticket lookup portal (/poso/mapandan)
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    {/* Location Input */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-rose-600" /> POSO Office Location / Address
                        </label>
                        <Input
                            type="text"
                            value={locationVal}
                            onChange={(e) => setLocationVal(e.target.value)}
                            placeholder="e.g. Municipal Hall Complex, Poblacion, Mapandan, Pangasinan"
                            className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 text-sm font-medium"
                        />
                    </div>

                    {/* Hotline Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-rose-600" /> POSO Emergency Hotline
                        </label>
                        <Input
                            type="text"
                            value={hotlineVal}
                            onChange={(e) => setHotlineVal(e.target.value)}
                            placeholder="e.g. (075) 529-XXXX / +63 917 123 4567"
                            className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 text-sm font-mono font-bold"
                        />
                    </div>

                    {/* Operating Hours Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-rose-600" /> Office Operating Hours
                        </label>
                        <Input
                            type="text"
                            value={hoursVal}
                            onChange={(e) => setHoursVal(e.target.value)}
                            placeholder="e.g. Monday - Friday: 8:00 AM - 5:00 PM"
                            className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 text-sm font-medium"
                        />
                    </div>

                    {/* Official Email Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-rose-600" /> POSO Official Email
                        </label>
                        <Input
                            type="email"
                            value={emailVal}
                            onChange={(e) => setEmailVal(e.target.value)}
                            placeholder="e.g. poso@mapandan.gov.ph"
                            className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 text-sm font-medium"
                        />
                    </div>

                    {/* Facebook Page Link Input */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Globe className="w-4 h-4 text-rose-600" /> Facebook Page URL
                        </label>
                        <Input
                            type="url"
                            value={facebookVal}
                            onChange={(e) => setFacebookVal(e.target.value)}
                            placeholder="e.g. https://facebook.com/MapandanPOSO"
                            className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 text-sm font-medium"
                        />
                    </div>
                </div>

                <Button
                    onClick={handleSavePortalInfo}
                    disabled={isPendingPortal}
                    className="w-full h-12 bg-rose-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-4"
                >
                    {isPendingPortal ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    <span>Save POSO Public Portal Settings</span>
                </Button>
            </div>

            {/* Main Penalty Policy Settings Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] p-6 md:p-8 shadow-xl space-y-6">
                <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-600">
                        <Scale className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            Overdue Citation Penalty & Surcharge Policy
                        </h2>
                        <p className="text-xs text-slate-500 font-medium italic">
                            Mapandan Local Revenue Code & Republic Act 7160 Municipal Ordinance Settings
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Settings Input Form */}
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Citation Grace Period (Days)
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={365}
                                value={dueDaysVal}
                                onChange={(e) => setDueDaysVal(e.target.value)}
                                className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 font-mono text-base"
                            />
                            <p className="text-[11px] text-slate-400 italic">
                                Standard period before citation becomes overdue (Default: 7 days).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Late Payment Surcharge Rate (%)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={surchargeVal}
                                onChange={(e) => setSurchargeVal(e.target.value)}
                                className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 font-mono text-base"
                            />
                            <p className="text-[11px] text-slate-400 italic">
                                Mandatory one-time penalty surcharge for overdue citations under RA 7160 (Default: 25%).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Monthly Interest Rate (%)
                            </label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.1}
                                value={interestVal}
                                onChange={(e) => setInterestVal(e.target.value)}
                                className="bg-slate-50 dark:bg-[#0c111d] border-slate-200 dark:border-[#2a3040] text-slate-900 dark:text-white h-12 font-mono text-base"
                            />
                            <p className="text-[11px] text-slate-400 italic">
                                Monthly compounding interest accrued per overdue month (Default: 2%).
                            </p>
                        </div>

                        <Button
                            onClick={handleSavePenaltySettings}
                            disabled={isPending}
                            className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-2"
                        >
                            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Save Policy Configurations</span>
                        </Button>
                    </div>

                    {/* Live Calculator Preview Box */}
                    <div className="p-6 bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-slate-200 dark:border-[#2a3040] space-y-4">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 pb-2 border-b border-slate-200 dark:border-white/10">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                            <span className="font-black text-xs uppercase tracking-wider">Live Computation Preview</span>
                        </div>

                        <div className="space-y-2 text-xs font-semibold">
                            <p className="text-[11px] text-slate-500 italic">
                                Sample calculation for a <strong>₱1,000.00</strong> citation fine overdue by 1 month:
                            </p>
                            <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                                    <span>Base Fine Subtotal:</span>
                                    <span className="font-mono font-bold">₱1,000.00</span>
                                </div>
                                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                                    <span>+ Late Penalty ({surchargeVal || 0}%):</span>
                                    <span className="font-mono font-bold">₱{previewSurcharge.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-purple-600 dark:text-purple-400">
                                    <span>+ Accrued Interest (1 Mo @ {interestVal || 0}%):</span>
                                    <span className="font-mono font-bold">₱{previewInterest.toFixed(2)}</span>
                                </div>
                                <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex justify-between font-black text-rose-600 dark:text-rose-400 text-sm">
                                    <span>Total Payable:</span>
                                    <span className="font-mono">₱{previewGrandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        </div>

                        <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200 dark:border-white/5">
                            * Active settings ({settings.dueDays}d grace period, {settings.surchargeRate}% surcharge, {settings.monthlyInterestRate}% interest) will apply to all Treasury cashier settlements.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
