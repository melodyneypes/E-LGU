/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Upload,
    Camera,
    FileText,
    BadgeCheck,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Copy,
    Coins,
    Check,
    ExternalLink,
    Ban,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import LightboxView from "../components/LightboxView";
import ResidentIdentityProfile from "../components/ResidentIdentityProfile";
import TransactionInfoCard from "../components/TransactionInfoCard";
import RejectionRevisionControls from "../components/RejectionRevisionControls";
import { TreasuryViewProps } from "./types";
import { cn } from "@/lib/utils";

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

export default function GenericServiceView(props: TreasuryViewProps) {
    const {
        transaction,
        rawUserRole,
        isTreasuryStaff,
        isBPLOAdmin,
        isReadOnlyAide,
        backUrl,
        deliveryFee,
        themeColor,
        branding,
        safeFormatDate,
        declaredValue,
        declaredLabel,
        calcResult,
        displayTotal,
        evidenceDocs,
        steps,
        currentStepIdx,
        isRejecting,
        setIsRejecting,
        isRequestingRevision,
        setIsRequestingRevision,
        remarks,
        setRemarks,
        actionLoading,
        handleReject,
        handleRequestRevision,
        handleEvaluate,
        handleConfirmPayment,
        handleDeclinePaymentProof,
        feeLineItems,
        addFeeLineItem,
        removeFeeLineItem,
        updateFeeLineItem,
        ctcNumber,
        setCtcNumber,
        stickerNumber,
        setStickerNumber,
        eCopyFile,
        setECopyFile,
        eCopyPreview,
        orFile,
        setOrFile,
        orPreview,
        handleRelease,
        handlePrintWaybill,
        userRole,
        orSeriesNumber,
        setOrSeriesNumber,
        handleViewFile,
        isResolvingDispute,
        disputeModalOpen,
        setDisputeModalOpen,
        disputeAction,
        setDisputeAction,
        handleResolveDispute
    } = props;

    const isCedula = transaction.type?.code?.includes("CEDULA");
    const isJuridical = transaction.type?.code?.includes("JURIDICAL") || transaction.additionalData?.applicantType === "JURIDICAL";
    const canApprove = (transaction.status === "FOR_REQUESTING") && (userRole === "TREASURY_STAFF" || userRole === "ADMIN") && !isReadOnlyAide;
    const hasDispute = transaction.status === "RETURN_REQUESTED" || transaction.status === "REFUND_REQUESTED" || !!transaction.disputeReason;
    const [isProfileOpen, setIsProfileOpen] = React.useState(true);
    const [isRequirementsOpen, setIsRequirementsOpen] = React.useState(true);
    const additional = transaction.additionalData || {};
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const deliveryAddr = transaction.deliveryAddress
        ? (typeof transaction.deliveryAddress === 'string' ? JSON.parse(transaction.deliveryAddress) : transaction.deliveryAddress)
        : null;
    const fiscal = (transaction.fiscalSnapshot as any) || null;

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
                {/* LEFT COLUMN: Assessment & Identity */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* TRANSACTION CATEGORY CARD */}
                    <TransactionInfoCard
                        transactionName={transaction.type.name}
                        categoryLabel="General Service"
                        themeColor={themeColor}
                    />

                    {/* RETURN REQUESTED DETAILS */}
                    {hasDispute && (
                        <div className="bg-white dark:bg-[#151b28] p-10 rounded-[2.5rem] border border-orange-500/20 dark:border-orange-500/10 shadow-2xl shadow-slate-900/5 space-y-6 animate-in fade-in duration-300">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 block italic leading-none">Return Request Details</span>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white mt-1">Dispute Claims Overview</h3>
                            </div>
                            <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-2xl space-y-3">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Reason for Return</span>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed italic">
                                    &ldquo;{transaction.disputeReason || "No explanation provided by the citizen."}&rdquo;
                                </p>
                            </div>
                            {transaction.disputeProofUrl && (
                                <div className="space-y-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Proof of Dispute/Return</span>
                                    <div
                                        onClick={() => handleViewFile?.(transaction.disputeProofUrl, "Dispute Claim Evidence")}
                                        className="relative h-[200px] w-full rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-orange-500/50 transition-all select-none"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={transaction.disputeProofUrl} alt="Dispute Proof" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                            <span className="text-[9px] font-black text-white tracking-widest uppercase italic bg-orange-500 px-3 py-1 rounded-full">View Dispute Evidence</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* MAIN ASSESSMENT CARD */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-6 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
                        {/* IDENTIFIER / ACCORDION HEADER */}
                        <div
                            className="flex justify-between items-center cursor-pointer select-none"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                        Primary Applicant Profile
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
                                <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                    {resident.firstName} {resident.lastName}
                                </h1>
                            </div>
                            <div className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white transition-all focus:outline-none">
                                {isProfileOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>

                        {/* ACCORDION CONTENT */}
                        {isProfileOpen && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                {/* TOP METRICS GRID */}
                                <div className="grid grid-cols-4 gap-4">
                                    <div
                                        className="bg-[#f8fafd] dark:bg-white/5 p-4 rounded-2xl space-y-1 cursor-help"
                                        title={transaction.isStudent ? String(declaredValue) : `₱${Number(declaredValue).toLocaleString()}`}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{declaredLabel}</span>
                                        <p className="text-base font-black italic tracking-tighter dark:text-slate-200 truncate">
                                            {transaction.isStudent ? String(declaredValue) : `₱${Number(declaredValue).toLocaleString()}`}
                                        </p>
                                    </div>
                                    <div
                                        className="bg-[#f8fafd] dark:bg-white/5 p-4 rounded-2xl space-y-1 cursor-help"
                                        title={transaction.paymentType?.replace(/_/g, " ") || ""}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment Mode</span>
                                        <p className="text-xl font-black italic tracking-tighter dark:text-slate-200 leading-none truncate">
                                            {transaction.paymentType?.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                    <div
                                        className="bg-[#f8fafd] dark:bg-white/5 p-4 rounded-2xl space-y-1 cursor-help"
                                        title={transaction.fulfillmentType?.replace(/_/g, " ") || ""}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Fulfillment</span>
                                        <p className="text-xl font-black italic tracking-tighter dark:text-slate-200 leading-none truncate">
                                            {transaction.fulfillmentType?.replace(/_/g, " ")}
                                        </p>
                                    </div>
                                    <div
                                        className="bg-[#f8fafd] dark:bg-white/5 p-4 rounded-2xl space-y-1 cursor-help"
                                        title={`₱${calcResult.totalAmount.toLocaleString()}`}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Total Amount</span>
                                        <p className="text-xl font-black italic tracking-tighter text-primary truncate">
                                            ₱{calcResult.totalAmount.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* INCOME SOURCE */}
                                {additional.incomeSource && (
                                    <div className="border-t border-dashed border-slate-100 dark:border-white/5 pt-4 space-y-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                            Primary Source of Income
                                        </span>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-4 rounded-xl flex items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black italic text-sm select-none">
                                                    {additional.incomeSource.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black italic uppercase tracking-tight text-slate-800 dark:text-white leading-tight">
                                                        {additional.incomeSource === "PROFESSION" ? "Profession" : additional.incomeSource === "BUSINESS" ? "Business" : "Real Property"}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* COMPUTATION BREAKDOWN */}
                                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Tax Computation Breakdown
                                    </h3>
                                    <div className="space-y-3">
                                        {/* Basic community tax or service fee */}
                                        {calcResult.basicTax > 0 && (
                                            <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>{isCedula ? "Basic Community Tax" : "Base Service Fee"}</span>
                                                <span className="dark:text-slate-200">₱{calcResult.basicTax.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {/* Additional community tax (for Cedula only) */}
                                        {isCedula && calcResult.additionalTax > 0 && (
                                            <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>Additional Tax {isJuridical ? "(₱2.00 per ₱5,000 gross)" : "(₱1.00 per ₱1,000 gross)"}</span>
                                                <span className="dark:text-slate-200">₱{calcResult.additionalTax.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {/* Miscellaneous fee (e.g. Late Registration Fee) */}
                                        {calcResult.miscFee && calcResult.miscFee > 0 && (
                                            <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>Late Registration Fee</span>
                                                <span className="dark:text-slate-200">₱{calcResult.miscFee.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {/* FIXED TAX LINE ITEMS / ADDITIONAL FEES — rendered if they exist */}
                                        {calcResult.lineItems && calcResult.lineItems.length > 0 && (
                                            calcResult.lineItems.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                    <span>{item.label}</span>
                                                    <span className="dark:text-slate-200">₱{(Number(item.amount) || 0).toFixed(2)}</span>
                                                </div>
                                            ))
                                        )}

                                        {/* PENALTY CHARGE — always visible if applicable */}
                                        {calcResult.penalty > 0 && (
                                            <div className="flex justify-between items-center text-sm font-bold text-orange-500 italic">
                                                <span>Penalty Charge</span>
                                                <span>₱{calcResult.penalty.toFixed(2)}</span>
                                            </div>
                                        )}

                                        {/* ADDITIONAL FEES EDITOR — Treasury Staff / Admin only when FOR_REQUESTING */}
                                        {(transaction.status === "FOR_REQUESTING" && (userRole === "TREASURY_STAFF" || userRole === "ADMIN")) && (
                                            <div className="pt-2 space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    Additional Fees
                                                </p>
                                                <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                                                    {feeLineItems.map((item, idx) => (
                                                        <div key={idx} className="flex gap-3 items-center group bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 px-3 py-1.5 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                                            <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 w-6 h-6 flex items-center justify-center rounded-lg select-none shrink-0">
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                placeholder={transaction.isStudent ? "Add a Additional fee here" : "Fee Description"}
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
                                            </div>
                                        )}

                                        {/* DELIVERY FEE — always visible if applicable */}
                                        {transaction.fulfillmentType === "DELIVERY" && (
                                            <div className="flex justify-between items-center pt-2 gap-4">
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 italic">Delivery Fee</span>
                                                <span className="text-xs font-black dark:text-white italic">
                                                    ₱{deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {/* Total Amount */}
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

                    {/* RESIDENT IDENTITY PROFILE ACCORDION */}
                    <ResidentIdentityProfile
                        resident={resident}
                        safeFormatDate={safeFormatDate}
                        themeColor={themeColor}
                    />

                    {/* EVIDENCE VAULT */}
                    <div className="bg-white dark:bg-[#151b28] p-10 rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                        <div
                            className="flex justify-between items-center cursor-pointer select-none"
                            onClick={() => setIsRequirementsOpen(!isRequirementsOpen)}
                        >
                            <div className="flex items-center gap-2">
                                <BadgeCheck className="w-5 h-5 text-primary" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">All Requirements</span>
                            </div>
                            <div className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white transition-all focus:outline-none">
                                {isRequirementsOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </div>
                        </div>
                        {isRequirementsOpen && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {evidenceDocs.map((doc, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => doc.url && handleViewFile?.(doc.url, doc.label, evidenceDocs, idx)}
                                        className="relative aspect-[4/3] rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all select-none"
                                    >
                                        {doc.url ? (
                                            isImageFile(doc.url) ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={doc.url} alt={doc.label} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
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
                                                    className="backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px]"
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

                    {/* DYNAMIC REASON OF REQUEST */}
                    {transaction.isStudent && (
                        <div className="bg-white dark:bg-[#151b28] p-10 rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6 animate-in fade-in duration-300">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    Purpose / Reason of Request
                                </span>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white mt-1">Student Request Purpose</h3>
                            </div>
                            <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <p className="text-sm font-bold text-slate-750 dark:text-slate-200 leading-relaxed italic">
                                    &ldquo;{additional.purpose || "No reason specified."}&rdquo;
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Timeline & Logistics — sticky */}
                <div className="col-span-12 lg:col-span-4 space-y-8 lg:sticky lg:top-8 lg:self-start">
                    {/* STATUS TRACKING TIMELINE */}
                    {transaction.status !== "RETURN_REQUESTED" && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-10 border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-8">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Status Tracking</span>
                                {/* <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mt-1 leading-none">Timeline</h2> */}
                            </div>

                            <div className="relative pl-6 border-l-2 border-slate-100 dark:border-white/5 space-y-8">
                                {steps.map((step, idx) => {
                                    const isCompleted = idx < currentStepIdx;
                                    const isActive = idx === currentStepIdx;
                                    return (
                                        <div key={step.id} className="relative">
                                            <div className={cn(
                                                "absolute w-5 h-5 rounded-full -left-[35px] border-2 transition-all duration-500 flex items-center justify-center text-white",
                                                isActive
                                                    ? "bg-primary border-primary ring-4 ring-primary/20 scale-110"
                                                    : isCompleted
                                                        ? "bg-emerald-500 border-emerald-500 scale-100"
                                                        : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-white/10 scale-95 text-slate-400 dark:text-slate-600"
                                            )}>
                                                {isCompleted ? (
                                                    <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                                                ) : (
                                                    <span className="text-[8px] font-black">{idx + 1}</span>
                                                )}
                                            </div>
                                            <div className="space-y-1 pl-2">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-widest",
                                                    isActive ? "text-primary" : isCompleted ? "text-emerald-500" : "text-slate-400 dark:text-slate-600"
                                                )}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* DISPUTE RESOLUTION ACTIONS */}
                    {transaction.status === "RETURN_REQUESTED" && (
                        <div className="space-y-3 animate-in slide-in-from-bottom-4">
                            <div className="p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-center space-y-1 mb-4">
                                <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-500 italic">Review Action Required</p>
                                <p className="text-[11px] font-bold text-orange-900/60 dark:text-orange-400/60 leading-relaxed uppercase tracking-tight italic">
                                    Assess the citizen&apos;s claim before resolving the dispute.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Dialog open={disputeModalOpen && disputeAction === 'APPROVE'} onOpenChange={(open) => { setDisputeModalOpen(open); setDisputeAction('APPROVE'); setRemarks(''); }}>
                                    <DialogTrigger asChild>
                                        <Button
                                            style={{ backgroundColor: themeColor }}
                                            className="h-14 rounded-2xl text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 hover:opacity-90 w-full"
                                        >
                                            <Check className="w-4 h-4 mr-2" /> Approve Return
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                        <DialogHeader className="space-y-3">
                                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                Approve <span style={{ color: themeColor }}>Return</span>
                                            </DialogTitle>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Sorry Letter for Email</p>
                                        </DialogHeader>
                                        <div className="space-y-6 py-6">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type Apology Letter</Label>
                                                <Textarea
                                                    placeholder="Type sorry letter to be sent to citizen (e.g. We are sorry for the issue. You can pick it up again...)"
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic p-6 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleResolveDispute}
                                            disabled={isResolvingDispute || !remarks}
                                            style={{ backgroundColor: themeColor }}
                                            className="w-full h-14 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all hover:opacity-90"
                                        >
                                            {isResolvingDispute ? "Processing..." : "Confirm & Send Apology Letter"}
                                        </Button>
                                    </DialogContent>
                                </Dialog>

                                <Dialog open={disputeModalOpen && disputeAction === 'REJECT'} onOpenChange={(open) => { setDisputeModalOpen(open); setDisputeAction('REJECT'); setRemarks(''); }}>
                                    <DialogTrigger asChild>
                                        <Button className="h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/10 transition-all active:scale-95 w-full">
                                            <Ban className="w-4 h-4 mr-2" /> Reject Return
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                        <DialogHeader className="space-y-3">
                                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                Reject <span className="text-red-500">Return</span>
                                            </DialogTitle>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Rejection Protocol</p>
                                        </DialogHeader>
                                        <div className="space-y-6 py-6">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Rejection</Label>
                                                <Textarea
                                                    placeholder="Why is this return request being declined? (e.g., Document is authentic and contains no error...)"
                                                    value={remarks}
                                                    onChange={(e) => setRemarks(e.target.value)}
                                                    className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic p-6 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <Button onClick={handleResolveDispute} disabled={isResolvingDispute || !remarks} className="w-full h-14 bg-red-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all">
                                            {isResolvingDispute ? "Processing..." : "Confirm Rejection"}
                                        </Button>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    )}

                    {/* ACTION BUTTONS — below the card, no card wrapper */}
                    {canApprove && (
                        <div className="space-y-3">
                            {/* APPROVE — full width */}
                            {transaction.status !== "PAID" && (
                                <Button
                                    onClick={transaction.status === "PAID" ? handleConfirmPayment : handleEvaluate}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                                >
                                    {actionLoading ? "Processing..." : transaction.status === "PAID" ? "Approve Payment & Start Processing" : "Approve & Proceed to Payment"}
                                </Button>
                            )}

                            {/* REVISION + REJECT — side by side */}
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => {
                                        setRemarks("");
                                        setIsRequestingRevision(true);
                                    }}
                                    disabled={actionLoading}
                                    className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white font-black italic uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-amber-500/10 active:scale-95 transition-all"
                                >
                                    {transaction.status === "PAID" ? "Decline Payment Proof" : "Request Revision"}
                                </Button>
                                <Button
                                    onClick={() => { setRemarks(""); setIsRejecting(true); }}
                                    disabled={actionLoading}
                                    className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-red-600/10 active:scale-95 transition-all"
                                >
                                    Decline
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* INTERACTIVE RELEASE HUB FOR PROCESSING PHASES */}
                    {["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING"].includes(transaction.status) && (
                        <div className="space-y-6">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 block italic leading-none">Document Issuance</span>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white mt-1">Fulfillment Actions</h3>
                            </div>

                            {/* Document Inputs Block */}
                            <div className="space-y-4">
                                {/* Official Receipt (OR) upload — Required only when status is PAID */}
                                {transaction.status === "PAID" && (
                                    <div className="space-y-4 w-full">
                                        {/* Separate Card 1: Citizen Payment Proof */}
                                        {((transaction.paymentType === "E_PAYMENT" || transaction.paymentType === "BANK_TRANSFER") || transaction.paymentProofUrl || additional.gcashReferenceNo || additional.paymentReference || transaction.paymentReference) && (
                                            <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">Citizen Payment Proof</Label>
                                                </div>

                                                {/* Proof of Payment Image */}
                                                {(transaction.paymentProofUrl || additional.paymentReferenceUrl || (transaction.paymentReference && (transaction.paymentReference.startsWith("http") || transaction.paymentReference.startsWith("/")))) ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewFile?.(transaction.paymentProofUrl || additional.paymentReferenceUrl || transaction.paymentReference, "GCash Payment Proof")}
                                                        className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={transaction.paymentProofUrl || additional.paymentReferenceUrl || transaction.paymentReference}
                                                            alt="Payment Proof"
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
                                                ) : null}

                                                {/* Reference Number with Copy Button */}
                                                {(() => {
                                                    const refNo = additional.gcashReferenceNo || (transaction as any).gcashReferenceNo || (transaction.paymentReference && !(transaction.paymentReference.startsWith("http") || transaction.paymentReference.startsWith("/")) ? transaction.paymentReference : null) || additional.paymentReference || "N/A";
                                                    if (refNo === "N/A" || refNo.toLowerCase() === "n/a" || refNo.toLowerCase() === "na") return null;
                                                    return (
                                                        <div className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200/50 dark:border-white/5 space-y-2 group/ref relative overflow-hidden transition-all hover:border-primary/20 shadow-sm">
                                                            <div className="flex items-center justify-between gap-4">
                                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">GCash Reference No.</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        navigator.clipboard.writeText(refNo);
                                                                        toast.success("Reference Number Copied!");
                                                                    }}
                                                                    className="text-[8px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-all flex items-center gap-1.5 bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/10 hover:scale-105 active:scale-95 shrink-0"
                                                                >
                                                                    <Copy className="w-3 h-3" />
                                                                    Copy
                                                                </button>
                                                            </div>
                                                            <div className="text-sm font-black italic tracking-widest font-mono text-slate-800 dark:text-slate-200 select-all">
                                                                {refNo}
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* Separate Card 2: Official Receipt (OR) Upload */}
                                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                                            {/* O.R. Series Number input */}
                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">O.R. Series Number <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    type="text"
                                                    value={orSeriesNumber || ""}
                                                    onChange={(e) => setOrSeriesNumber?.(e.target.value)}
                                                    placeholder="Enter O.R. Series Number..."
                                                    className="h-12 rounded-xl border-slate-100 dark:border-white/5 italic font-black text-sm tracking-[0.2em] focus:ring-primary/10 dark:bg-slate-950 dark:text-white"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">Upload Official Receipt (OR) <span className="text-rose-500">*</span></Label>
                                                <Input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => setOrFile(e.target.files?.[0] || null)}
                                                    className="h-12 rounded-xl border-slate-100 dark:border-white/5 text-xs focus:ring-primary/10 dark:bg-slate-950 dark:text-white"
                                                />
                                            </div>
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
                                    </div>
                                )}

                                {/* CTC Serial Number input — Required when status is FOR_PROCESSING */}
                                {transaction.status === "FOR_PROCESSING" && (
                                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-3">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">Community Tax Certificate (CTC) Serial Number <span className="text-rose-500">*</span></Label>
                                        <Input
                                            value={ctcNumber}
                                            onChange={(e) => setCtcNumber(e.target.value)}
                                            placeholder="ENTER CTC SERIAL NUMBER..."
                                            className="h-12 rounded-xl border-slate-100 dark:border-white/5 italic font-black text-sm tracking-[0.2em] focus:ring-primary/10 dark:bg-slate-950 dark:text-white"
                                        />
                                    </div>
                                )}

                                {/* E-Copy document upload — Required when status is FOR_PROCESSING */}
                                {transaction.status === "FOR_PROCESSING" && (
                                    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-white/5 space-y-3">
                                        <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">Upload Official E-Copy Document (PDF/Image) <span className="text-rose-500">*</span></Label>
                                        <Input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => setECopyFile(e.target.files?.[0] || null)}
                                            className="h-12 rounded-xl border-slate-100 dark:border-white/5 text-xs focus:ring-primary/10 dark:bg-slate-950 dark:text-white"
                                        />
                                        {(eCopyPreview || (transaction.eCopyUrl && transaction.eCopyUrl !== "null" && transaction.eCopyUrl !== "undefined" && transaction.eCopyUrl !== "")) && (
                                            <div className="mt-2">
                                                {(() => {
                                                    const isECopyPdf = eCopyFile
                                                        ? (eCopyFile.type === "application/pdf" || eCopyFile.name.toLowerCase().endsWith(".pdf"))
                                                        : (transaction.eCopyUrl?.toLowerCase()?.includes(".pdf") || false);

                                                    if (isECopyPdf) {
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleViewFile?.(eCopyPreview || transaction.eCopyUrl, "Official E-Copy PDF")}
                                                                className="w-full flex items-center justify-between p-5 bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left animate-in fade-in duration-300 group"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl shrink-0 group-hover:scale-110 transition-transform">
                                                                        📕
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Official E-Copy PDF</p>
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
                                                            onClick={() => handleViewFile?.(eCopyPreview || transaction.eCopyUrl, "Official E-Copy Document")}
                                                            className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block"
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={eCopyPreview || transaction.eCopyUrl}
                                                                alt="E-Copy Preview"
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
                            </div>

                            {/* Control Actions */}
                            <div className="space-y-3 pt-2">
                                {/* Print Waybill for deliveries */}
                                {transaction.fulfillmentType === "DELIVERY" && ["FOR_PROCESSING", "FOR_PICKING"].includes(transaction.status) && (
                                    <Button
                                        onClick={handlePrintWaybill}
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all"
                                    >
                                        Generate & Print Waybill
                                    </Button>
                                )}

                                {transaction.status !== "FOR_PICKING" && transaction.status !== "FOR_CLAIM" ? (
                                    <>
                                        <Button
                                            onClick={handleRelease}
                                            disabled={
                                                actionLoading ||
                                                (transaction.status === "PAID" && (!orSeriesNumber || (!orFile && !transaction.orUrl))) ||
                                                (transaction.status === "FOR_PROCESSING" && (
                                                    (!ctcNumber && !transaction.cedula?.ctcNumber) ||
                                                    (!eCopyFile && !transaction.eCopyUrl)
                                                ))
                                            }
                                            className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                                        >
                                            {actionLoading
                                                ? "Submitting..."
                                                : transaction.status === "PAID"
                                                    ? "Confirm & Proceed to Processing"
                                                    : (transaction.fulfillmentType === "DELIVERY" ? "Approve & Dispatch to Courier" : "Approve & Ready for Claiming")
                                            }
                                        </Button>


                                    </>
                                ) : (
                                    !(transaction.status === "FOR_PICKING" && transaction.fulfillmentType === "DELIVERY") && (
                                        <Button
                                            onClick={handleRelease}
                                            disabled={actionLoading}
                                            className="w-full h-16 rounded-2xl bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                                        >
                                            {actionLoading ? "Releasing..." : transaction.fulfillmentType === "DELIVERY" ? "Dispatch to Courier" : "Release Document to Resident"}
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>
                    )}

                    {/* WAYBILL FOR DELIVERIES */}
                    {transaction.fulfillmentMode === "DELIVERY" && (
                        <div className="bg-white dark:bg-[#151b28] p-10 rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Logistics</span>
                                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mt-1 leading-none">Delivery Details</h2>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals for Rejection & Revision */}
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
