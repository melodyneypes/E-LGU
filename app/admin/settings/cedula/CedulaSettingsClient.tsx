"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, ArrowLeft, Percent, Coins, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { saveCedulaSettingsAction } from "./actions";

interface CedulaSettingsClientProps {
    initialSettings: Record<string, string>;
    themeColor: string;
}

export function CedulaSettingsClient({ initialSettings, themeColor }: CedulaSettingsClientProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Helpers to convert decimals to percentages and vice-versa
    const toPercent = (val: string) => String(parseFloat((parseFloat(val) * 100).toFixed(4)));
    const toDecimal = (val: string) => String(parseFloat(val) / 100);

    const [formState, setFormState] = useState({
        cedula_basic_tax_individual: initialSettings.cedula_basic_tax_individual,
        cedula_basic_tax_juridical: initialSettings.cedula_basic_tax_juridical,
        cedula_additional_tax_rate_individual: initialSettings.cedula_additional_tax_rate_individual,
        cedula_additional_tax_rate_juridical: initialSettings.cedula_additional_tax_rate_juridical,
        cedula_cap_individual: initialSettings.cedula_cap_individual,
        cedula_cap_juridical: initialSettings.cedula_cap_juridical,
        cedula_penalty_rate_monthly: toPercent(initialSettings.cedula_penalty_rate_monthly)
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                cedula_basic_tax_individual: String(parseFloat(formState.cedula_basic_tax_individual) || 0),
                cedula_basic_tax_juridical: String(parseFloat(formState.cedula_basic_tax_juridical) || 0),
                cedula_additional_tax_rate_individual: String(parseFloat(formState.cedula_additional_tax_rate_individual) || 0),
                cedula_additional_tax_rate_juridical: String(parseFloat(formState.cedula_additional_tax_rate_juridical) || 0),
                cedula_cap_individual: String(parseFloat(formState.cedula_cap_individual) || 0),
                cedula_cap_juridical: String(parseFloat(formState.cedula_cap_juridical) || 0),
                cedula_penalty_rate_monthly: toDecimal(formState.cedula_penalty_rate_monthly)
            };

            const res = await saveCedulaSettingsAction(payload);
            if (res.success) {
                toast.success("Cedula parameters saved successfully!");
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
                            Cedula Calculator Configuration
                        </h2>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Individual Parameters Card */}
                    <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <Landmark className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">Individual Tax Parameters</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">Basic Tax (Individual)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        name="cedula_basic_tax_individual"
                                        value={formState.cedula_basic_tax_individual}
                                        onChange={handleChange}
                                        className="pl-8 h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">The base community tax fee for citizens.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">Additional Tax Rate (Individual)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        name="cedula_additional_tax_rate_individual"
                                        value={formState.cedula_additional_tax_rate_individual}
                                        onChange={handleChange}
                                        className="pl-8 h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Peso additional tax fee assessed for every ₱1,000 of income or property value.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">Maximum Total Tax Cap (Individual)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        name="cedula_cap_individual"
                                        value={formState.cedula_cap_individual}
                                        onChange={handleChange}
                                        className="pl-8 h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">The maximum allowable combined tax due (Basic + Additional + Penalty) for individuals.</p>
                            </div>
                        </div>
                    </div>

                    {/* Juridical Parameters Card */}
                    <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <Coins className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">Juridical Tax Parameters</h3>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">Basic Tax (Juridical)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        name="cedula_basic_tax_juridical"
                                        value={formState.cedula_basic_tax_juridical}
                                        onChange={handleChange}
                                        className="pl-8 h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">The base community tax fee for corporations/entities.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">Additional Tax Rate (Juridical)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        name="cedula_additional_tax_rate_juridical"
                                        value={formState.cedula_additional_tax_rate_juridical}
                                        onChange={handleChange}
                                        className="pl-8 h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Peso additional tax fee assessed for every ₱5,000 of income or property value.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">Maximum Total Tax Cap (Juridical)</Label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        name="cedula_cap_juridical"
                                        value={formState.cedula_cap_juridical}
                                        onChange={handleChange}
                                        className="pl-8 h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">The maximum allowable combined tax due (Basic + Additional + Penalty) for corporate entities.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Common Penalty Settings Card */}
                <div className="bg-white dark:bg-[#11131a] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden max-w-[680px]">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                        <Percent className="w-5 h-5 text-primary" style={{ color: themeColor }} />
                        <h3 className="text-sm font-black uppercase italic tracking-wider text-slate-800 dark:text-white">Late Filing Penalties</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-400">Monthly Penalty Interest Rate</Label>
                            <div className="relative">
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    name="cedula_penalty_rate_monthly"
                                    value={formState.cedula_penalty_rate_monthly}
                                    onChange={handleChange}
                                    className="pr-8 h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-sm text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">The percentage penalty accrued monthly on unpaid Cedula tax after the March 1st deadline (e.g. 2%).</p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pr-2">
                    <Button
                        type="submit"
                        disabled={!isDirty || saving}
                        className="px-6 h-12 rounded-xl font-bold flex items-center gap-2 text-white bg-primary hover:bg-primary/90 transition-all shadow-md"
                        style={{ backgroundColor: themeColor }}
                    >
                        <Save className="w-4 h-4" />
                        {saving ? "Saving Changes..." : "Save Configuration"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
