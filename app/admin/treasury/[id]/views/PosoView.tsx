"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    AlertCircle,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Check,
    Truck,
    ListChecks,
    Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { TreasuryViewProps } from "./types";
import { confirmPosoTrafficFinePayment } from "@/app/admin/transactions/poso-treasury-actions";
import TreasuryPaymentCollectionPanel from "../components/TreasuryPaymentCollectionPanel";

export default function PosoView({
    transaction,
    isTreasuryStaff,
    backUrl,
    actionLoading,
    setActionLoading,
    themeColor = "#f43f5e",
}: TreasuryViewProps) {
    const router = useRouter();
    const [isProfileOpen, setIsProfileOpen] = useState(true);

    const additional = (transaction?.additionalData as any) || {};
    const resident = (transaction?.residentSnapshot as any) || {};
    const fiscal = (transaction?.fiscalSnapshot as any) || {};

    const ticketsBreakdown: any[] = additional?.ticketsBreakdown || [];
    const ticketNumbers: string[] = additional?.ticketNumbers || (additional?.ticketNo ? [additional.ticketNo] : []);
    const violations: any[] = additional?.violations || [];
    const impoundDetails: any[] = additional?.impoundDetails || [];

    const hasCheckIn = Boolean(
        additional?.checkInData ||
        additional?.checkedInAt ||
        additional?.checkIn ||
        additional?.kioskCheckIn ||
        additional?.queueData ||
        additional?.checkInTime
    );

    const [orNumberInput, setOrNumberInput] = useState(additional?.orNumber || transaction?.paymentReference || "");

    const rawTotal = transaction?.totalAmount || 0;
    const baseFineTotal = fiscal?.baseFineTotal ?? (additional?.violations ? additional.violations.reduce((sum: number, v: any) => sum + Number(v.amount ?? v.fine ?? v.baseFine ?? 0), 0) : rawTotal);
    const impoundFee = fiscal?.impoundFee ?? Number(additional?.impoundFee || 0);

    const pb = additional?.penaltyBreakdown || {};
    const surchargeAmount = fiscal?.surchargeAmount !== undefined ? Number(fiscal.surchargeAmount) : Number(pb?.surchargeAmount || 0);
    const interestAmount = fiscal?.interestAmount !== undefined ? Number(fiscal.interestAmount) : Number(pb?.interestAmount || 0);
    const surchargeRate = pb?.surchargeRate ?? 25;
    const monthlyInterestRate = pb?.monthlyInterestRate ?? 2;
    const monthsOverdue = pb?.monthsOverdue ?? 1;

    const calculatedTotal = baseFineTotal + impoundFee;
    const grandTotal = Math.max(rawTotal, calculatedTotal);
    const displayGrandTotal = grandTotal + surchargeAmount + interestAmount;

    const isPaid = transaction?.isPaid || transaction?.status === "PAID" || transaction?.status === "SETTLED" || transaction?.status === "RELEASED";

    const handleConfirmPayment = async (methodArg?: string, refArg?: string) => {
        const effectiveMethod = (methodArg || "CASH") as "CASH" | "GCASH" | "LANDBANK";
        const effectiveRef = refArg !== undefined ? refArg : "";

        if (!orNumberInput.trim()) {
            toast.error("Official Receipt (OR) Number is required.");
            return;
        }

        if (effectiveMethod !== "CASH" && !effectiveRef.trim()) {
            toast.error(`${effectiveMethod} reference number is required.`);
            return;
        }

        setActionLoading(true);
        try {
            const res = await confirmPosoTrafficFinePayment({
                transactionId: transaction.id,
                orNumber: orNumberInput.trim(),
                paymentMethod: effectiveMethod,
                paymentReference: effectiveMethod !== "CASH" ? effectiveRef.trim() : undefined,
            });

            if (res.success) {
                toast.success("POSO Citation Payment successfully settled!");
                router.push("/admin/treasury?category=POSO");
            } else {
                toast.error(res.error || "Failed to settle POSO payment.");
            }
        } catch {
            toast.error("An unexpected error occurred during payment processing.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            {/* Minimal Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <Link
                    href={backUrl}
                    prefetch={false}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Registry
                </Link>
                <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-rose-500/20 text-rose-500 bg-rose-500/5 px-4 py-1">
                    Type Of Request: {isPaid ? "Paid & Released" : "Processing"}
                </Badge>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {/* LEFT COLUMN: Assessment & Identity */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* TRANSACTION CATEGORY CARD */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-[2rem] p-8 border border-slate-100 dark:border-white/5 shadow-2xl shadow-rose-500/5 relative overflow-hidden group">
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-inner">
                                <AlertCircle className="w-7 h-7" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 block mb-1">
                                    Transaction Information
                                </span>
                                <h1 className="text-2xl md:text-3xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                                    POSO TRAFFIC CITATION - VIOLATION FINE
                                </h1>
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
                                    General Service
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* PRIMARY VIOLATOR PROFILE CARD */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-[2rem] p-8 border border-slate-100 dark:border-white/5 shadow-2xl shadow-rose-500/5 space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">
                                    Primary Applicant Profile
                                </span>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="rounded-full hover:bg-slate-100 dark:hover:bg-white/5"
                            >
                                {isProfileOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                            </Button>
                        </div>

                        {isProfileOpen && (
                            <div className="space-y-8 animate-in fade-in duration-300">
                                <h2 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 dark:text-white">
                                    {resident.fullName || additional.violatorName || "JHON EMIL NILO"}
                                </h2>

                                {/* Stat Grid Cards matching design */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Queue / Reference No.
                                        </span>
                                        <p className="text-sm font-black italic text-rose-600 dark:text-rose-400 font-mono">
                                            {transaction.queueNumber || additional.ticketNo || "POSO Citation"}
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Citation Tickets Count
                                        </span>
                                        <p className="text-sm font-black italic text-slate-800 dark:text-slate-200">
                                            {ticketNumbers.length} ticket(s)
                                        </p>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Total Amount
                                        </span>
                                        <p className="text-xl font-black italic text-rose-500 font-mono">
                                            ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                {/* ITEMIZED CITATION TICKETS & VIOLATION BREAKDOWN */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                                            <ListChecks className="w-4 h-4" /> Itemized Citation Tickets & Violation Breakdown ({ticketNumbers.length})
                                        </span>
                                        <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-black text-[10px]">
                                            {ticketNumbers.length === 1 ? "Single Citation" : `${ticketNumbers.length} Combined Tickets`}
                                        </Badge>
                                    </div>

                                    <div className="space-y-4">
                                        {ticketsBreakdown.length > 0 ? (
                                            ticketsBreakdown.map((tb: any, index: number) => {
                                                const ticketViolations = violations.filter((v: any) => v.ticketNo === tb.ticketNo || !v.ticketNo);
                                                const ticketImpound = impoundDetails.find((i: any) => i.ticketNo === tb.ticketNo) || (tb.isImpounded ? { impoundFee: tb.impoundFee, vehicleClass: additional.vehicleClass, impoundYard: additional.impoundYard } : null);

                                                return (
                                                    <div
                                                        key={tb.ticketId || index}
                                                        className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 space-y-3 shadow-sm"
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-white/5">
                                                            <div className="flex items-center space-x-3">
                                                                <span className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center font-black text-xs">
                                                                    #{index + 1}
                                                                </span>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-mono">
                                                                            {tb.ticketNo}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[11px] text-slate-400 font-semibold block">
                                                                        {additional.officerName ? `Apprehended by: ${additional.officerName}` : "Municipal Traffic Citation"}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                                                    Subtotal: ₱{Number(tb.totalFine || (tb.baseFine + (tb.impoundFee || 0))).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Violation Items List for this ticket */}
                                                        <div className="space-y-2">
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                                Charged Violations:
                                                            </span>
                                                            <div className="space-y-1.5">
                                                                {ticketViolations.length > 0 ? (
                                                                    ticketViolations.map((v: any, vi: number) => {
                                                                        const finePrice = Number(v.amount ?? v.fine ?? v.baseFine ?? v.totalFine ?? 0);
                                                                        const offenseLvl = v.offenseLevel || v.level;

                                                                        return (
                                                                            <div key={vi} className="flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-100 dark:border-white/5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                                                                    <span className="text-slate-800 dark:text-slate-200 font-bold">{v.name}</span>
                                                                                    {offenseLvl && (
                                                                                        <span className="text-[9px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black">
                                                                                            Offense #{offenseLvl}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <span className="font-mono text-slate-900 dark:text-white font-bold">
                                                                                    ₱{finePrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })
                                                                ) : (
                                                                    <div className="text-xs text-slate-400 italic px-2">General Citation Violation</div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Impound Banner if applicable */}
                                                        {(tb.isImpounded || ticketImpound) && (
                                                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200">
                                                                <div className="flex items-center gap-2">
                                                                    <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                                                                    <span>
                                                                        Vehicle Impounded ({ticketImpound?.vehicleClass || additional.vehicleClass || "Standard"})
                                                                    </span>
                                                                </div>
                                                                <span className="font-black text-amber-700 dark:text-amber-300 font-mono">
                                                                    + ₱{Number(ticketImpound?.impoundFee || tb.impoundFee || additional.impoundFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} Impound Fee
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            /* Fallback single ticket view */
                                            <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-3">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                                    Charged Violations Breakdown:
                                                </span>
                                                <div className="space-y-1.5">
                                                    {violations.map((v: any, vi: number) => {
                                                        const finePrice = Number(v.amount ?? v.fine ?? v.baseFine ?? v.totalFine ?? 0);
                                                        const offenseLvl = v.offenseLevel || v.level;

                                                        return (
                                                            <div key={vi} className="flex items-center justify-between text-xs font-semibold px-3 py-2 rounded-xl bg-white dark:bg-[#151b2b] border border-slate-100 dark:border-white/5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                                                                    <span className="text-slate-800 dark:text-slate-200 font-bold">{v.name}</span>
                                                                    {offenseLvl && (
                                                                        <span className="text-[9px] px-2 py-0.5 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black">
                                                                            Offense #{offenseLvl}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span className="font-mono text-slate-900 dark:text-white font-bold">
                                                                    ₱{finePrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tax / Fine Computation Breakdown matching GenericServiceView */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Tax Computation Breakdown
                                    </span>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 italic">
                                            <span>Basic Violation Fine</span>
                                            <span className="font-mono text-slate-800 dark:text-slate-200">
                                                ₱{baseFineTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        {impoundFee > 0 && (
                                            <div className="flex items-center justify-between text-xs font-bold text-amber-500 italic">
                                                <span>Vehicle Impound Fee ({additional.vehicleClass || "Standard Unit"})</span>
                                                <span className="font-mono">
                                                    ₱{impoundFee.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {surchargeAmount > 0 && (
                                            <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 italic">
                                                <span>Late Penalty Fee ({surchargeRate}%)</span>
                                                <span className="font-mono">
                                                    ₱{surchargeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {interestAmount > 0 && (
                                            <div className="flex items-center justify-between text-xs font-bold text-purple-600 dark:text-purple-400 italic">
                                                <span>Accrued Interest ({monthsOverdue} mo @ {monthlyInterestRate}%)</span>
                                                <span className="font-mono">
                                                    ₱{interestAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {surchargeAmount === 0 && interestAmount === 0 && (
                                            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>Penalty Charge</span>
                                                <span className="font-mono text-slate-800 dark:text-slate-200">₱0.00</span>
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                                            <span className="text-base font-black italic uppercase tracking-tight text-slate-900 dark:text-white">
                                                TOTAL AMOUNT
                                            </span>
                                            <span className="text-3xl font-black italic text-rose-500 font-mono tracking-tighter">
                                                ₱{displayGrandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Status Tracking & Action Panel matching GenericServiceView */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    {/* STATUS TRACKING CARD matching GenericServiceView */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-[2rem] p-8 border border-slate-100 dark:border-white/5 shadow-2xl shadow-rose-500/5 space-y-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block">
                            Status Tracking
                        </span>

                        <div className="space-y-6">
                            {/* Step 1: FOR EVALUATION */}
                            <div className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                                    <Check className="w-5 h-5" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-500 italic">
                                    FOR EVALUATION
                                </span>
                            </div>

                            {/* Step 2: FOR PAYMENT */}
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-xs ${
                                    isPaid ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                                }`}>
                                    {isPaid ? <Check className="w-5 h-5" /> : "2"}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-wider italic ${
                                    isPaid ? "text-emerald-500" : "text-rose-500"
                                }`}>
                                    FOR PAYMENT
                                </span>
                            </div>

                            {/* Step 3: PAID */}
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                                    isPaid ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400"
                                }`}>
                                    {isPaid ? <Check className="w-5 h-5" /> : "3"}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-wider italic ${
                                    isPaid ? "text-emerald-500" : "text-slate-400"
                                }`}>
                                    PAID
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ACTION BUTTONS & CASHIER ACTION matching GenericServiceView exactly */}
                    {isPaid ? (
                        <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b2b] border border-slate-100 dark:border-white/5 shadow-2xl space-y-4 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200">
                                POSO Citation Transaction Paid
                            </h4>
                            <p className="text-xs text-slate-400 italic max-w-sm mx-auto">
                                Official Receipt No: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{additional.orNumber || transaction.paymentReference || "OR-ISSUED"}</span>
                            </p>
                            <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-[11px] font-bold text-emerald-500 uppercase tracking-wider italic">
                                Note: This POSO citation fine has been fully paid & settled at Municipal Treasury.
                            </div>
                        </div>
                    ) : isTreasuryStaff ? (
                        !hasCheckIn ? (
                            <div className="p-8 rounded-[2rem] bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-500/40 shadow-xl space-y-4 text-center animate-in fade-in duration-300">
                                <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mx-auto border border-amber-500/20">
                                    <Clock className="w-7 h-7 animate-pulse" />
                                </div>
                                <div className="space-y-1">
                                    <Badge className="bg-amber-600 text-white font-black text-[10px] px-3 py-1 uppercase tracking-widest">
                                        Queue Check-In Required
                                    </Badge>
                                    <h4 className="text-sm font-black uppercase tracking-tight text-amber-950 dark:text-amber-100 pt-1">
                                        Awaiting Treasury Queue Check-In
                                    </h4>
                                </div>
                                <p className="text-xs text-amber-900/80 dark:text-amber-200/90 italic max-w-sm mx-auto leading-relaxed">
                                    This POSO Traffic Citation fine has been registered, but the violator has <strong>NOT yet checked-in at the Municipal Queue</strong>.
                                </p>
                                <div className="p-3 bg-white/70 dark:bg-black/20 rounded-2xl border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200 italic">
                                    Please instruct the violator to check-in at the Treasury Queue to join the active queue before O.R. payment can be processed.
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <TreasuryPaymentCollectionPanel
                                    transaction={transaction}
                                    additional={additional}
                                    actionLoading={actionLoading}
                                    orSeriesNumber={orNumberInput}
                                    setOrSeriesNumber={setOrNumberInput}
                                    orFile={null}
                                    orPreview={null}
                                    themeColor={themeColor}
                                    handleConfirmPayment={handleConfirmPayment}
                                />
                            </div>
                        )
                    ) : (
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl text-center text-xs text-slate-500 font-bold">
                            Only Treasury Staff or Admins can process O.R. payment collection.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
