"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    Check,
    FileText,
    Receipt,
    Info,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { TreasuryViewProps } from "./types";
import { releaseRptTransaction } from "@/app/admin/transactions/rpt-actions";

export default function RealPropertyTaxView(props: TreasuryViewProps) {
    const {
        transaction,
        backUrl,
        actionLoading,
        setActionLoading,
        handleViewFile,
        orSeriesNumber,
        setOrSeriesNumber
    } = props;

    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "LANDBANK">("CASH");
    const [paymentReference, setPaymentReference] = useState("");
    const [isProfileOpen, setIsProfileOpen] = useState(true);
    const [isRequirementsOpen, setIsRequirementsOpen] = useState(true);

    if (!transaction) return null;

    const rpt = transaction.realPropertyTax || {};
    const additional = (typeof transaction.additionalData === "string"
        ? JSON.parse(transaction.additionalData || "{}")
        : transaction.additionalData) || {};
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};

    const categoryCode = rpt.rptCategory || additional.categoryCode || transaction.type?.code || "RPT_CAT1";
    const categoryTitle =
        categoryCode === "RPT_CAT1"
            ? "CATEGORY 1: ROUTINE ANNUAL TAX PAYMENT & TAX CLEARANCE"
            : categoryCode === "RPT_CAT2"
                ? "CATEGORY 2: DECLARATION OF NEW PROPERTY"
                : categoryCode === "RPT_CAT3"
                    ? "CATEGORY 3: TRANSFER OF PROPERTY OWNERSHIP"
                    : transaction.type?.name || "REAL PROPERTY TAX SERVICE";

    const ownerName = rpt.ownerName || additional.ownerName || resident.fullName || `${resident.firstName || ""} ${resident.lastName || ""}`.trim() || "PROPERTY OWNER";
    const tdn = rpt.tdn || additional.tdn || "N/A";
    const pin = rpt.pin || additional.pin || "N/A";
    const barangay = rpt.barangay || additional.barangay || "Mapandan";

    const totalTaxDue = Number(rpt.totalTaxDue || additional.totalTaxDue || transaction.totalAmount || 0);
    const basicTax = Number(rpt.basicTax || additional.basicTax || (totalTaxDue > 0 ? totalTaxDue / 2 : 0));
    const sefTax = Number(rpt.sefTax || additional.sefTax || (totalTaxDue > 0 ? totalTaxDue / 2 : 0));
    const assessedValue = Number(rpt.assessedValue || additional.assessedValue || (basicTax > 0 ? basicTax / 0.01 : 0));

    const attachments = [
        { label: "Valid Government ID", url: rpt.validIdUrl || additional.validIdUrl },
        { label: "Previous O.R. / SOA", url: rpt.previousOrUrl || additional.previousOrUrl },
        { label: "Building Permit", url: rpt.buildingPermitUrl || additional.buildingPermitUrl },
        { label: "Deed of Absolute Sale", url: rpt.deedOfSaleUrl || additional.deedOfSaleUrl },
        { label: "Transfer Certificate of Title (TCT)", url: rpt.titleUrl || additional.titleUrl },
        { label: "BIR eCAR Document", url: rpt.birEcarUrl || additional.birEcarUrl }
    ].filter(att => Boolean(att.url));

    const steps = [
        { label: "FOR EVALUATION", status: "COMPLETED" },
        { label: "TO PROCESS", status: "COMPLETED" },
        { label: "FOR PROCESSING", status: transaction.status === "RELEASED" ? "COMPLETED" : "ACTIVE" },
        { label: "RELEASED", status: transaction.status === "RELEASED" ? "COMPLETED" : "PENDING" }
    ];

    const handleReleasePayment = async () => {
        if (!orSeriesNumber || !orSeriesNumber.trim()) {
            toast.error("Official Receipt (O.R.) Number is required before releasing payment.");
            return;
        }

        setActionLoading(true);
        try {
            const res = await releaseRptTransaction(transaction.id, orSeriesNumber.trim());
            if (res.success) {
                toast.success("RPT Payment recorded! Official Receipt & Tax Clearance released.");
                if (props.fetchTransaction) {
                    await props.fetchTransaction();
                }
            } else {
                toast.error(res.error || "Failed to mark transaction as paid & released.");
            }
        } catch (err) {
            console.error("RPT release error:", err);
            toast.error("An error occurred while releasing payment.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#080b11] text-slate-100 pb-20 font-sans">
            {/* Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-[#080b11]/80 backdrop-blur-md sticky top-0 z-30">
                <Link
                    href={backUrl}
                    prefetch={false}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-rose-500 transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Registry
                </Link>
                <Badge variant="outline" className="font-mono font-black italic uppercase tracking-widest text-[10px] border-rose-500/30 text-rose-400 bg-rose-500/10 px-4 py-1">
                    TYPE OF REQUEST: {transaction.status === "RELEASED" ? "RELEASED" : "PROCESSING"}
                </Badge>
            </header>

            <main className="max-w-[1400px] mx-auto px-6 md:px-8 grid grid-cols-12 gap-8 mt-6">
                {/* LEFT COLUMN: Property Profile & Computation */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Header Banner */}
                    <div className="bg-[#0f1420] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
                        <div className="flex items-start justify-between gap-4 relative z-10">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest italic">
                                    <Info className="w-3.5 h-3.5" /> Transaction Information
                                </div>
                                <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter text-white">
                                    {categoryTitle}
                                </h1>
                                <p className="text-slate-400 text-xs font-bold italic uppercase tracking-wider">
                                    Real Property Tax Billing & Official Clearance Management
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Applicant & Property Profile */}
                    <Card className="rounded-3xl border border-white/5 bg-[#0f1420] shadow-2xl text-white">
                        <CardContent className="p-6 md:p-8 space-y-6">
                            <div
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center justify-between cursor-pointer select-none border-b border-white/5 pb-4"
                            >
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400 italic block">
                                        Primary Applicant & Property Profile
                                    </span>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">
                                        {ownerName}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white">
                                    {isProfileOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </Button>
                            </div>

                            {isProfileOpen && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Top Property Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Assessed Property Value</span>
                                            <p className="text-base font-black italic tracking-tighter text-rose-400">
                                                ₱{assessedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Tax Declaration # (TDN)</span>
                                            <p className="text-xs font-mono font-bold text-slate-200 truncate">
                                                {tdn}
                                            </p>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">PIN Number</span>
                                            <p className="text-xs font-mono font-bold text-slate-200 truncate">
                                                {pin}
                                            </p>
                                        </div>

                                        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Barangay Location</span>
                                            <p className="text-xs font-bold text-slate-200 truncate">
                                                {barangay}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Tax Computation Breakdown Table */}
                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 italic flex items-center gap-2">
                                            <Receipt className="w-4 h-4 text-rose-500" />
                                            Tax Computation Breakdown
                                        </h3>

                                        <div className="space-y-3 bg-white/[0.01] border border-white/5 p-5 rounded-2xl">
                                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 italic">
                                                <span>Basic Real Property Tax (1% of Assessed Value)</span>
                                                <span className="font-mono text-slate-200">
                                                    ₱{basicTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-xs font-bold text-slate-400 italic">
                                                <span>Special Education Fund / SEF Tax (1% of Assessed Value)</span>
                                                <span className="font-mono text-slate-200">
                                                    ₱{sefTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-sm font-black uppercase italic tracking-wider text-white">Total Amount</span>
                                                <span className="text-2xl font-black italic tracking-tighter text-rose-500 font-mono">
                                                    ₱{totalTaxDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Requirements & Documents */}
                    {attachments.length > 0 && (
                        <Card className="rounded-3xl border border-white/5 bg-[#0f1420] shadow-2xl text-white">
                            <CardContent className="p-6 md:p-8 space-y-6">
                                <div
                                    onClick={() => setIsRequirementsOpen(!isRequirementsOpen)}
                                    className="flex items-center justify-between cursor-pointer select-none border-b border-white/5 pb-4"
                                >
                                    <div className="space-y-1">
                                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400 italic block">
                                            Submitted Document Checklist
                                        </span>
                                        <h3 className="text-xl font-black uppercase italic tracking-tight text-white">
                                            All Requirements ({attachments.length})
                                        </h3>
                                    </div>
                                    <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white">
                                        {isRequirementsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </Button>
                                </div>

                                {isRequirementsOpen && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                        {attachments.map((att, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => handleViewFile?.(att.url, att.label)}
                                                className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-rose-500/30 flex items-center justify-between group cursor-pointer transition-all"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-200 group-hover:text-rose-400 transition-colors">
                                                            {att.label}
                                                        </p>
                                                        <span className="text-[9px] text-slate-500 font-semibold uppercase">Click to preview document</span>
                                                    </div>
                                                </div>
                                                <Eye className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* RIGHT COLUMN: Status Tracking & Payment Form */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Status Tracking Panel */}
                    <Card className="rounded-3xl border border-white/5 bg-[#0f1420] shadow-2xl text-white">
                        <CardContent className="p-6 space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 italic">
                                Status Tracking
                            </h3>

                            <div className="space-y-4">
                                {steps.map((st, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        {st.status === "COMPLETED" ? (
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        ) : st.status === "ACTIVE" ? (
                                            <div className="w-6 h-6 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center italic shadow-lg shadow-rose-500/30">
                                                {i + 1}
                                            </div>
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center">
                                                {i + 1}
                                            </div>
                                        )}
                                        <span className={`text-xs font-black uppercase tracking-wider italic ${st.status === "COMPLETED" ? "text-emerald-400" : st.status === "ACTIVE" ? "text-rose-400" : "text-slate-500"}`}>
                                            {st.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Form */}
                    <Card className="rounded-3xl border border-white/5 bg-[#0f1420] shadow-2xl text-white">
                        <CardContent className="p-6 space-y-6">
                            {transaction.status === "RELEASED" ? (
                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
                                    <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> PAYMENT COMPLETED & RELEASED
                                    </div>
                                    <p className="text-[11px] leading-relaxed font-medium">
                                        This transaction has been successfully processed, paid, and released by Treasury. Official Receipt and Tax Clearance Certificate have been issued.
                                    </p>
                                    {orSeriesNumber && (
                                        <div className="pt-2.5 border-t border-emerald-500/20 text-xs font-mono font-bold text-white">
                                            O.R. Series Number: <span className="text-emerald-400">{orSeriesNumber}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {/* Payment Method Selector */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                            Payment Method
                                        </Label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(["CASH", "GCASH", "LANDBANK"] as const).map((method) => (
                                                <button
                                                    key={method}
                                                    onClick={() => setPaymentMethod(method)}
                                                    className={`h-11 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${paymentMethod === method ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30" : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/5"}`}
                                                >
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Reference Number input for online methods */}
                                    {paymentMethod !== "CASH" && (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                                {paymentMethod} Reference Number
                                            </Label>
                                            <Input
                                                placeholder={`Enter ${paymentMethod} reference...`}
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                className="h-11 rounded-xl bg-white/[0.02] border-white/10 text-white font-mono text-xs"
                                            />
                                        </div>
                                    )}

                                    {/* Official Receipt Series Number */}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                            OR Number (Official Receipt)
                                        </Label>
                                        <Input
                                            placeholder="Enter OR Series Number..."
                                            value={orSeriesNumber || ""}
                                            onChange={(e) => setOrSeriesNumber?.(e.target.value)}
                                            className="h-12 rounded-xl bg-white/[0.03] border-white/10 text-white font-mono text-sm font-bold"
                                        />
                                    </div>

                                    {/* Mark as Paid & Released */}
                                    <Button
                                        onClick={handleReleasePayment}
                                        disabled={actionLoading}
                                        className="w-full h-13 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-600/20 italic"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Paid & Released
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={props.handleReject}
                                        disabled={actionLoading}
                                        className="w-full h-11 border-red-500/30 text-red-400 bg-red-950/40 hover:bg-red-900/60 rounded-xl font-bold uppercase tracking-wider text-xs italic"
                                    >
                                        Reject Application
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
