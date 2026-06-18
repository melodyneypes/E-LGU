/* eslint-disable @next/next/no-img-element */
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
import { Label } from "@/components/ui/label";
import ResidentIdentityProfile from "@/app/admin/treasury/[id]/components/ResidentIdentityProfile";
import TransactionInfoCard from "@/app/admin/treasury/[id]/components/TransactionInfoCard";
import RejectionRevisionControls from "@/app/admin/treasury/[id]/components/RejectionRevisionControls";
import { cn } from "@/lib/utils";

export default function DeathPsaEndorsementView(props: TreasuryViewProps) {
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

    const isTreasuryContext = backUrl?.includes("/admin/treasury") || rawUserRole === "TREASURY_STAFF";
    const subjectName = additional.subjectFullName || additional.subjectName || "N/A";
    const subjectDateOfDeath = additional.subjectDateOfDeath || additional.dateOfEvent || "";
    const mothersMaidenName = additional.mothersMaidenName || additional.motherName || "";
    const fathersName = additional.fathersName || "";
    const placeOfDeath = additional.placeOfDeath || "";
    const causeOfDeath = additional.causeOfDeath || "";

    const psaNegativeCertUrl = additional.psaNegativeCert || null;
    const form2aUrl = additional.form2a || null;

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
            <div className={`h-1.5 w-full ${themeColor} transition-all duration-500`} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
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

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 space-y-8">
                        <TransactionInfoCard
                            transactionName="Death PSA Endorsement Request"
                            categoryLabel="Local Civil Registry"
                            themeColor={themeColor}
                        />

                        {transaction.rejectionRemarks && (
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 flex gap-4 items-start animate-in fade-in duration-300">
                                <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 block">Rejection / Revision Remarks</span>
                                    <p className="text-sm font-bold text-rose-900/80 dark:text-rose-400/80 italic">&ldquo;{transaction.rejectionRemarks}&rdquo;</p>
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-12 animate-in fade-in duration-300">
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setIsAssessmentOpen(!isAssessmentOpen)}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                            Deceased / Record Owner Name
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
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 rounded-2xl space-y-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Relationship to Deceased</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 uppercase">
                                                {additional.relationship || "RELATIVE"}
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

                                    <div className="space-y-6 pt-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                                            Fee Assessment Breakdown
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>PSA Endorsement Fee</span>
                                                <span className="dark:text-slate-200 font-black">
                                                    ₱200.00
                                                </span>
                                            </div>

                                            {transaction.fulfillmentType === "DELIVERY" && (
                                                <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                    <span>Delivery Fee</span>
                                                    <span className="dark:text-slate-200 font-black">₱{deliveryFee.toFixed(2)}</span>
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

                        <ResidentIdentityProfile
                            resident={resident}
                            safeFormatDate={safeFormatDate}
                            themeColor={themeColor}
                            titleColorText="Informant"
                            titleWhiteText="Profile"
                            subtitleText="Verified Requester / Informant Data Dossier"
                            relationship={additional.relationship}
                        />

                        <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl dark:shadow-2xl space-y-8 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 italic">
                                    Death PSA Endorsement Information
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">
                                        Deceased Details
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Deceased Full Name</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                {subjectName}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Date of Death</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                {safeFormatDate(subjectDateOfDeath)}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">{"Mother's Maiden Name"}</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                {mothersMaidenName || "—"}
                                            </div>
                                        </div>

                                        {fathersName && (
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Father&apos;s Full Name</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {fathersName}
                                                </div>
                                            </div>
                                        )}

                                        {placeOfDeath && (
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Place of Death</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {placeOfDeath}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">
                                        Informant Details
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Informant Full Name</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                {[additional.informantFirstName, additional.informantMiddleName, additional.informantLastName].filter(Boolean).join(" ") + (additional.informantSuffix ? " " + additional.informantSuffix : "") || "—"}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Contact Number</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.contactNumber || "—"}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Civil Status</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.informantCivilStatus || "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {((psaNegativeCertUrl || form2aUrl) && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-12 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1e293b] dark:text-white leading-none">
                                    Submitted Identifications & Requirements
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {psaNegativeCertUrl && (() => {
                                        const isPdf = psaNegativeCertUrl.split("?")[0].toLowerCase().endsWith(".pdf") || psaNegativeCertUrl.includes("application/pdf") || psaNegativeCertUrl.includes(".pdf?");
                                        return (
                                            <div
                                                onClick={() => handleViewFile?.(psaNegativeCertUrl, "PSA Negative Certification")}
                                                className="relative group rounded-3xl overflow-hidden aspect-[3/2] bg-[#f8fafd] dark:bg-white/5 border border-slate-200/50 dark:border-white/5 cursor-pointer shadow-md hover:shadow-xl transition-all"
                                            >
                                                {isPdf ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#1f2937]/20 gap-2 p-4 group-hover:scale-[1.03] transition-all duration-500">
                                                        <FileText className="w-10 h-10 text-red-500 animate-pulse" />
                                                        <span className="text-[9px] font-black uppercase text-red-500/70 tracking-widest text-center">View PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={psaNegativeCertUrl}
                                                        alt="PSA Negative Certification"
                                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500"
                                                    />
                                                )}
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
                                        );
                                    })()}
                                    {form2aUrl && (() => {
                                        const isPdf = form2aUrl.split("?")[0].toLowerCase().endsWith(".pdf") || form2aUrl.includes("application/pdf") || form2aUrl.includes(".pdf?");
                                        return (
                                            <div
                                                onClick={() => handleViewFile?.(form2aUrl, "Form 2A (Local Copy)")}
                                                className="relative group rounded-3xl overflow-hidden aspect-[3/2] bg-[#f8fafd] dark:bg-white/5 border border-slate-200/50 dark:border-white/5 cursor-pointer shadow-md hover:shadow-xl transition-all"
                                            >
                                                {isPdf ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#1f2937]/20 gap-2 p-4 group-hover:scale-[1.03] transition-all duration-500">
                                                        <FileText className="w-10 h-10 text-red-500 animate-pulse" />
                                                        <span className="text-[9px] font-black uppercase text-red-500/70 tracking-widest text-center">View PDF Document</span>
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={form2aUrl}
                                                        alt="Form 2A (Local Copy)"
                                                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500"
                                                    />
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10">
                                                    <div
                                                        style={{ backgroundColor: themeColor }}
                                                        className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg animate-in zoom-in-75 duration-200"
                                                    >
                                                        <span>VIEW</span>
                                                    </div>
                                                </div>
                                                <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[8px] truncate z-10">
                                                    Form 2A (Local Registry Copy)
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-6">
                            <div>
                                <h3 className="text-md font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200">Status Tracker</h3>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic mt-1">Status phase progress</p>
                            </div>
                            <div className="relative pl-6 space-y-6">
                                <div className="absolute top-2 bottom-2 left-2.5 w-0.5 bg-slate-100 dark:bg-white/5" />
                                {steps.map((step, idx) => {
                                    const isCompleted = currentStepIdx > idx || (currentStepIdx === idx && ["RELEASED", "DELIVERED", "COMPLETED"].includes(transaction.status));
                                    const isCurrent = currentStepIdx === idx && !["RELEASED", "DELIVERED", "COMPLETED"].includes(transaction.status);
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

                        {/* WAITING FOR REVISION NOTICE */}
                        {transaction.status === "FOR_REVISION" && (() => {
                            const revisionRemarks = transaction.rejectionRemarks || additional?.revisionRemarks || "";
                            return (
                                <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-6 shadow-xl dark:shadow-2xl border border-orange-200 dark:border-orange-500/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 animate-[spin_3s_linear_infinite]">
                                            <RotateCw className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 leading-none">
                                                Waiting for Citizen Revision
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic mt-1 leading-relaxed">
                                                Returned to citizen for corrections. Will reappear once resubmitted.
                                            </p>
                                        </div>
                                    </div>
                                    {revisionRemarks && (
                                        <div className="bg-orange-50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10 rounded-xl p-4 space-y-1.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                                                Remarks Sent
                                            </span>
                                            <p className="text-xs font-bold text-orange-800 dark:text-orange-300 italic leading-relaxed">
                                                &ldquo;{revisionRemarks}&rdquo;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* REJECTED REMARKS NOTICE */}
                        {transaction.status === "REJECTED" && (() => {
                            const rejectionRemarks = transaction.rejectionRemarks || additional?.rejectionRemarks || "";
                            return (
                                <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-6 shadow-xl dark:shadow-2xl border border-red-200 dark:border-red-500/20 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600 dark:text-red-400 leading-none">
                                                Request Rejected
                                            </h4>
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 italic mt-1 leading-relaxed">
                                                This request has been declined.
                                            </p>
                                        </div>
                                    </div>
                                    {rejectionRemarks && (
                                        <div className="bg-red-50 dark:bg-red-500/5 border border-red-100 dark:border-red-500/10 rounded-xl p-4 space-y-1.5">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                                                Rejection Remarks
                                            </span>
                                            <p className="text-xs font-bold text-red-800 dark:text-red-300 italic leading-relaxed">
                                                &ldquo;{rejectionRemarks}&rdquo;
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

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

                        {transaction.status === "FOR_REINSPECTION" && (
                            <div className="space-y-6">
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
                                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-4">
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

                                {(() => {
                                    const orNo = additional?.orSeriesNumber || transaction.orSeriesNumber || additional?.orNumber || additional?.orNo;
                                    const orDocUrl = additional?.orDocumentUrl || transaction.orUrl || additional?.orUrl;

                                    if (!orNo && !orDocUrl) return null;

                                    return (
                                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Treasury Record</span>
                                                    <span className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Official Receipt</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                {orNo && (
                                                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 italic">
                                                        <span>O.R. Serial Number:</span>
                                                        <span className="text-slate-800 dark:text-slate-200 font-black">{orNo}</span>
                                                    </div>
                                                )}
                                                {orDocUrl && (
                                                    <Button
                                                        onClick={() => handleViewFile?.(orDocUrl, "Official Receipt Copy")}
                                                        variant="outline"
                                                        size="sm"
                                                        className="w-full text-[10px] font-black uppercase tracking-widest h-10 border-slate-200 dark:border-slate-800 flex items-center justify-center gap-2"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" /> View Official Receipt
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="p-6 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200 font-bold">Endorsement Approved</h4>
                                    <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">Payment is verified. Upload the final endorsed PSA copy or release verification proof below to complete transaction.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Upload Scanned Endorsement Registry Document</span>
                                        {eCopyPreview ? (
                                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-[3/2] bg-[#f8fafd] dark:bg-white/5">
                                                <img src={eCopyPreview} alt="E-Copy Preview" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => { setECopyFile(null); setECopyPreview?.(null); }}
                                                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Label
                                                htmlFor="ecopy-upload"
                                                className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary/50 transition-colors cursor-pointer text-center bg-white/50 dark:bg-[#151b28]/50"
                                            >
                                                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Click to Upload Final Document</span>
                                                <span className="text-[8px] text-slate-400 italic mt-0.5">PDF, JPG, PNG up to 5MB</span>
                                                <input
                                                    id="ecopy-upload"
                                                    type="file"
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file && file.size > 5 * 1024 * 1024) {
                                                            toast.error("File size exceeds 5MB limit.");
                                                            if (e.target.parentElement) {
                                                                const parent = e.target.parentElement;
                                                                let errEl = parent.querySelector('.file-error-msg');
                                                                if (!errEl) {
                                                                    errEl = document.createElement('div');
                                                                    errEl.className = 'file-error-msg text-[9px] font-black uppercase text-red-500 bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20 text-center animate-pulse mt-2 z-50';
                                                                    parent.appendChild(errEl);
                                                                }
                                                                errEl.textContent = 'LIMIT UPLOAD ERROR: MAX 5MB ALLOWED';
                                                                setTimeout(() => errEl && errEl.remove(), 4000);
                                                            }
                                                            e.target.value = "";
                                                            setECopyFile(null);
                                                            setECopyPreview?.(null);
                                                            return;
                                                        }
                                                        if (file) {
                                                            setECopyFile(file);
                                                            setECopyPreview?.(URL.createObjectURL(file));
                                                        }
                                                    }}
                                                    className="hidden"
                                                />
                                            </Label>
                                        )}
                                    </div>

                                    <Button
                                        onClick={handleRelease}
                                        disabled={actionLoading}
                                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all shadow-emerald-500/10"
                                    >
                                        {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                        Complete & Release Endorsement
                                    </Button>
                                </div>
                            </div>
                        )}

                        {transaction.status === "FOR_CLAIM" && (
                            <div className="space-y-6">
                                <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-6">
                                    <div className="text-center space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mx-auto">
                                            <Check className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200 font-bold">Document Ready for Claiming</h4>
                                        <p className="text-xs text-slate-400 italic max-w-sm mx-auto">
                                            The document has been verified and processed. Please click below to officially release the document and notify the resident.
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handleRelease}
                                    disabled={actionLoading}
                                    className={`w-full h-14 rounded-2xl text-xs font-black uppercase tracking-wider italic text-white ${themeColor} shadow-lg active:scale-95 transition-all shadow-emerald-500/10`}
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    Release the Document
                                </Button>
                            </div>
                        )}

                        {["RELEASED", "DELIVERED", "COMPLETED"].includes(transaction.status) && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 text-center space-y-6">
                                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 mx-auto">
                                    <Check className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        {transaction.status === "DELIVERED" ? "Endorsement Delivered" : "Transaction Completed"}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">
                                        {transaction.status === "DELIVERED" ? "PSA Endorsement delivered to resident" : "Endorsement request finalized"}
                                    </p>
                                </div>
                                {(transaction.eCopyUrl || additional.eCopyUrl) && (
                                    <Button
                                        onClick={() => handleViewFile?.(transaction.eCopyUrl || additional.eCopyUrl, "Transmitted PSA Endorsement Document")}
                                        className="w-full h-12 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all"
                                    >
                                        <Eye className="w-4 h-4" /> View Endorsement Doc
                                    </Button>
                                )}
                                <Button
                                    onClick={handlePrintWaybill}
                                    variant="outline"
                                    className="w-full h-12 border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    Print Waybill / Slip
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
