/* eslint-disable @typescript-eslint/no-unused-vars */
import { TreasuryViewProps } from "./types";
import React from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Check,
    Coins,
    FileText,
    AlertCircle,
    RotateCw,
    ExternalLink,
    Upload,
    Clock,
    Eye,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Copy,
    Hash
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import ResidentIdentityProfile from "@/app/admin/treasury/[id]/components/ResidentIdentityProfile";
import TransactionInfoCard from "@/app/admin/treasury/[id]/components/TransactionInfoCard";
import RejectionRevisionControls from "@/app/admin/treasury/[id]/components/RejectionRevisionControls";
import PrintWaybill from "@/app/admin/treasury/[id]/components/PrintWaybill";
import { cn } from "@/lib/utils";

export default function BirthPsaEndorsementView(props: TreasuryViewProps) {
    const {
        transaction,
        rawUserRole,
        isReadOnlyAide,
        backUrl,
        actionLoading,
        remarks,
        setRemarks,
        isRejecting,
        setIsRejecting,
        isRequestingRevision,
        setIsRequestingRevision,
        deliveryFee,
        eCopyFile,
        setECopyFile,
        eCopyPreview,
        setECopyPreview,
        orFile,
        setOrFile,
        orPreview,
        setOrPreview,
        receiptFile,
        setReceiptFile,
        receiptPreview,
        setReceiptPreview,
        handleReceiptFileSelect,
        themeColor,
        fetchTransaction,
        handleEvaluate,
        handleConfirmPayment,
        handleDeclinePaymentProof,
        handleRelease,
        handleReject,
        handleRequestRevision,
        safeFormatDate,
        displayTotal,
        evidenceDocs,
        steps,
        currentStepIdx,
        branding,
        calcResult,
        registryBookVerification,
        setRegistryBookVerification,
        birthRegDocFile,
        setBirthRegDocFile,
        birthRegDocPreview,
        setBirthRegDocPreview,
        orSeriesNumber,
        setOrSeriesNumber,
        handleViewFile,
        feeLineItems,
        addFeeLineItem,
        removeFeeLineItem,
        updateFeeLineItem,
        miscFee,
        setMiscFee,
        handleProcessRequest,
        handlePrintWaybill
    } = props;

    const [isAssessmentOpen, setIsAssessmentOpen] = React.useState(true);
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const additional = transaction.additionalData || {};

    const deliveryAddr = transaction.deliveryAddress
        ? (typeof transaction.deliveryAddress === 'string' ? JSON.parse(transaction.deliveryAddress) : transaction.deliveryAddress)
        : null;
    const fiscal = transaction.fiscalSnapshot || null;

    const isTreasuryContext = backUrl?.includes("/admin/treasury") || rawUserRole === "TREASURY_STAFF";
    const subjectName = additional.subjectFullName || additional.subjectName || "N/A";
    const subjectDateOfBirth = additional.subjectDateOfBirth || additional.dateOfEvent || "";
    const mothersMaidenName = additional.mothersMaidenName || additional.motherName || "";

    // Evidences particular to PSA Endorsement
    const psaNegativeCertUrl = additional.psaNegativeCert || null;
    const form1aUrl = additional.form1a || null;

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
            {/* Header branding band */}
            <div className={`h-1.5 w-full ${themeColor} transition-all duration-500`} />

            {/* Main Container */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

                {/* Back Button & Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in duration-300">
                    <Link
                        href={backUrl}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Requests
                    </Link>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-3 py-1 text-[9px] font-black uppercase tracking-widest border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 rounded-full">
                            ID: {transaction.id}
                        </Badge>
                        <Badge className={`px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-full text-white shadow-lg ${themeColor} shadow-primary/10`}>
                            {transaction.status.replace(/_/g, " ")}
                        </Badge>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left Column: Dossier Details & Evidence */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* TRANSACTION CATEGORY CARD */}
                        <TransactionInfoCard
                            transactionName="Birth PSA Endorsement Request"
                            categoryLabel="Local Civil Registry"
                            themeColor={themeColor}
                        />

                        {/* MAIN ASSESSMENT CARD */}
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-12 animate-in fade-in duration-300">
                            {/* IDENTIFIER / ACCORDION HEADER */}
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setIsAssessmentOpen(!isAssessmentOpen)}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                            Subject / Record Owner Name
                                        </span>
                                    </div>
                                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                        {subjectName}
                                    </h1>
                                </div>
                                <div className="w-10 h-10 rounded-full hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-primary dark:hover:text-white transition-all focus:outline-none shrink-0">
                                    {isAssessmentOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </div>
                            </div>

                            {isAssessmentOpen && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-300">
                                    {/* TOP METRICS GRID */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Relationship to Subject</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 uppercase">
                                                {additional.relationship || "SELF"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Fulfillment</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 leading-none uppercase">
                                                {transaction.fulfillmentType?.replace(/_/g, " ") || "--"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment Mode</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 leading-none uppercase">
                                                {transaction.paymentType?.replace(/_/g, " ") || "--"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Total Amount</span>
                                            <p className="text-lg font-black italic tracking-tighter text-primary">₱{calcResult.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>

                                    {/* COMPUTATION BREAKDOWN */}
                                    <div className="space-y-6 pt-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                                            Fee Assessment Breakdown
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>PSA Endorsement Fee</span>
                                                <span className="dark:text-slate-200 font-black">
                                                    ₱{(transaction.type?.baseFee || 130.00).toFixed(2)}
                                                </span>
                                            </div>

                                            {transaction.fulfillmentType === "DELIVERY" && (
                                                <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                    <span>Delivery Fee</span>
                                                    <span className="dark:text-slate-200 font-black">₱{deliveryFee.toFixed(2)}</span>
                                                </div>
                                            )}

                                            {/* RENDER STATIC ADDITIONAL FEES */}
                                            {feeLineItems && feeLineItems.length > 0 && feeLineItems.map((item: any, idx: number) => {
                                                if (!item.readonly && ["FOR_INSPECTION", "FOR_REQUESTING"].includes(transaction.status)) {
                                                    return null;
                                                }
                                                const feeAmt = parseFloat(item.amount) || 0;
                                                if (feeAmt === 0) return null;
                                                return (
                                                    <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                        <span>{item.label || "Additional Fee"}</span>
                                                        <span className="dark:text-slate-200 font-black">
                                                            ₱{feeAmt.toFixed(2)}
                                                        </span>
                                                    </div>
                                                );
                                            })}

                                            {/* ADDITIONAL FEES EDITOR */}
                                            {["FOR_INSPECTION", "FOR_REQUESTING"].includes(transaction.status) && (
                                                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-white/5 pt-4">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                        Additional Fees
                                                    </p>
                                                    <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                                                        {feeLineItems?.map((item, idx) => {
                                                            if (item.readonly) return null;
                                                            return (
                                                                <div key={idx} className={cn(
                                                                    "flex gap-3 items-center group bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 px-3 py-1.5 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all",
                                                                    item.readonly && "opacity-75 bg-slate-50 dark:bg-white/[0.02] cursor-not-allowed select-none"
                                                                )}>
                                                                    <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 w-6 h-6 flex items-center justify-center rounded-lg select-none shrink-0">
                                                                        {String(idx + 1).padStart(2, '0')}
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Fee Description"
                                                                        value={item.label}
                                                                        disabled={item.readonly}
                                                                        onChange={(e) => updateFeeLineItem?.(idx, 'label', e.target.value)}
                                                                        className="flex-1 h-9 bg-transparent text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none border-none p-0 focus:ring-0 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                                                                    />
                                                                    <div className="relative w-28 shrink-0 flex items-center border-l border-slate-100 dark:border-white/5 pl-3">
                                                                        <span className="text-xs font-black text-slate-400 mr-1 select-none">₱</span>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="0.00"
                                                                            value={item.amount}
                                                                            disabled={item.readonly}
                                                                            onChange={(e) => updateFeeLineItem?.(idx, 'amount', e.target.value)}
                                                                            className="w-full bg-transparent text-sm font-black text-right text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed"
                                                                        />
                                                                    </div>
                                                                    {!item.readonly && feeLineItems.length > 1 ? (
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => removeFeeLineItem?.(idx)}
                                                                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    ) : (
                                                                        <div className="w-8 h-8 shrink-0" />
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
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

                                            <div className="border-t border-dotted border-slate-300 dark:border-white/10 pt-4 mt-4 flex justify-between items-center">
                                                <span className="text-base font-black uppercase italic tracking-widest text-slate-900 dark:text-white leading-none">Total Amount</span>
                                                <span className="text-3xl font-black italic tracking-tighter text-primary leading-none">
                                                    ₱{calcResult.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                            titleColorText="Informant"
                            titleWhiteText="Profile"
                            subtitleText="Verified Requester / Informant Data Dossier"
                            relationship={additional.relationship}
                        />

                        {/* Birth PSA Endorsement Specific details panel */}
                        <div className="bg-[#111827] border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 italic">
                                    Birth PSA Endorsement Information
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">
                                        Subject Details
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Subject Full Name</span>
                                            <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                {subjectName}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Date of Birth</span>
                                            <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                {safeFormatDate(subjectDateOfBirth)}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">{"Mother's Maiden Name"}</span>
                                            <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                {mothersMaidenName || "—"}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">
                                        Informant Details
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Informant Full Name</span>
                                            <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                {[additional.informantFirstName, additional.informantMiddleName, additional.informantLastName].filter(Boolean).join(" ") + (additional.informantSuffix ? " " + additional.informantSuffix : "") || "—"}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Contact Number</span>
                                                <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                    {additional.contactNumber || "—"}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Civil Status</span>
                                                <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                    {additional.informantCivilStatus || "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ATTACHMENT CARD FOR EVIDENCE */}
                        {((psaNegativeCertUrl || form1aUrl) && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1e293b] dark:text-white leading-none">
                                    Submitted Identifications & Requirements
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {psaNegativeCertUrl && (
                                        <div
                                            onClick={() => handleViewFile?.(psaNegativeCertUrl, "PSA Negative Certification")}
                                            className="relative group rounded-3xl overflow-hidden aspect-[3/2] bg-[#f8fafd] dark:bg-white/5 border border-slate-200/50 dark:border-white/5 cursor-pointer shadow-md hover:shadow-xl transition-all"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={psaNegativeCertUrl}
                                                alt="PSA Negative Certification"
                                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10">
                                                <div
                                                    style={{ backgroundColor: themeColor }}
                                                    className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg animate-in zoom-in-75 duration-200"
                                                >
                                                    <span>VIEW</span>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[8px] truncate z-10">
                                                PSA Negative Certification (Required)
                                            </div>
                                        </div>
                                    )}
                                    {form1aUrl && (
                                        <div
                                            onClick={() => handleViewFile?.(form1aUrl, "Form 1A (Local Copy)")}
                                            className="relative group rounded-3xl overflow-hidden aspect-[3/2] bg-[#f8fafd] dark:bg-white/5 border border-slate-200/50 dark:border-white/5 cursor-pointer shadow-md hover:shadow-xl transition-all"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={form1aUrl}
                                                alt="Form 1A (Local Copy)"
                                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10">
                                                <div
                                                    style={{ backgroundColor: themeColor }}
                                                    className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg animate-in zoom-in-75 duration-200"
                                                >
                                                    <span>VIEW</span>
                                                </div>
                                            </div>
                                            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[8px] truncate z-10">
                                                Form 1A (Local Registry Copy)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column: Workflow Actions Controls */}
                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8 animate-in fade-in duration-300">
                        {/* PHASE TRACKER STEPPER */}
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
                            <div>
                                <h3 className="text-md font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200">Status Tracker</h3>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic mt-1">Status phase progress</p>
                            </div>
                            <div className="relative pl-6 space-y-6">
                                <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-slate-100 dark:bg-white/5" />
                                {steps.map((step, idx) => {
                                    const isCompleted = currentStepIdx > idx;
                                    const isCurrent = currentStepIdx === idx;
                                    return (
                                        <div key={idx} className="flex gap-4 relative items-center">
                                            <div className={cn(
                                                "w-6.5 h-6.5 rounded-full flex items-center justify-center relative z-10 shrink-0 text-[10px] font-bold border-2 transition-all",
                                                isCompleted ? "bg-[#10b981] border-[#10b981] text-white shadow-lg shadow-emerald-500/10" :
                                                    isCurrent ? "bg-primary border-primary text-white shadow-lg shadow-primary/10" :
                                                        "bg-white dark:bg-[#151b28] border-slate-200 dark:border-slate-800 text-slate-400"
                                            )}>
                                                {isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest leading-none",
                                                    isCurrent ? "text-primary font-black" : "text-slate-500"
                                                )}>
                                                    {step.label}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* WORKFLOW CONTROLS ACTIONS */}
                        <RejectionRevisionControls
                            actionLoading={actionLoading}
                            isRejecting={isRejecting}
                            setIsRejecting={setIsRejecting}
                            isRequestingRevision={isRequestingRevision}
                            setIsRequestingRevision={setIsRequestingRevision}
                            remarks={remarks}
                            setRemarks={setRemarks}
                            handleReject={handleReject}
                            handleRequestRevision={handleRequestRevision}
                        />

                        {/* SPECIFIC REGISTRAR OPERATION STEP CONTROLLER */}
                        {transaction.status === "FOR_INSPECTION" && (
                            <div className="space-y-6">
                                <Button
                                    onClick={handleEvaluate}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all shadow-green-500/10"
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    Proceed to Payment
                                </Button>

                                <div className="flex gap-2">
                                    {(transaction.revisionCount || 0) < 3 && (
                                        <Button
                                                                                onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                                                                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all"
                                                                            >
                                                                                Revision
                                                                            </Button>
                                    )}
                                    <Button
                                        onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all"
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* REGISTRAR FOR_REQUESTING / UNDER_REVIEW CONTROLLER */}
                        {!isTreasuryContext && (transaction.status === "FOR_REQUESTING" || transaction.status === "UNDER_REVIEW") && (
                            <div className="space-y-6">
                                <Button
                                    onClick={handleEvaluate}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all shadow-green-500/10"
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    Approve & Send Assessment
                                </Button>

                                <div className="flex gap-2">
                                    {(transaction.revisionCount || 0) < 3 && (
                                        <Button
                                                                                onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                                                                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all"
                                                                            >
                                                                                Revision
                                                                            </Button>
                                    )}
                                    <Button
                                        onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all"
                                    >
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* REGISTRAR FOR_REINSPECTION CONTROLLER */}
                        {transaction.status === "FOR_REINSPECTION" && (
                            <div className="space-y-6">
                                {/* Payment Reference Card */}
                                {(() => {
                                    const refNo =
                                        additional?.paymentId ||
                                        additional?.reference_number ||
                                        additional?.gcashReferenceNo ||
                                        (transaction.paymentReference && !transaction.paymentReference.startsWith("http") && !transaction.paymentReference.startsWith("/") ? transaction.paymentReference : null) ||
                                        additional?.payment_id ||
                                        transaction.paymentId;

                                    if (!refNo) return null;

                                    return (
                                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                    <Hash className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Payment Reference</span>
                                                    <span className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Reference ID</span>
                                                </div>
                                            </div>

                                            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2 mt-2 group/ref relative overflow-hidden transition-all hover:border-primary/20 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                        Reference ID (Read-only)
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(refNo);
                                                            toast.success("Reference number copied!");
                                                        }}
                                                        className="text-slate-400 hover:text-primary transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <p className="text-sm font-black italic tracking-widest font-mono text-slate-800 dark:text-slate-200 select-all">
                                                    {refNo}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* O.R. Details Card */}
                                {(() => {
                                    const orNo = additional?.orSeriesNumber || transaction.orSeriesNumber || additional?.orNumber || additional?.orNo;
                                    const orDocUrl = additional?.orDocumentUrl || transaction.orUrl || additional?.orUrl;

                                    if (!orNo && !orDocUrl) return null;

                                    return (
                                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Treasury Official Receipt</span>
                                                    <span className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">O.R. Details</span>
                                                </div>
                                            </div>

                                            {orNo && (
                                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block leading-none">O.R. Series Number</span>
                                                    <p className="text-xs font-black uppercase italic tracking-wider text-slate-800 dark:text-slate-200">
                                                        {orNo}
                                                    </p>
                                                </div>
                                            )}

                                            {orDocUrl && (
                                                <div className="space-y-2">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 block leading-none">Scanned O.R. Copy</span>
                                                    <div className="bg-[#f8fafd] dark:bg-[#0c111d] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-3 flex items-center justify-between shadow-sm">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                                                <FileText className="w-5 h-5 text-emerald-500" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Official Receipt</span>
                                                                <span className="text-[8px] text-slate-400 italic">Attached OR Document</span>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => handleViewFile?.(orDocUrl, "Official Receipt Document")}
                                                            variant="ghost"
                                                            size="icon"
                                                            className="w-8 h-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/10"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="p-6 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                        <Clock className="w-6 h-6 animate-pulse" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200 font-bold">Ready for Registrar Processing</h4>
                                    <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">Payment has been confirmed. Click below to begin processing this document and officially notify the resident.</p>
                                </div>

                                <Button
                                    onClick={handleProcessRequest}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all"
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    Process the request
                                </Button>
                            </div>
                        )}
                        {isTreasuryContext && transaction.status === "FOR_REQUESTING" && (
                            <div className="space-y-6">
                                <Button
                                    onClick={handleEvaluate}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all shadow-green-500/10"
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    PROCEED TO PAYMENT
                                </Button>
                            </div>
                        )}

                        {/* AWAITING CITIZEN PAYMENT NOTICE */}
                        {transaction.status === "EVALUATED" && (
                            <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-4 text-center">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
                                    <Clock className="w-6 h-6 animate-pulse" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200 font-bold">Awaiting Citizen Payment</h4>
                                <p className="text-[10px] text-slate-400 italic">Assessment invoice sent. The request is currently pending official citizen payment verification.</p>
                            </div>
                        )}

                        {/* TREASURY ACTION PANEL FOR PAID OR PENDING_PAYMENT_VERIFICATION */}
                        {isTreasuryContext && (transaction.status === "PAID" || transaction.status === "PENDING_PAYMENT_VERIFICATION") && (
                            <div className="space-y-4">
                                {/* Proof of Payment Lightbox */}
                                {(additional.paymentId || (transaction.paymentReference && transaction.paymentReference.trim() !== "")) && (
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Payment Proof Reference</label>
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl space-y-3">
                                            {(() => {
                                                const refNo = additional.paymentId ||
                                                    additional.paymongo?.paymentId ||
                                                    additional.gcashReferenceNo ||
                                                    additional.reference_number ||
                                                    (transaction.paymentReference && !transaction.paymentReference.startsWith("http") && !transaction.paymentReference.startsWith("/") ? transaction.paymentReference : null) ||
                                                    "N/A";
                                                return (
                                                    <div className="flex items-center gap-2 justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <Coins className="text-primary w-4 h-4 animate-pulse" />
                                                            <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                                                                Reference No: {refNo}
                                                            </span>
                                                        </div>
                                                        {refNo !== "N/A" && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(refNo);
                                                                    toast.success("Reference number copied to clipboard!");
                                                                }}
                                                                className="p-1.5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all focus:outline-none"
                                                                title="Copy Reference Number"
                                                            >
                                                                <Copy className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                            {transaction.paymentReference && transaction.paymentReference.trim() !== "" && transaction.paymentReference.startsWith("http") && (
                                                <div
                                                    onClick={() => handleViewFile?.(transaction.paymentReference, "Payment Proof")}
                                                    className="relative aspect-[4/3] rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all select-none"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={transaction.paymentReference}
                                                        alt="Payment Proof"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                        <span className="text-[9px] font-black text-white tracking-widest uppercase italic bg-primary px-3 py-1 rounded-full flex items-center gap-1.5" style={{ backgroundColor: themeColor }}>
                                                            <ExternalLink className="w-3 h-3" /> Zoom Receipt
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Upload Official Treasury Receipt section */}
                                <div className="space-y-4 p-5 rounded-3xl bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block mb-1">
                                        Upload Official Treasury Receipt
                                    </span>

                                    {/* O.R. Series Number input */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block">
                                            O.R. Series Number <span className="text-rose-500 font-extrabold">*Required</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={orSeriesNumber || ""}
                                            onChange={(e) => setOrSeriesNumber?.(e.target.value)}
                                            placeholder="Enter O.R. Series Number..."
                                            className="w-full h-11 px-4 rounded-xl border border-slate-150 dark:border-white/5 bg-white dark:bg-[#151b28]/60 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
                                        />
                                    </div>

                                    {/* Scanned O.R. file upload */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block">
                                            Attach Scanned Official Receipt (O.R.) <span className="text-rose-500 font-extrabold">*Required</span>
                                        </label>
                                        <input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setOrFile?.(file);
                                                if (file) {
                                                    const url = URL.createObjectURL(file);
                                                    setOrPreview?.(url);
                                                } else {
                                                    setOrPreview?.(null);
                                                }
                                            }}
                                            className="hidden"
                                            id="or-document-upload-paid"
                                        />
                                        {orFile || transaction.orUrl ? (
                                            <div className="space-y-3">
                                                {(() => {
                                                    const isPdf = orFile
                                                        ? (orFile.type === "application/pdf" || orFile.name.toLowerCase().endsWith(".pdf"))
                                                        : (transaction.orUrl
                                                            ? (transaction.orUrl.toLowerCase().endsWith(".pdf") || transaction.orUrl.includes("application/pdf") || transaction.orUrl.includes(".pdf?"))
                                                            : false);

                                                    if (isPdf) {
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleViewFile?.(orPreview || transaction.orUrl, "Official Receipt PDF")}
                                                                className="w-full flex items-center justify-between p-5 bg-[#151b28]/60 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left animate-in fade-in duration-300 group"
                                                            >
                                                                 <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl shrink-0 group-hover:scale-110 transition-transform">
                                                                        📕
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Official Receipt PDF</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Click to View PDF in Modal</p>
                                                                    </div>
                                                                </div>
                                                                <div className="h-9 px-4 rounded-xl border border-primary/20 text-primary font-black italic uppercase tracking-widest text-[9px] group-hover:bg-primary/10 flex items-center gap-1.5 transition-all shrink-0">
                                                                    Open PDF ➔
                                                                </div>
                                                            </button>
                                                        );
                                                    }

                                                    return (
                                                        <div
                                                            onClick={() => handleViewFile?.(orPreview || transaction.orUrl, "Official Treasury Receipt")}
                                                            className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block cursor-pointer select-none"
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
                                                                    className="backdrop-blur-md px-4 py-2 rounded-xl border border-white/25 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg animate-in zoom-in-75 duration-200"
                                                                >
                                                                    <span>View</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div className="flex justify-end">
                                                    <label
                                                        htmlFor="or-document-upload-paid"
                                                        className="h-8 px-3 rounded-lg border border-transparent bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm select-none"
                                                    >
                                                        <Upload className="w-3 h-3" /> Replace O.R. File
                                                    </label>
                                                </div>
                                            </div>
                                        ) : (
                                            <label
                                                htmlFor="or-document-upload-paid"
                                                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all h-28 bg-white dark:bg-[#151b28]/60 overflow-hidden relative group cursor-pointer border-slate-200 dark:border-white/10 hover:border-primary/30"
                                            >
                                                <Upload className="w-4.5 h-4.5 text-slate-400 group-hover:text-primary transition-colors mb-1" />
                                                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 text-center px-2">
                                                    Upload Scanned O.R. Document
                                                </span>
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleConfirmPayment}
                                    disabled={actionLoading || !orSeriesNumber || (!orFile && !transaction.orUrl)}
                                    className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all"
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    Upload O.R. & Mark as Paid
                                </Button>
                            </div>
                        )}

                        {/* REGISTRAR RELEASE PROCESSOR CONTROLLER */}
                        {transaction.status === "FOR_PROCESSING" && !isTreasuryContext && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-[#1e293b] dark:text-slate-400">
                                    Endorsement Document Attachment
                                </h4>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Upload Official Endorsement E-Copy *</span>
                                        {eCopyPreview ? (
                                            <div className="bg-[#f8fafd] dark:bg-[#0c111d] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-3 flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0">
                                                        <Check className="w-5 h-5 text-emerald-500" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                                                            {eCopyFile ? eCopyFile.name : "Uploaded"}
                                                        </span>
                                                        <span className="text-[8px] text-slate-400 italic">Ready for Release</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => setECopyFile(null)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="w-8 h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <label className="flex flex-col items-center justify-center py-6 px-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 dark:hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-white/[0.01] transition-all cursor-pointer text-center group/ecopy animate-in fade-in duration-300">
                                                <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-2 group-hover/ecopy:scale-105 transition-transform">
                                                    <Upload className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-primary">Upload Official Registry Document</span>
                                                <span className="text-[7px] text-slate-400 dark:text-slate-500 italic mt-0.5">PDF or Image up to 10MB</span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
                                                        setECopyFile(file);
                                                        if (file) {
                                                            setECopyPreview(URL.createObjectURL(file));
                                                        } else {
                                                            setECopyPreview(null);
                                                        }
                                                    }}
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    onClick={handleRelease}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-[#10b981] hover:bg-[#0d9488] text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all shadow-emerald-500/10"
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    Release & Send to Citizen
                                </Button>
                            </div>
                        )}

                        {/* COMPLETED RELEASE STATE ACTION (PRINT RECEIPT / WAYBILL) */}
                        {["FOR_CLAIM", "FOR_PICKING", "IN_ROUTE", "DELIVERED", "RELEASED"].includes(transaction.status) && (
                            <div className="space-y-4">
                                <PrintWaybill
                                    transaction={transaction}
                                    resident={resident}
                                    deliveryAddr={deliveryAddr}
                                    fiscal={fiscal}
                                    branding={branding}
                                    themeColor={themeColor}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
