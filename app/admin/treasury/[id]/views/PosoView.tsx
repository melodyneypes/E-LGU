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
    UserCheck,
    Car,
    Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TreasuryViewProps } from "./types";
import { confirmPosoTrafficFinePayment } from "@/app/admin/transactions/poso-treasury-actions";

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

    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "LANDBANK">("CASH");
    const [paymentReference, setPaymentReference] = useState("");
    const [orNumberInput, setOrNumberInput] = useState(additional?.orNumber || transaction?.paymentReference || "");

    const grandTotal = transaction?.totalAmount || 0;
    const baseFineTotal = fiscal?.baseFineTotal ?? (additional?.violations ? additional.violations.reduce((sum: number, v: any) => sum + Number(v.fine || 0), 0) : grandTotal);
    const impoundFee = fiscal?.impoundFee ?? Number(additional?.impoundFee || 0);

    const isPaid = transaction?.isPaid || transaction?.status === "PAID" || transaction?.status === "SETTLED" || transaction?.status === "RELEASED";

    const handleConfirmPayment = async () => {
        if (!orNumberInput.trim()) {
            toast.error("Official Receipt (OR) Number is required.");
            return;
        }

        if (paymentMethod !== "CASH" && !paymentReference.trim()) {
            toast.error(`${paymentMethod} reference number is required.`);
            return;
        }

        setActionLoading(true);
        try {
            const res = await confirmPosoTrafficFinePayment({
                transactionId: transaction.id,
                orNumber: orNumberInput.trim(),
                paymentMethod,
                paymentReference: paymentMethod !== "CASH" ? paymentReference.trim() : undefined,
            });

            if (res.success) {
                toast.success("POSO Citation Payment successfully settled!");
                router.refresh();
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 border border-slate-100 dark:border-white/5 space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Ticket Number
                                        </span>
                                        <p className="text-sm font-black italic text-slate-800 dark:text-slate-200">
                                            {additional.ticketNo || "POSO Citation"}
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

                                {/* APPREHENDED DRIVER & VEHICLE PARTICULAR DETAILS */}
                                <div className="space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        Apprehended Driver & Vehicle Particulars
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                                                <UserCheck className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Driver&apos;s License No.</span>
                                                <span className="text-xs font-black italic text-slate-800 dark:text-slate-200 uppercase font-mono">
                                                    {resident.licenseNo || additional.licenseNo || "N/A"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                                                <Car className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Vehicle Plate / MV File</span>
                                                <span className="text-xs font-black italic text-slate-800 dark:text-slate-200 uppercase font-mono">
                                                    {resident.plateNo || additional.plateNo || "N/A"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Vehicle Classification</span>
                                                <span className="text-xs font-black italic text-slate-800 dark:text-slate-200 uppercase">
                                                    {additional.vehicleClass ? additional.vehicleClass.replace(/_/g, " ") : additional.typeOfVehicle || "Motor Vehicle"}
                                                </span>
                                            </div>
                                        </div>
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

                                        <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 italic">
                                            <span>Penalty Charge</span>
                                            <span className="font-mono text-slate-800 dark:text-slate-200">₱0.00</span>
                                        </div>

                                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                                            <span className="text-base font-black italic uppercase tracking-tight text-slate-900 dark:text-white">
                                                TOTAL AMOUNT
                                            </span>
                                            <span className="text-3xl font-black italic text-rose-500 font-mono tracking-tighter">
                                                ₱{grandTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
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

                            {/* Step 4: RELEASED */}
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                                    isPaid ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-white/5 text-slate-400"
                                }`}>
                                    {isPaid ? <Check className="w-5 h-5" /> : "4"}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-wider italic ${
                                    isPaid ? "text-emerald-500" : "text-slate-400"
                                }`}>
                                    RELEASED
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
                                Document Paid & Released
                            </h4>
                            <p className="text-xs text-slate-400 italic max-w-sm mx-auto">
                                Official Receipt No: <span className="font-mono font-bold text-slate-200">{transaction.paymentReference || additional.orNumber || "OR-ISSUED"}</span>
                            </p>
                        </div>
                    ) : isTreasuryStaff ? (
                        <div className="space-y-4">
                            {/* Inline Payment Selector matching GenericServiceView lines 733-794 */}
                            <div className="space-y-4 bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        Payment Method
                                    </Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {(["CASH", "GCASH", "LANDBANK"] as const).map((method) => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setPaymentMethod(method)}
                                                className={cn(
                                                    "h-12 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95",
                                                    paymentMethod === method
                                                        ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20"
                                                        : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-white/10"
                                                )}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* OR Number Input matching GenericServiceView lines 757-767 */}
                                <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        OR Number (Official Receipt)
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder="Enter OR Series Number..."
                                        value={orNumberInput}
                                        onChange={(e) => setOrNumberInput(e.target.value)}
                                        className="h-12 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs md:text-sm font-bold dark:bg-slate-950 dark:text-white"
                                    />
                                </div>

                                {/* Reference Number Input matching GenericServiceView lines 782-793 */}
                                {paymentMethod !== "CASH" && (
                                    <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                            {paymentMethod} Reference Number
                                        </Label>
                                        <Input
                                            type="text"
                                            placeholder={`Enter ${paymentMethod} Transaction Reference...`}
                                            value={paymentReference}
                                            onChange={(e) => setPaymentReference(e.target.value)}
                                            className="h-12 rounded-xl border-slate-200 focus:ring-rose-500 shadow-sm text-xs md:text-sm font-bold dark:bg-slate-950 dark:text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Submit Button matching GenericServiceView lines 796-807 */}
                            <Button
                                onClick={handleConfirmPayment}
                                disabled={actionLoading || !orNumberInput.trim() || (paymentMethod !== "CASH" && !paymentReference.trim())}
                                className="w-full h-14 bg-rose-500 hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-rose-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                            >
                                {actionLoading ? "Processing..." : "Mark as Paid & Released"}
                            </Button>
                        </div>
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
