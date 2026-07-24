"use client";

import React, { useState, useTransition } from "react";
import { updatePosoDueDaysSetting } from "@/app/admin/poso/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, History, RefreshCw, CheckCircle2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function PosoSettingsClient({
    initialDueDays,
}: {
    initialDueDays: number;
}) {
    const [dueDays, setDueDays] = useState<number>(initialDueDays);
    const [inputVal, setInputVal] = useState<string>(String(initialDueDays));
    const [isPending, startTransition] = useTransition();

    const handleSave = () => {
        const parsed = parseInt(inputVal, 10);
        if (isNaN(parsed) || parsed < 1) {
            toast.error("Please enter a valid number of days (minimum 1 day).");
            return;
        }

        startTransition(async () => {
            try {
                const res = await updatePosoDueDaysSetting(parsed);
                if (res.success) {
                    setDueDays(parsed);
                    toast.success(`POSO Citation grace period updated to ${parsed} days!`);
                } else {
                    toast.error(res.error || "Failed to update setting.");
                }
            } catch {
                toast.error("Failed to update setting.");
            }
        });
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040] pb-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Settings className="mr-3 w-10 h-10 text-rose-600" />
                        POSO Department Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Manage system parameters and citation fine enforcement rules for Public Order & Safety Office.
                    </p>
                </div>
            </div>

            {/* Citation Due Days Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] p-6 md:p-8 shadow-xl space-y-6">
                <div className="flex items-center space-x-3.5 pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                    <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-600">
                        <History className="w-6 h-6 stroke-[2]" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            Traffic Citation Grace Period & Due Date
                        </h2>
                        <p className="text-xs text-slate-500 font-medium italic">
                            Configure how many days violators have before their citation fine is flagged as OVERDUE.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                Citation Grace Period (Days)
                            </label>
                            <Input
                                type="number"
                                min={1}
                                max={365}
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                placeholder="7"
                                className="h-12 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-base rounded-xl"
                            />
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={isPending}
                            className="w-full h-12 bg-rose-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all"
                        >
                            {isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            <span>Save Configuration</span>
                        </Button>
                    </div>

                    {/* Preview / Info Box */}
                    <div className="p-6 bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-slate-200 dark:border-[#2a3040] space-y-3">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                            <ShieldAlert className="w-5 h-5 shrink-0" />
                            <span className="font-black text-xs uppercase tracking-wider">Active Policy Rules</span>
                        </div>
                        <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300 font-medium">
                            <p>
                                Currently, citations have a <strong>{dueDays}-day grace period</strong>.
                            </p>
                            <p className="italic text-slate-500">
                                Example: A ticket issued on August 1st will automatically mark as <strong className="text-rose-600">OVERDUE</strong> on August {1 + dueDays}th if unpaid.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
