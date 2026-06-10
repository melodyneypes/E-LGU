/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    BadgeCheck,
    Coins,
    Upload,
    Clock,
    Camera,
    FileText,
    Plus,
    Trash2,
    Check,
    Ban,
    Copy,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import LightboxView from "../components/LightboxView";
import ResidentIdentityProfile from "../components/ResidentIdentityProfile";
import TransactionInfoCard from "../components/TransactionInfoCard";
import RejectionRevisionControls from "../components/RejectionRevisionControls";
import TreasuryPaymentCollectionPanel from "../components/TreasuryPaymentCollectionPanel";
import { TreasuryViewProps } from "./types";

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

export default function BusinessPermitView({
    transaction,
    session,
    userRole,
    rawUserRole,
    isTreasuryStaff,
    isBPLOAdmin,
    isReadOnlyAide,
    backUrl,
    actionLoading,
    remarks,
    setRemarks,
    ctcNumber,
    setCtcNumber,
    stickerNumber,
    setStickerNumber,
    isRejecting,
    setIsRejecting,
    isRequestingRevision,
    setIsRequestingRevision,
    deliveryFee,
    eCopyFile,
    setECopyFile,
    eCopyPreview,
    orFile,
    setOrFile,
    orPreview,
    setOrPreview,
    themeColor,
    branding,
    isResolvingDispute,
    disputeModalOpen,
    setDisputeModalOpen,
    disputeAction,
    setDisputeAction,
    showPreviousPhases,
    setShowPreviousPhases,
    feeLineItems,
    setFeeLineItems,
    fetchTransaction,
    handleEvaluate,
    handleConfirmPayment,
    handleDeclinePaymentProof,
    handlePrintWaybill,
    handleRelease,
    handleResolveDispute,
    addFeeLineItem,
    removeFeeLineItem,
    updateFeeLineItem,
    safeFormatDate,
    declaredValue,
    declaredLabel,
    calcResult,
    displayTotal,
    evidenceDocs,
    steps,
    currentStepIdx,
    hasVerification,
    hasDispute,
    isRequirementsAlone,
    handleReject,
    handleRequestRevision,
    handleViewFile,
    orSeriesNumber,
    setOrSeriesNumber
}: TreasuryViewProps) {
    const additional = transaction.additionalData || {};
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const deliveryAddr = transaction.deliveryAddress
        ? (typeof transaction.deliveryAddress === 'string' ? JSON.parse(transaction.deliveryAddress) : transaction.deliveryAddress)
        : null;
    const fiscal = transaction.fiscalSnapshot || null;

    const shouldExpandRequirements = isRequirementsAlone || ["PAID", "FOR_PROCESSING", "FOR_REINSPECTION", "FOR_PICKING", "FOR_CLAIM", "RELEASED"].includes(transaction.status);

    const [isAssessmentOpen, setIsAssessmentOpen] = useState(true);
    const [isBusinessRecordOpen, setIsBusinessRecordOpen] = useState(true);
    const [isRequirementsOpen, setIsRequirementsOpen] = useState(true);

    const isBusinessPermitRenewal = (
        transaction?.type?.code === "BUSINESS_PERMIT_RENEW" ||
        (transaction?.additionalData as any)?.businessType === "RENEWAL" ||
        (transaction?.additionalData as any)?.businessType === "RENEW"
    );

    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            {/* Minimal Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <Link
                    href={backUrl}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Registry
                </Link>
                <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-primary/20 text-primary bg-primary/5 px-4 py-1">
                    Type Of Request: {transaction.fulfillmentType?.replace("_", " ") || "Processing"}
                </Badge>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {/* LEFT COLUMN */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* TOGGLE PREVIOUS PHASES FOR INSPECTION */}
                    {transaction.status === "FOR_INSPECTION" && (
                        <div className="flex justify-end mb-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowPreviousPhases(!showPreviousPhases)}
                                className="border-dashed bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs uppercase font-bold tracking-widest"
                            >
                                {showPreviousPhases ? "Hide Previous Phase Data" : "View Previous Phase Data (Profile & Forms)"}
                            </Button>
                        </div>
                    )}

                    {/* TRANSACTION CATEGORY CARD */}
                    <TransactionInfoCard
                        transactionName={transaction.type.name}
                        categoryLabel="Business Permit"
                        themeColor={themeColor}
                    />

                    {/* MAIN ASSESSMENT CARD */}
                    {!isReadOnlyAide && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-12">
                            {/* IDENTIFIER / ACCORDION HEADER */}
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setIsAssessmentOpen(!isAssessmentOpen)}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                            Registered Business Name
                                        </span>
                                        {transaction.revisionCount > 0 ? (
                                            <Badge className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-0.5 rounded-full">
                                                Revision Count: {transaction.revisionCount}
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-0.5 rounded-full">
                                                First Submission
                                            </Badge>
                                        )}
                                    </div>
                                    <h1 className="text-5xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                        {transaction.businessName || additional.businessName || "UNNAMED ENTITY"}
                                    </h1>
                                </div>
                                <div className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white transition-all focus:outline-none shrink-0">
                                    {isAssessmentOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>

                            {isAssessmentOpen && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-300">

                                    {/* TOP METRICS GRID */}
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-3xl space-y-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{declaredLabel}</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200">₱{declaredValue.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-3xl space-y-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Fulfillment Type</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 uppercase truncate" title={transaction.fulfillmentType}>
                                                {transaction.fulfillmentType?.replace(/_/g, " ") || "--"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-3xl space-y-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment Mode</span>
                                            <p className={cn(
                                                "font-black italic tracking-tighter dark:text-slate-200 leading-none",
                                                (transaction.paymentType?.length || 0) > 12 ? "text-base" : "text-lg"
                                            )}>
                                                {transaction.paymentType?.replace(/_/g, " ") || "--"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-3xl space-y-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Total Amount</span>
                                            <p className="text-lg font-black italic tracking-tighter text-primary">₱{calcResult.totalAmount.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    {/* COMPUTATION BREAKDOWN */}
                                    <div className="space-y-6 pt-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                                            Fee Assessment Breakdown
                                        </h3>
                                        <div className="space-y-4">
                                            {(transaction.status === "FOR_REQUESTING" && (userRole === "TREASURY_STAFF" || userRole === "ADMIN")) ? (
                                                <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                                                    {feeLineItems.map((item, idx) => (
                                                        <div key={idx} className="flex gap-3 items-center group bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 px-3 py-1.5 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                                            <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 w-6 h-6 flex items-center justify-center rounded-lg select-none shrink-0">
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                placeholder="Fee Description"
                                                                value={item.label}
                                                                onChange={(e) => updateFeeLineItem(idx, 'label', e.target.value)}
                                                                className="flex-1 h-9 bg-transparent text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none border-none p-0 focus:ring-0"
                                                            />
                                                            <div className="relative w-28 shrink-0 flex items-center border-l border-slate-100 dark:border-white/5 pl-3">
                                                                <span className="text-xs font-black text-slate-400 mr-1 select-none">₱</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0.00"
                                                                    value={item.amount}
                                                                    onChange={(e) => updateFeeLineItem(idx, 'amount', e.target.value)}
                                                                    className="w-full bg-transparent text-sm font-black text-right text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                            </div>
                                                            {feeLineItems.length > 1 ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeFeeLineItem(idx)}
                                                                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            ) : (
                                                                <div className="w-8 h-8 shrink-0" />
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={addFeeLineItem}
                                                        className="h-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 font-black italic text-[10px] tracking-widest gap-2 text-slate-400 hover:text-primary hover:border-primary/50 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all w-full mt-1"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> ADD FEE LINE ITEM
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {calcResult.lineItems && calcResult.lineItems.length > 0 ? (
                                                        calcResult.lineItems.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                                <span>{item.label}</span>
                                                                <span className="dark:text-slate-200">₱{(Number(item.amount) || 0).toFixed(2)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                            <span>Base Mayors Permit Fee</span>
                                                            <span className="dark:text-slate-200">₱{calcResult.basicTax.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {calcResult.penalty > 0 && (
                                                <div className="flex justify-between items-center text-sm font-bold text-orange-500 italic">
                                                    <span>Penalty Charge</span>
                                                    <span>₱{calcResult.penalty.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {transaction.fulfillmentType === "DELIVERY" && (
                                                <div className="flex justify-between items-center pt-2 gap-4">
                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 italic">Delivery Fee</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-primary">₱</span>
                                                        <span className="text-xs font-black dark:text-white italic">
                                                            {deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="border-t border-dotted border-slate-300 dark:border-white/10 pt-4 mt-4 flex justify-between items-center">
                                                <span className="text-base font-black uppercase italic tracking-widest text-slate-900 dark:text-white leading-none">Total Amount</span>
                                                <span className="text-3xl font-black italic tracking-tighter text-primary leading-none">
                                                    ₱{displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* RESIDENT IDENTITY PROFILE ACCORDION */}
                    <ResidentIdentityProfile
                        resident={resident}
                        safeFormatDate={safeFormatDate}
                        themeColor={themeColor}
                    />

                    {/* BUSINESS RECORD CARD */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-10">
                        {/* Business Profile Accordion Header */}
                        <div
                            className="flex justify-between items-center cursor-pointer select-none"
                            onClick={() => setIsBusinessRecordOpen(!isBusinessRecordOpen)}
                        >
                            <div className="space-y-2">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                    Business <span className="text-primary">Record</span>
                                </h2>
                                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">
                                    BPLO Registration Details
                                </p>
                            </div>
                            <div className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white transition-all focus:outline-none shrink-0">
                                {isBusinessRecordOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>

                        {isBusinessRecordOpen && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">

                                <div className="grid grid-cols-12 gap-x-6 gap-y-6">
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Official Business Name</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-sm text-primary uppercase truncate">
                                            {additional?.businessName || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Trade Signage Name</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.tradeName || "Same as Business Name"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Organization Type</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase truncate">
                                            {additional?.orgType ? additional.orgType.replace(/_/g, " ") : "--"}
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Building / Unit</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.building || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Street Address</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.street || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Business Barangay</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase truncate">
                                            {additional?.businessBarangay || additional?.barangay || resident?.barangay || "--"}
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-6 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Line of Business</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.lineOfBusiness || "General"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-6 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                                            {additional?.businessType === "RENEWAL" 
                                                ? "Existing Permit License" 
                                                : `${additional?.registrationType || "DTI/SEC"} Registration Number`}
                                        </label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-primary truncate">
                                            {transaction.businessPermit?.permitNumber || additional?.existingPermitNumber || additional?.permitNumber || additional?.dtiSecNumber || "--"}
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Branch Type</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.businessBranch || "MAIN"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">TIN Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.tinNumber || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">PhilHealth Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.philhealthNumber || "--"}
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Pag-Ibig MID Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.pagibigNumber || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">SSS Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.sssNumber || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Registration Type</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.registrationType || (additional?.dtiSecNumber ? "DTI/SEC" : "--")}
                                        </div>
                                    </div>

                                    {additional?.dtiSecDate && (
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Registration Date</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                {safeFormatDate(additional.dtiSecDate)}
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Employee Count</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                            {additional?.employeeCount ?? "0"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Store Area</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                            {additional?.businessArea ? `${additional.businessArea} sqm` : "0 sqm"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* EVIDENCE VAULT */}
                    <div className="grid grid-cols-1 gap-8">
                        {/* Core Requirements */}
                        <div className="bg-white dark:bg-[#151b28] p-10 rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6 md:col-span-2">
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setIsRequirementsOpen(!isRequirementsOpen)}
                            >
                                <div className="flex items-center gap-2">
                                    <BadgeCheck className="w-5 h-5 text-primary" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">All Requirements</span>
                                </div>
                                <div className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white transition-all focus:outline-none shrink-0">
                                    {isRequirementsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>
                            {isRequirementsOpen && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {(isBusinessPermitRenewal 
                                        ? evidenceDocs.filter(doc => !!doc.url) 
                                        : evidenceDocs
                                    ).map((doc, idx, arr) => (
                                        <div
                                            key={idx}
                                            onClick={() => doc.url && handleViewFile?.(doc.url, doc.label, arr, idx)}
                                            className="relative aspect-[4/3] rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all select-none"
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
                                                                <FileText className="w-7 h-7 text-primary" />
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
                                                    <div
                                                        style={{ backgroundColor: themeColor }}
                                                        className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px]"
                                                    >
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
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-span-12 lg:col-span-4 space-y-8 lg:sticky lg:top-8 lg:self-start">
                    {/* WORKFLOW TRACKING TIMELINE */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-10 border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-8">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Status Tracking</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mt-1 leading-none">Timeline</h2>
                        </div>

                        <div className="relative pl-6 border-l-2 border-slate-100 dark:border-white/5 space-y-8">
                            {steps.map((step, idx) => {
                                const isCompleted = idx < currentStepIdx;
                                const isActive = idx === currentStepIdx;
                                return (
                                    <div key={step.id} className="relative">
                                        <div className={cn(
                                            "absolute w-4 h-4 rounded-full -left-[33px] border-4 transition-all duration-500 flex items-center justify-center text-[6px]",
                                            isActive
                                                ? "bg-primary border-white dark:border-[#151b28] ring-4 ring-primary/20 scale-110"
                                                : isCompleted
                                                    ? "bg-emerald-500 border-white dark:border-[#151b28] scale-100"
                                                    : "bg-slate-200 dark:bg-slate-800 border-white dark:border-[#151b28] scale-95"
                                        )} />
                                        <div className="space-y-1">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest",
                                                isActive
                                                    ? "text-primary"
                                                    : isCompleted
                                                        ? "text-emerald-500"
                                                        : "text-slate-400 dark:text-slate-600"
                                            )}>
                                                {step.label}
                                            </span>
                                            {isActive && (
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight italic">
                                                    Current processing status. Evaluate, process, or release below.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* EXECUTIVE ACTIONS */}
                    <div className="space-y-4 pt-4">
                        {isReadOnlyAide ? (
                            <div className="bg-white dark:bg-[#151b28] p-8 rounded-[2.5rem] border border-slate-50 dark:border-white/5 text-center space-y-4 shadow-[0_2px_40px_rgba(0,0,0,0.02)]">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <span className="text-2xl animate-pulse">🔒</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest italic">Read-Only Access Protocol</p>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tight italic">
                                        Hi Admin Aide! You are in <span className="text-primary font-black">Read-Only Mode</span>. Business Permits in the <span className="text-primary font-black">{transaction?.status?.replace(/_/g, " ")}</span> stage must be processed and released by <span className="text-primary font-black">Treasury Staff</span> only.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {(transaction.status === "FOR_REQUESTING" || transaction.status === "FOR_INSPECTION") && (
                                    <div className="space-y-3">
                                        <Button onClick={handleEvaluate} disabled={actionLoading} className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                                            {actionLoading ? "Processing..." : "Proceed to Payment"}
                                        </Button>
                                        {transaction.status !== "FOR_REQUESTING" && (
                                            <div className="flex gap-2 w-full">
                                                {transaction.revisionCount < 3 && (
                                                    <Button
                                                        onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                                        className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                                                    >
                                                        Request Revision
                                                    </Button>
                                                )}
                                                <Button
                                                    onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                                    className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {transaction.status === "EVALUATED" && (
                                    <div className="bg-blue-50 dark:bg-blue-500/5 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-500/20 text-center space-y-4">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                                            <span className="text-2xl animate-pulse">⏳</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-500 italic">Financial Protocol Active</p>
                                            <p className="text-[11px] font-bold text-blue-900/60 dark:text-blue-400/60 leading-relaxed uppercase tracking-tight">Read-Only Mode: Waiting for Citizen to finalize payment.</p>
                                        </div>
                                    </div>
                                )}

                                {transaction.status === "FOR_REVISION" && (
                                    <div className="bg-amber-50 dark:bg-amber-500/5 p-8 rounded-[2.5rem] border-2 border-amber-100 dark:border-amber-500/20 text-center space-y-4">
                                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                                            <span className="text-2xl animate-pulse">⚠️</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 italic">Awaiting Citizen Revision</p>
                                            <p className="text-[11px] font-bold text-amber-900/60 dark:text-amber-400/60 leading-relaxed uppercase tracking-tight">Read-Only Mode: Transaction sent back to citizen for correction.</p>
                                        </div>
                                        {transaction.rejectionRemarks && (
                                            <div className="mt-2 p-4 bg-amber-500/10 rounded-2xl text-left border border-amber-500/20">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-amber-600 block mb-1">Requested Corrections</span>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 italic">
                                                    &ldquo;{transaction.rejectionRemarks}&rdquo;
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status) && (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-4">


                                        {/* Upload Official Receipt (OR) */}
                                        {transaction.status === "PAID" && (
                                            <TreasuryPaymentCollectionPanel
                                                transaction={transaction}
                                                additional={additional}
                                                actionLoading={actionLoading}
                                                orSeriesNumber={orSeriesNumber}
                                                setOrSeriesNumber={setOrSeriesNumber}
                                                orFile={orFile}
                                                setOrFile={setOrFile}
                                                orPreview={orPreview}
                                                setOrPreview={setOrPreview}
                                                themeColor={themeColor}
                                                handleConfirmPayment={handleConfirmPayment}
                                                handleViewFile={handleViewFile}
                                            />
                                        )}

                                        {transaction.status === "FOR_PROCESSING" && (
                                            <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-3">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">Upload Official Receipt (OR) <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => setOrFile(e.target.files?.[0] || null)}
                                                    className="h-12 rounded-xl border-slate-100 dark:border-white/5 text-xs focus:ring-primary/10 dark:bg-slate-950 dark:text-white"
                                                />
                                                {(orPreview || (transaction.orUrl && transaction.orUrl !== "null" && transaction.orUrl !== "undefined" && transaction.orUrl !== "")) && (
                                                    <div className="mt-2">
                                                        {(() => {
                                                            const isOrPdf = orFile
                                                                ? (orFile.type === "application/pdf" || orFile.name.toLowerCase().endsWith(".pdf"))
                                                                : (transaction.orUrl?.toLowerCase()?.includes(".pdf") || false);

                                                            if (isOrPdf) {
                                                                return (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleViewFile?.(orPreview || transaction.orUrl, "Official Receipt PDF")}
                                                                        className="w-full flex items-center justify-between p-5 bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left animate-in fade-in duration-300 group"
                                                                    >
                                                                        <div className="flex items-center gap-4">
                                                                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl shrink-0 group-hover:scale-110 transition-transform">
                                                                                📕
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Official Receipt PDF</p>
                                                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Click to View Document in Modal</p>
                                                                            </div>
                                                                        </div>
                                                                        <div className="h-9 px-4 rounded-xl border border-primary/20 text-primary font-black italic uppercase tracking-widest text-[9px] group-hover:bg-primary/10 flex items-center gap-1.5 transition-all shrink-0">
                                                                            Open PDF ➔
                                                                        </div>
                                                                    </button>
                                                                );
                                                            }
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleViewFile?.(orPreview || transaction.orUrl, "Official Receipt Document")}
                                                                    className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block"
                                                                >
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={orPreview || transaction.orUrl}
                                                                        alt="OR Preview"
                                                                        className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                                                    />
                                                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                                                                        <div
                                                                            style={{ backgroundColor: themeColor }}
                                                                            className="backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px]"
                                                                        >
                                                                            <span>View</span>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Prepared Serial Badge */}
                                        {transaction.status === "FOR_PICKING" || transaction.status === "FOR_CLAIM" || transaction.businessPermit?.permitNumber ? (
                                            <div className="bg-emerald-50 dark:bg-emerald-500/5 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-500/20 text-center space-y-2">
                                                <BadgeCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-500 mx-auto" />
                                                <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 italic">
                                                    {transaction.status === "FOR_PICKING" ? "Ready for Dispatch" : "Document Prepared"}
                                                </p>
                                                <p className="text-[11px] font-bold text-emerald-900/60 dark:text-emerald-500/60 tracking-tight italic leading-relaxed">
                                                    Registry Serial <span className="font-mono text-emerald-600 dark:text-emerald-400">#{transaction.businessPermit?.permitNumber || "RECORDED"}</span> is locked and ready for release.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6">
                                                {/* Digital Copy Upload Warning */}
                                                {(transaction.status === "FOR_PROCESSING" || transaction.status === "PAID") && !orFile && !transaction.orUrl && (
                                                    <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-center space-y-2">
                                                        <Upload className="w-5 h-5 text-amber-600 dark:text-amber-500 mx-auto" />
                                                        <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 italic">Official Receipt (OR) Required</p>
                                                        <p className="text-[11px] font-bold text-amber-900/60 dark:text-amber-500/60 leading-relaxed">Please attach the Official Receipt (OR) copy to enable document processing.</p>
                                                    </div>
                                                )}

                                                {/* Document Inputs */}
                                                <div className="space-y-4">
                                                    {transaction.status === "FOR_REINSPECTION" && (
                                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-primary/20 space-y-3">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">Sticker Number <span className="text-rose-500 ml-0.5">*</span></Label>
                                                            <Input
                                                                value={stickerNumber}
                                                                onChange={(e) => setStickerNumber(e.target.value)}
                                                                placeholder="ENTER STICKER NUMBER..."
                                                                className="h-12 rounded-xl border-slate-100 dark:border-white/5 italic font-black text-sm tracking-[0.2em] focus:ring-primary/10 dark:bg-slate-900 dark:text-white uppercase"
                                                            />
                                                        </div>
                                                    )}

                                                    {transaction.status !== "FOR_REINSPECTION" && !isTreasuryStaff && transaction.status !== "PAID" && (
                                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-primary/20 space-y-3">
                                                            <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">License Business Permit No.</Label>
                                                            <Input
                                                                value={ctcNumber}
                                                                onChange={(e) => setCtcNumber(e.target.value)}
                                                                placeholder="ENTER BUSINESS PERMIT NO..."
                                                                className="h-12 rounded-xl border-slate-100 dark:border-white/5 italic font-black text-sm tracking-[0.2em] focus:ring-primary/10 dark:bg-slate-950 dark:text-white uppercase"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-3 pt-2">
                                            {transaction.fulfillmentType === "DELIVERY" && (transaction.status === "FOR_PROCESSING" || transaction.status === "PAID" || transaction.status === "FOR_PICKING" || transaction.status === "FOR_REINSPECTION") && (isBPLOAdmin || !isTreasuryStaff) && (
                                                <Button
                                                    onClick={handlePrintWaybill}
                                                    variant="outline"
                                                    className="w-full h-14 rounded-2xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all mb-2"
                                                >
                                                    Generate & Print Waybill
                                                </Button>
                                            )}

                                            {transaction.status !== "FOR_PICKING" && (
                                                <>
                                                    {transaction.status !== "PAID" && (
                                                        <Button
                                                            onClick={["FOR_PROCESSING", "PAID"].includes(transaction.status) ? handleConfirmPayment : handleRelease}
                                                            disabled={
                                                                actionLoading ||
                                                                (isBusinessPermitRenewal && transaction.status === "FOR_REINSPECTION" && !stickerNumber) ||
                                                                (!isBusinessPermitRenewal && transaction.status === "FOR_REINSPECTION" && (!ctcNumber && !transaction.businessPermit?.permitNumber)) ||
                                                                (!isBusinessPermitRenewal && transaction.status === "FOR_REINSPECTION" && !stickerNumber) ||
                                                                (transaction.status === "FOR_REINSPECTION" && !eCopyFile && !transaction.eCopyUrl) ||
                                                                ((transaction.status === "FOR_PROCESSING" || transaction.status === "PAID") && !orFile && !transaction.orUrl)
                                                            }
                                                            className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                                                        >
                                                            {actionLoading ? "Submitting..." : ["FOR_PROCESSING", "PAID"].includes(transaction.status) ? "Payment Received" : (transaction.status === "FOR_REINSPECTION" ? (transaction.fulfillmentType === "DELIVERY" ? "Ready for Picking" : "Mark Ready for Claiming") : "Confirm & Release Document")}
                                                        </Button>
                                                    )}


                                                    {!(["PAID", "FOR_PROCESSING", "FOR_REINSPECTION"].includes(transaction.status)) && (
                                                        <Button
                                                            onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                                            className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                                        >
                                                            Reject Application
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* SHARED MODALS */}
            <RejectionRevisionControls
                isRejecting={isRejecting}
                setIsRejecting={setIsRejecting}
                isRequestingRevision={isRequestingRevision}
                setIsRequestingRevision={setIsRequestingRevision}
                remarks={remarks}
                setRemarks={setRemarks}
                actionLoading={actionLoading}
                handleReject={handleReject}
                handleRequestRevision={transaction.status === "PAID" ? handleDeclinePaymentProof : handleRequestRevision}
            />

        </div>
    );
}
