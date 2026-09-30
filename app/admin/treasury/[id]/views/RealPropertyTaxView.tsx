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
    Eye,
    Clock,
    BadgeCheck,
    Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { TreasuryViewProps } from "./types";
import { releaseRptTransaction } from "@/app/admin/transactions/rpt-actions";
import TreasuryPaymentCollectionPanel from "../components/TreasuryPaymentCollectionPanel";

const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];
const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"];

function getFileExtension(url: string) {
    try {
        const cleanPath = new URL(url).pathname;
        return cleanPath.split(".").pop()?.toLowerCase() || "";
    } catch {
        return url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
    }
}

function isDocumentFile(url: string) {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:application/pdf")) return true;
    return documentExtensions.includes(getFileExtension(url));
}

function isImageFile(url: string) {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:image/") || lower.startsWith("blob:")) return true;
    const extension = getFileExtension(url);
    if (imageExtensions.includes(extension)) return true;
    return !isDocumentFile(url);
}

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
    const taxYear = rpt.taxYear || additional.taxYear || new Date().getFullYear().toString();

    const attachments = [
        { label: "Valid Government ID", url: rpt.validIdUrl || additional.validIdUrl },
        { label: "Previous O.R. / SOA", url: rpt.previousOrUrl || additional.previousOrUrl },
        { label: "Building Permit", url: rpt.buildingPermitUrl || additional.buildingPermitUrl },
        { label: "Deed of Absolute Sale", url: rpt.deedOfSaleUrl || additional.deedOfSaleUrl },
        { label: "Transfer Certificate of Title (TCT)", url: rpt.titleUrl || additional.titleUrl },
        { label: "BIR eCAR Document", url: rpt.birEcarUrl || additional.birEcarUrl }
    ].filter(att => Boolean(att.url));

    const isCheckedIn = Boolean(additional.checkedIn === true || additional.checkedInAt || transaction.checkedIn === true);
    const isReleased = transaction.status === "RELEASED";

    const steps = [
        {
            label: "ASSESSMENT COMPLETED",
            desc: "Property assessed & billing computed",
            status: "COMPLETED" as const
        },
        {
            label: "CITIZEN CHECK-IN",
            desc: isCheckedIn || isReleased
                ? "Applicant checked in at kiosk"
                : "Awaiting physical check-in at lobby kiosk",
            status: isCheckedIn || isReleased ? ("COMPLETED" as const) : ("ACTIVE" as const)
        },
        {
            label: "PAYMENT PROCESSING",
            desc: isReleased
                ? "Official Receipt & Payment encoded"
                : isCheckedIn
                    ? "Ready to collect payment & issue O.R."
                    : "Waiting for applicant check-in",
            status: isReleased ? ("COMPLETED" as const) : isCheckedIn ? ("ACTIVE" as const) : ("PENDING" as const)
        },
        {
            label: "TAX CLEARANCE RELEASED",
            desc: isReleased
                ? "Official Clearance & O.R. released"
                : "Pending final payment and clearance release",
            status: isReleased ? ("COMPLETED" as const) : ("PENDING" as const)
        }
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
                                    {/* Flattened Property Specs Grid (No Nested Cards) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5 text-xs">
                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tax Declaration No. (TDN)</span>
                                            <p className="font-mono font-black text-sm tracking-wide text-white truncate">
                                                {tdn}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Property Index No. (PIN)</span>
                                            <p className="font-mono font-black text-sm tracking-wide text-white truncate">
                                                {pin}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Property Classification</span>
                                            <p className="font-black uppercase text-slate-200 truncate">
                                                {additional.propertyType || rpt.propertyType || "RESIDENTIAL"}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tax Assessment Year</span>
                                            <p className="font-mono font-black text-amber-400">
                                                {taxYear}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Barangay Location</span>
                                            <p className="font-black uppercase text-slate-200 truncate">
                                                {barangay}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Assessed Value (AV)</span>
                                            <p className="font-mono font-black text-rose-400 text-sm">
                                                ₱{assessedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        <div className="space-y-1 col-span-2">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Complete Property Address</span>
                                            <p className="font-bold text-slate-200">
                                                {additional.propertyAddress || rpt.propertyAddress || `${barangay}, Mapandan, Pangasinan`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Flattened Tax Computation Breakdown (No Nested Card) */}
                                    <div className="pt-6 border-t border-white/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 italic flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-rose-500" />
                                                Tax Computation Breakdown
                                            </h3>
                                        </div>

                                        <div className="space-y-2.5 pt-1 text-xs font-semibold">
                                            <div className="flex justify-between items-center text-slate-400">
                                                <span>Basic Real Property Tax (1% of Assessed Value)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{basicTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-slate-400">
                                                <span>Special Education Fund / SEF Tax (1% of Assessed Value)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{sefTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-sm font-black uppercase italic tracking-wider text-white">Total Amount Due</span>
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

                    {/* Core Requirements (100% Matched with BusinessPermitView) */}
                    <div className="bg-white dark:bg-[#151b28] p-10 rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                        <div
                            className="flex justify-between items-center cursor-pointer select-none"
                            onClick={() => setIsRequirementsOpen(!isRequirementsOpen)}
                        >
                            <div className="flex items-center gap-2">
                                <BadgeCheck className="w-5 h-5 text-rose-500" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">All Requirements</span>
                            </div>
                            <div className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-white transition-all focus:outline-none shrink-0">
                                {isRequirementsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>

                        {isRequirementsOpen && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {attachments.map((doc, idx, arr) => (
                                    <div
                                        key={idx}
                                        onClick={() => doc.url && handleViewFile?.(doc.url, doc.label, arr, idx)}
                                        className="relative aspect-[4/3] rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-rose-500/50 transition-all select-none"
                                    >
                                        {doc.url ? (
                                            isImageFile(doc.url) ? (
                                                <>
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img src={doc.url} alt={doc.label} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[8px] truncate">
                                                        {doc.label}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-white dark:from-[#111827] dark:to-[#0b1220]" />
                                                    <div className="relative h-full w-full flex flex-col items-center justify-center gap-3 p-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center">
                                                            <FileText className="w-7 h-7 text-rose-500" />
                                                        </div>
                                                        <div className="text-center min-w-0">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                                                {getFileExtension(doc.url).toUpperCase() || "DOC"} File
                                                            </p>
                                                            <p className="mt-1 text-sm font-black italic uppercase tracking-tight text-slate-800 dark:text-white truncate max-w-[220px]">
                                                                {doc.label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="absolute inset-x-3 bottom-3 rounded-xl bg-slate-950/75 backdrop-blur-md px-3 py-2 text-center text-white font-black italic uppercase tracking-widest text-[9px] opacity-90 group-hover:opacity-100 transition-opacity">
                                                        Open Document
                                                    </div>
                                                </>
                                            )
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1.5 p-4">
                                                <Camera className="w-6 h-6 mx-auto" />
                                                <span className="text-[8px] font-black uppercase text-center tracking-widest leading-none">{doc.label}</span>
                                            </div>
                                        )}
                                        {doc.url && isImageFile(doc.url) && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                <div className="bg-rose-600 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px]">
                                                    <span>View</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Status Tracking & Payment Form */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    {/* Status Tracking Panel */}
                    <Card className="rounded-3xl border border-white/5 bg-[#0f1420] shadow-2xl text-white">
                        <CardContent className="p-6 md:p-8 space-y-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400 block italic leading-none">
                                    Workflow Progress
                                </span>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white mt-1.5 leading-none">
                                    Status Timeline
                                </h3>
                            </div>

                            <div className="relative pl-6 border-l-2 border-white/5 space-y-6">
                                {steps.map((st, i) => (
                                    <div key={i} className="relative">
                                        <div className={`absolute w-4 h-4 rounded-full -left-[33px] border-4 transition-all duration-500 flex items-center justify-center text-[7px] ${
                                            st.status === "COMPLETED"
                                                ? "bg-emerald-500 border-[#0f1420] scale-100"
                                                : st.status === "ACTIVE"
                                                    ? "bg-rose-500 border-[#0f1420] ring-4 ring-rose-500/20 scale-110"
                                                    : "bg-slate-800 border-[#0f1420] scale-95"
                                        }`} />
                                        <div className="space-y-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-widest block ${
                                                st.status === "COMPLETED"
                                                    ? "text-emerald-400"
                                                    : st.status === "ACTIVE"
                                                        ? "text-rose-400"
                                                        : "text-slate-500"
                                            }`}>
                                                {st.label}
                                            </span>
                                            <p className="text-[10px] font-medium text-slate-400 leading-snug">
                                                {st.desc}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment Form */}
                    <Card className={`rounded-3xl shadow-2xl text-white transition-all ${
                        !isCheckedIn && transaction.status !== "RELEASED"
                            ? "border border-amber-500/30 bg-amber-500/[0.04]"
                            : "border border-white/5 bg-[#0f1420]"
                    }`}>
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
                            ) : !isCheckedIn ? (
                                <div className="space-y-2 py-1">
                                    <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-amber-400">
                                        <Clock className="w-4 h-4 text-amber-400" /> AWAITING CITIZEN CHECK-IN
                                    </div>
                                    <p className="text-[11px] leading-relaxed font-medium text-slate-400">
                                        The applicant must check in at the Municipal Hall Lobby Kiosk on their scheduled appointment date before Treasury can process payment and issue an Official Receipt.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <TreasuryPaymentCollectionPanel
                                        transaction={transaction}
                                        additional={additional}
                                        actionLoading={actionLoading}
                                        orSeriesNumber={orSeriesNumber}
                                        setOrSeriesNumber={setOrSeriesNumber}
                                        orFile={props.orFile || null}
                                        setOrFile={props.setOrFile}
                                        orPreview={props.orPreview || null}
                                        setOrPreview={props.setOrPreview}
                                        themeColor="#e11d48"
                                        handleConfirmPayment={handleReleasePayment}
                                        handleViewFile={handleViewFile}
                                    />

                                    <Button
                                        variant="outline"
                                        onClick={props.handleReject}
                                        disabled={actionLoading}
                                        className="w-full h-11 border-red-500/30 text-red-400 bg-red-950/40 hover:bg-red-900/60 rounded-xl font-bold uppercase tracking-wider text-xs italic"
                                    >
                                        Reject Application
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
}
