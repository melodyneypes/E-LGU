import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft,
    Activity,
    CheckCircle2
} from "lucide-react";

export default function RHUTransactionDetailLoading() {
    return (
        <div className="p-4 md:p-8 w-full max-w-full space-y-6 pb-20 animate-in fade-in duration-300">
            {/* Top Navigation Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="h-10 px-0 text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to RHU Consultations
                </div>

                <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-44 rounded-xl bg-slate-800/60 dark:bg-white/5 border border-slate-700/50 dark:border-white/10" />
                    <div className="px-4 py-1.5 rounded-full bg-emerald-600/80 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        COMPLETED
                    </div>
                </div>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
                {/* LEFT COLUMN: Main Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Transaction Header Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 md:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic">
                                    TRANSACTION INFORMATION
                                </p>
                                <Skeleton className="h-8 w-64 rounded-xl bg-slate-200 dark:bg-white/10" />
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-11">
                            RURAL HEALTH UNIT • MEDICAL CONSULTATION
                        </p>
                    </Card>

                    {/* Patient Profile & Record Details Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 md:p-8 space-y-6">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic">
                                PATIENT / APPLICANT NAME
                            </p>
                            <Skeleton className="h-8 w-80 rounded-xl bg-slate-200 dark:bg-white/10" />
                        </div>

                        {/* 4-Grid Sub-cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    RELATIONSHIP
                                </p>
                                <Skeleton className="h-4 w-12 rounded bg-slate-200 dark:bg-white/10" />
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    GENDER
                                </p>
                                <Skeleton className="h-4 w-12 rounded bg-slate-200 dark:bg-white/10" />
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    BARANGAY
                                </p>
                                <Skeleton className="h-4 w-24 rounded bg-slate-200 dark:bg-white/10" />
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-2">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    PRIORITY
                                </p>
                                <Skeleton className="h-4 w-16 rounded bg-rose-500/20" />
                            </div>
                        </div>

                        {/* Clinical Symptoms & Schedule Breakdown */}
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-2">
                                    APPOINTMENT DATE &amp; TIME SLOT
                                </p>
                                <Skeleton className="h-5 w-60 rounded bg-rose-500/20" />
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-2">
                                    CHIEF SYMPTOMS / PURPOSE / NOTES
                                </p>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-2">
                                    <Skeleton className="h-4 w-full rounded bg-slate-200 dark:bg-white/10" />
                                    <Skeleton className="h-4 w-3/4 rounded bg-slate-200 dark:bg-white/10" />
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* RIGHT COLUMN: Workflow & Status */}
                <div className="space-y-6">
                    {/* Workflow Progress Stepper Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">
                                RHU WORKFLOW PROGRESS
                            </h3>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                7-STAGE CONSULTATION LIFECYCLE
                            </p>
                        </div>

                        {/* Step Timeline */}
                        <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                            {[
                                "1. APPOINTMENT BOOKED",
                                "2. PATIENT CHECK-IN",
                                "3. IN CONSULTATION",
                                "4. PRESCRIBED & DISPENSED (PENDING PO APPROVAL)",
                                "5. DISPENSED & COMPLETED"
                            ].map((label, index) => (
                                <div key={index} className="flex items-center gap-3 relative z-10">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500 text-white shrink-0 shadow-sm shadow-emerald-500/20">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-black uppercase text-emerald-500">
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Consultation Completed Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 flex flex-col items-center justify-center text-center space-y-3 py-8">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                CONSULTATION COMPLETED
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                RHU CLINICAL CARE FINALIZED
                            </p>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
