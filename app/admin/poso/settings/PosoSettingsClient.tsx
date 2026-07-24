"use client";

import React, { useState, useTransition } from "react";
import { updatePosoPenaltySettings, POSOPenaltySettings } from "@/app/admin/poso/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, History, RefreshCw, CheckCircle2, ShieldAlert, Percent, Scale } from "lucide-react";
import { toast } from "sonner";

export default function PosoSettingsClient({
    initialSettings,
}: {
    initialSettings: POSOPenaltySettings;
}) {
    const [settings, setSettings] = useState<POSOPenaltySettings>(initialSettings);
    const [dueDaysVal, setDueDaysVal] = useState<string>(String(initialSettings.dueDays));
    const [surchargeVal, setSurchargeVal] = useState<string>(String(initialSettings.surchargeRate));
    const [interestVal, setInterestVal] = useState<string>(String(initialSettings.monthlyInterestRate));
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
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

    // Live preview computation example for a ₱1,000 fine overdue by 1 month
    const sampleFine = 1000;
    const previewSurcharge = (sampleFine * (parseFloat(surchargeVal) || 0)) / 100;
    const previewInterest = (sampleFine * ((parseFloat(interestVal) || 0) / 100)) * 1;
    const previewGrandTotal = sampleFine + previewSurcharge + previewInterest;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040] pb-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Settings className="mr-3 w-10 h-10 text-rose-600" />
                        POSO Department Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Configure citation grace period, late payment surcharges, and monthly interest rates (RA 7160).
                    </p>
                </div>
            </div>

            {/* Main Policy Card */}
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Inputs Column */}
                    <div className="lg:col-span-2 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Grace Period Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5 text-rose-600" />
                                    Grace Period
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={dueDaysVal}
                                        onChange={(e) => setDueDaysVal(e.target.value)}
                                        placeholder="7"
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-base rounded-xl pr-12"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        Days
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 italic">
                                    Days before ticket becomes OVERDUE.
                                </p>
                            </div>

                            {/* Surcharge Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                                    Late Penalty Rate
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={100}
                                        value={surchargeVal}
                                        onChange={(e) => setSurchargeVal(e.target.value)}
                                        placeholder="25"
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-base rounded-xl pr-10"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        %
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 italic">
                                    One-time penalty rate (Standard: 25%).
                                </p>
                            </div>

                            {/* Monthly Interest Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Percent className="w-3.5 h-3.5 text-purple-600" />
                                    Monthly Interest
                                </label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={100}
                                        value={interestVal}
                                        onChange={(e) => setInterestVal(e.target.value)}
                                        placeholder="2"
                                        className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-base rounded-xl pr-14"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                        %/Mo
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 italic">
                                    Accrued interest per month (Standard: 2%).
                                </p>
                            </div>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={isPending}
                            className="w-full h-12 bg-rose-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all mt-2"
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
