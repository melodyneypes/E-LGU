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
    Camera,
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
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import LightboxView from "@/app/admin/treasury/[id]/components/LightboxView";
import PrintWaybill from "@/app/admin/treasury/[id]/components/PrintWaybill";
import ResidentIdentityProfile from "@/app/admin/treasury/[id]/components/ResidentIdentityProfile";
import TransactionInfoCard from "@/app/admin/treasury/[id]/components/TransactionInfoCard";
import RejectionRevisionControls from "@/app/admin/treasury/[id]/components/RejectionRevisionControls";
import { cn } from "@/lib/utils";

export default function BirthRegistrationView(props: TreasuryViewProps) {
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
    const [isRegistryDataOpen, setIsRegistryDataOpen] = React.useState(true);
    const [isEvidenceOpen, setIsEvidenceOpen] = React.useState(true);
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const additional = transaction.additionalData || {};

    const EVIDENCE_LABELS: Record<string, string> = {
        A: "Baptismal Certificate",
        B: "School records",
        C: "Income tax return of parents",
        D: "Insurance Policy",
        E: "Medical records",
        F: "Others (Voter registration record, Barangay certification)",
        G: "Affidavit of 2 disinterested persons"
    };

    const isDeath = transaction.type?.code?.includes("DEATH") || transaction.type?.code?.startsWith("LCR_DEATH");
    const isMarriage = transaction.type?.code?.includes("MARRIAGE") || transaction.type?.code?.startsWith("LCR_MARRIAGE");
    const fiscal = additional.feeAssessment || null;
    const isBirthRegistrationHiddenInTreasury = transaction.type?.code === "LCR_BIRTH_REG" && ["FOR_PROCESSING"].includes(transaction.status);
    const isTreasuryContext = backUrl?.includes("/admin/treasury") || rawUserRole === "TREASURY_STAFF";

    if (isBirthRegistrationHiddenInTreasury && isTreasuryContext) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
                <div className={`h-1.5 w-full ${themeColor} transition-all duration-500`} />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link
                        href={backUrl}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors group mb-8"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Treasury
                    </Link>

                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">
                            Registrar Request
                        </h3>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 italic leading-relaxed">
                            Birth registration requests in this status are handled by the Registrar and are not displayed in Treasury.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const subjectName = isMarriage
        ? (transaction.marriageRegistration?.businessName ||
            (transaction.marriageLicenseApplication
                ? `${transaction.marriageLicenseApplication.app1FullName} & ${transaction.marriageLicenseApplication.app2FullName}`
                : additional.subjectName || "N/A"))
        : (transaction.birthCertificateRegistry?.subjectName || transaction.birthCertificateRequest?.subjectName || transaction.deathRegistration?.subjectName || additional.fullName || additional.subjectName || "N/A");

    const registryLabel = isMarriage
        ? "Contracting couple"
        : isDeath
            ? "Deceased citizen record"
            : "Subject / Registered citizen name";

    const finalEvidenceDocs = [...(evidenceDocs || [])];
    const isLate = (additional.registrationType || "").toUpperCase() === "LATE";
    const isBirthReg = transaction.type?.code === "LCR_BIRTH_REG" || transaction.type?.code === "LCR_BIRTH";
    if (isBirthReg && isLate) {
        if (additional.supportingEvidence1 || additional.supportingEvidence1Type) {
            if (!finalEvidenceDocs.some(d => d.url === additional.supportingEvidence1)) {
                finalEvidenceDocs.push({
                    url: additional.supportingEvidence1,
                    label: EVIDENCE_LABELS[additional.supportingEvidence1Type as string] || "Supporting Evidence"
                });
            }
        }
        if (additional.supportingEvidence2 || additional.supportingEvidence2Type) {
            if (!finalEvidenceDocs.some(d => d.url === additional.supportingEvidence2)) {
                finalEvidenceDocs.push({
                    url: additional.supportingEvidence2,
                    label: EVIDENCE_LABELS[additional.supportingEvidence2Type as string] || "Supporting Evidence"
                });
            }
        }
    }

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
            {/* Header branding band */}
            <div className={`h-1.5 w-full ${themeColor} transition-all duration-500`} />

            {/* Main Container */}
            <div className="w-full px-4 sm:px-6 lg:px-12 py-10 space-y-10">

                {/* Back Button & Navigation */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-in fade-in duration-300">
                    <Link
                        href="/admin/registrar?category=Birth Registration"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Registrar
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
                            transactionName={transaction.type.name}
                            categoryLabel="Civil Registry"
                            themeColor={themeColor}
                        />

                        {/* MAIN ASSESSMENT CARD */}
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-12 animate-in fade-in duration-300">
                            {/* IDENTIFIER / ACCORDION HEADER */}
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setIsAssessmentOpen(!isAssessmentOpen)}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                            {registryLabel}
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
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 md:p-6 rounded-3xl space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Registration Type</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 uppercase">
                                                {additional.registrationType || "STANDARD"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 md:p-6 rounded-3xl space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Fulfillment Type</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 uppercase">
                                                {transaction.fulfillmentType?.replace(/_/g, " ") || "--"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 md:p-6 rounded-3xl space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment Mode</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 leading-none uppercase">
                                                {transaction.paymentType?.replace(/_/g, " ") || "--"}
                                            </p>
                                        </div>
                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-5 md:p-6 rounded-3xl space-y-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total Amount</span>
                                            <p className="text-lg font-black italic tracking-tighter text-primary">₱{displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>

                                    {/* COMPUTATION BREAKDOWN */}
                                    <div className="space-y-6 pt-6">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                                            Fee Assessment Breakdown
                                        </h3>
                                        <div className="space-y-4">
                                            {transaction.type?.code === "LCR_BIRTH_REG" ? (
                                                <>
                                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                        <span>Registration Fee</span>
                                                        <span className="dark:text-slate-200 font-black">
                                                            {(() => {
                                                                const mVal = parseFloat(miscFee || "0");
                                                                const baseVal = mVal >= 215 ? mVal - 215 : mVal;
                                                                return baseVal > 0 ? `₱${baseVal.toFixed(2)}` : "FREE";
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                        <span>E-Copy & Hardcopy Fee</span>
                                                        <span className="dark:text-slate-200 font-black">₱215.00</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                    <span>Miscellaneous Fee</span>
                                                    <span className="dark:text-slate-200 font-black">
                                                        {parseFloat(miscFee || "0") > 0
                                                            ? `₱${(parseFloat(miscFee || "0")).toFixed(2)}`
                                                            : "FREE"}
                                                    </span>
                                                </div>
                                            )}

                                            {transaction.fulfillmentType === "DELIVERY" && (
                                                <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                    <span>Delivery Fee</span>
                                                    <span className="dark:text-slate-200 font-black">₱{deliveryFee.toFixed(2)}</span>
                                                </div>
                                            )}

                                            {/* RENDER STATIC ADDITIONAL FEES IF NOT FOR_INSPECTION or FOR_REQUESTING, OR IF IT IS FOR_REQUESTING BIRTH REG */}
                                            {(!["FOR_INSPECTION", "FOR_REQUESTING"].includes(transaction.status) || (isBirthReg && transaction.status === "FOR_REQUESTING")) && feeLineItems && feeLineItems.length > 0 && (
                                                feeLineItems.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                        <span>{item.label || "Additional Fee"}</span>
                                                        <span className="dark:text-slate-200 font-black">
                                                            ₱{(parseFloat(item.amount) || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))
                                            )}

                                            {/* ADDITIONAL FEES EDITOR — Registrar/Treasury can add additional fee inside this breakdown card when status is FOR_INSPECTION or FOR_REQUESTING (except Birth Reg in FOR_REQUESTING) */}
                                            {["FOR_INSPECTION", "FOR_REQUESTING"].includes(transaction.status) && !(isBirthReg && transaction.status === "FOR_REQUESTING") && (
                                                <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-white/5 pt-4">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                        Additional Fees
                                                    </p>
                                                    <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                                                        {feeLineItems?.map((item, idx) => (
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
                            safeFormatDate={props.safeFormatDate}
                            themeColor={themeColor}
                            titleColorText="Informant"
                            titleWhiteText="Profile"
                            subtitleText="Verified Requester / Informant Data Dossier"
                            relationship={additional.relationship}
                            relationshipLabel="Relationship to Subject"
                        />

                        {/* Primary LCR Specific Details Panel */}
                        <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] border border-slate-50 dark:border-white/5 shadow-xl dark:shadow-2xl overflow-hidden animate-in fade-in duration-300">
                            {/* Section Header — Accordion Toggle */}
                            <div
                                className="flex items-center justify-between p-8 md:p-10 cursor-pointer select-none group"
                                onClick={() => setIsRegistryDataOpen(!isRegistryDataOpen)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-slate-200">
                                            {isDeath ? "Death Registry Record Data" : isMarriage ? "Marriage Registry Record Data" : "Birth Registry Record Data"}
                                        </h3>
                                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 italic mt-0.5">Civil registry application details</p>
                                    </div>
                                </div>
                                <div className="w-9 h-9 rounded-full border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 group-hover:border-primary/30 group-hover:text-primary transition-all shrink-0">
                                    {isRegistryDataOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>
                            {isRegistryDataOpen && (
                            <div className="px-8 md:px-10 pb-8 md:pb-10 space-y-8 animate-in fade-in slide-in-from-top-2 duration-200">

                            {/* Registry Book Verification */}
                            {additional.registryBookVerification && transaction.type?.code === "LCR_BIRTH" && (
                                <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 animate-in fade-in duration-300">
                                    <div className="space-y-0.5 flex-1">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Registry Book Verification</span>
                                        <p className="font-black text-sm italic uppercase text-slate-800 dark:text-white leading-tight">
                                            {additional.registryBookVerification === "FORM_1A" ? "Form 1A — Record Found" :
                                                additional.registryBookVerification === "FORM_1B" ? "Form 1B — Record Not Available" :
                                                    additional.registryBookVerification === "FORM_1C" ? "Form 1C — Record Destroyed" :
                                                        additional.registryBookVerification}
                                        </p>
                                    </div>
                                    <Badge className={cn(
                                        "px-4 py-1.5 rounded-full font-black uppercase text-[10px] tracking-wider italic text-white shadow-md border-none shrink-0",
                                        additional.registryBookVerification === "FORM_1A" ? "bg-emerald-500 shadow-emerald-500/20" :
                                            additional.registryBookVerification === "FORM_1B" ? "bg-amber-500 shadow-amber-500/20" :
                                                "bg-rose-500 shadow-rose-500/20"
                                    )}>
                                        {additional.registryBookVerification === "FORM_1A" ? "Record Found" :
                                            additional.registryBookVerification === "FORM_1B" ? "Not Available" :
                                                "Destroyed"}
                                    </Badge>
                                </div>
                            )}

                            {/* Document Links Row */}
                            {(additional.orSeriesNumber || additional.scannedDocUrl || transaction.eCopyUrl) && (
                                <div className={cn(
                                    "grid grid-cols-1 gap-3 animate-in fade-in duration-300",
                                    [additional.orSeriesNumber, additional.scannedDocUrl, transaction.eCopyUrl].filter(Boolean).length >= 3
                                        ? "md:grid-cols-3"
                                        : "md:grid-cols-2"
                                )}>
                                    {additional.orSeriesNumber && (
                                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 flex flex-col gap-1">
                                            <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest leading-none">O.R. Series Number</span>
                                            <span className="font-black text-sm italic uppercase text-slate-800 dark:text-white">{additional.orSeriesNumber}</span>
                                        </div>
                                    )}
                                    {additional.scannedDocUrl && (
                                        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/15 dark:border-primary/20 rounded-2xl px-4 py-3 flex flex-col gap-2">
                                            <span className="text-[9px] font-black uppercase text-primary/70 tracking-widest leading-none">Verified Birth Doc</span>
                                            <Button
                                                onClick={() => handleViewFile?.(additional.scannedDocUrl, "Scanned Birth Registration Document")}
                                                variant="ghost"
                                                size="sm"
                                                className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-primary hover:bg-primary/10 h-7 px-2 w-fit"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View Document
                                            </Button>
                                        </div>
                                    )}
                                    {transaction.eCopyUrl && (
                                        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl px-4 py-3 flex flex-col gap-2">
                                            <span className="text-[9px] font-black uppercase text-emerald-600/70 dark:text-emerald-400/70 tracking-widest leading-none">Released E-Copy</span>
                                            <Button
                                                onClick={() => handleViewFile?.(transaction.eCopyUrl, "Released Digital E-Copy Document")}
                                                variant="ghost"
                                                size="sm"
                                                className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 h-7 px-2 w-fit"
                                            >
                                                <ExternalLink className="w-3 h-3" /> View E-Copy
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Main Data Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Column 1: Primary Subject details */}
                                <div className="space-y-5">
                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">
                                            {isDeath ? "Deceased / Event Info" : isMarriage ? "Marriage Info" : "Subject / Document Info"}
                                        </h4>
                                    </div>
                                    {isDeath ? (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Deceased Full Name</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {transaction.deathRegistration?.subjectName || additional.fullName || additional.subjectName || "—"}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Date of Death</span>
                                                    <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                        {safeFormatDate(transaction.deathRegistration?.dateOfEvent || additional.dateOfDeath || additional.dateOfEvent)}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Registry No.</span>
                                                    <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                        {transaction.deathRegistration?.registryNumber || "PENDING"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Cause of Death</span>
                                                    <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                        {additional.causeOfDeath || "—"}
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Place of Death</span>
                                                    <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                        {transaction.deathRegistration?.placeOfEvent || additional.placeOfEvent || additional.placeOfDeath || "—"}
                                                    </div>
                                                </div>
                                            </div>
                                            {(transaction.deathRegistration?.issuedBy || additional.issuedBy) && (
                                                <div className="space-y-1 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Issued By</span>
                                                    <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                        {transaction.deathRegistration?.issuedBy || additional.issuedBy}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Subject Name */}
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                                                    {isMarriage ? "Contracting Couple" : "Subject Name"}
                                                </span>
                                                {!isDeath && !isMarriage && Array.isArray(additional.children) && additional.children.length >= 1 ? (
                                                    <div className="space-y-2">
                                                        {additional.birthType && (
                                                            <Badge variant="outline" className="px-2.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border-primary/30 text-primary bg-primary/5">
                                                                {additional.birthType} Birth ({additional.children.length} {additional.children.length > 1 ? "Children" : "Child"})
                                                            </Badge>
                                                        )}
                                                        <div className="space-y-2">
                                                            {(additional.children as Array<{ firstName?: string, middleName?: string, lastName?: string, suffix?: string, sex?: string, birthTime?: string }>).map((c, i) => {
                                                                const name = `${c.firstName || ""} ${c.middleName || ""} ${c.lastName || ""} ${c.suffix || ""}`.replace(/\s+/g, ' ').trim();
                                                                return (
                                                                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-4 py-3 rounded-xl gap-4 hover:border-primary/30 transition-colors">
                                                                        <div className="flex items-center gap-3">
                                                                            <span className="text-[9px] font-black text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center italic shrink-0">
                                                                                {i + 1}
                                                                            </span>
                                                                            <p className="text-xs font-black italic uppercase text-slate-800 dark:text-white">
                                                                                {name || "N/A"}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                            {c.birthTime && (
                                                                                <Badge variant="outline" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border-amber-200 dark:border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-500/5 flex items-center gap-1">
                                                                                    <Clock className="w-2.5 h-2.5" /> {c.birthTime}
                                                                                </Badge>
                                                                            )}
                                                                            {c.sex && (
                                                                                <Badge variant="outline" className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md border-primary/20 text-primary bg-primary/5">
                                                                                    {c.sex}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[3rem] flex items-center">
                                                        <span className="font-black text-sm italic uppercase text-slate-800 dark:text-white leading-tight">
                                                            {isMarriage
                                                                ? (transaction.marriageRegistration?.businessName ||
                                                                    (transaction.marriageLicenseApplication
                                                                        ? `${transaction.marriageLicenseApplication.app1FullName} & ${transaction.marriageLicenseApplication.app2FullName}`
                                                                        : additional.subjectName || "N/A"))
                                                                : (transaction.birthCertificateRegistry?.subjectName || transaction.birthCertificateRequest?.subjectName || additional.subjectName || "N/A")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Event Date & Registry No */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
                                                        {isMarriage ? "Date of Marriage" : "Event Date"}
                                                    </span>
                                                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                        <span className="font-black text-xs italic uppercase text-slate-800 dark:text-slate-200">
                                                            {isMarriage
                                                                ? safeFormatDate(additional.dateOfMarriage || additional.dateOfEvent || transaction.marriageLicenseApplication?.dateIssued)
                                                                : safeFormatDate(transaction.birthCertificateRegistry?.dateOfEvent || transaction.birthCertificateRequest?.dateOfEvent || additional.dateOfEvent)}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Registry No.</span>
                                                    <div className="bg-primary/5 dark:bg-primary/10 border border-primary/15 dark:border-primary/20 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                        <span className="font-black text-xs italic uppercase text-primary">
                                                            {isMarriage
                                                                ? (transaction.marriageRegistration?.ctcNumber || transaction.marriageLicenseApplication?.registryNumber || "PENDING")
                                                                : (transaction.birthCertificateRegistry?.registryNumber || transaction.birthCertificateRequest?.registryNumber || "PENDING")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                             {!isDeath && !isMarriage && (
                                                 <>
                                                     <div className="space-y-1.5">
                                                         <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Place of Birth</span>
                                                         <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                             <span className="font-black text-xs italic uppercase text-slate-800 dark:text-slate-200">
                                                                 {additional.placeOfEvent || "—"}
                                                             </span>
                                                         </div>
                                                     </div>

                                                     <div className="grid grid-cols-2 gap-3">
                                                         <div className="space-y-1.5">
                                                             <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Registration Type</span>
                                                             <div className={cn(
                                                                 "rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center border",
                                                                 (additional.registrationType || "STANDARD").toUpperCase() === "LATE"
                                                                     ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20"
                                                                     : "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20"
                                                             )}>
                                                                 <span className={cn(
                                                                     "font-black text-xs italic uppercase",
                                                                     (additional.registrationType || "STANDARD").toUpperCase() === "LATE"
                                                                         ? "text-amber-700 dark:text-amber-400"
                                                                         : "text-emerald-700 dark:text-emerald-400"
                                                                 )}>
                                                                     {additional.registrationType || "STANDARD"}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                         <div className="space-y-1.5">
                                                             <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Parents Marital Status</span>
                                                             <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                                 <span className="font-black text-xs italic uppercase text-slate-800 dark:text-slate-200">
                                                                     {additional.parentsMarried === true ? "MARRIED" : additional.parentsMarried === false ? "NOT MARRIED" : "—"}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                     </div>

                                                     {additional.registrationType === "LATE" && additional.lateDuration && (
                                                         <div className="space-y-1.5">
                                                             <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Late Registration Period</span>
                                                             <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                                 <span className="font-black text-xs italic uppercase text-amber-700 dark:text-amber-400">
                                                                     {additional.lateDuration === "1-10" ? "1 Month – 10 Years" :
                                                                      additional.lateDuration === "10-20" ? "10 – 20 Years" :
                                                                      additional.lateDuration === "20+" ? "20 Years and Above" :
                                                                      additional.lateDuration}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                     )}
                                                 </>
                                             )}

                                            {isMarriage && (
                                                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-white/5">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Place of Marriage</span>
                                                    <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                        <span className="font-black text-xs italic uppercase text-slate-800 dark:text-slate-200">
                                                            {additional.placeOfMarriage || "N/A"}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {(transaction.birthCertificateRegistry?.issuedBy ||
                                                transaction.birthCertificateRequest?.issuedBy ||
                                                transaction.marriageRegistration?.issuedBy ||
                                                transaction.marriageLicenseApplication?.issuedBy ||
                                                additional.issuedBy) && (
                                                    <div className="space-y-1.5 border-t border-slate-100 dark:border-white/5 pt-3">
                                                        <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Issued By</span>
                                                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                            <span className="font-black text-xs italic uppercase text-slate-800 dark:text-slate-200">
                                                                {isMarriage
                                                                    ? (transaction.marriageRegistration?.issuedBy || transaction.marriageLicenseApplication?.issuedBy || additional.issuedBy)
                                                                    : (transaction.birthCertificateRegistry?.issuedBy || transaction.birthCertificateRequest?.issuedBy || additional.issuedBy)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </div>

                                {/* Column 2: Secondary parties details */}
                                <div className="space-y-5">
                                    {isDeath ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">Parental Dossier</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Father</span>
                                                    <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                        {additional.fathersName || additional.fatherName || "—"}
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Mother</span>
                                                    <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                        {additional.mothersName || additional.motherName || "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : isMarriage ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">Applicants Dossier</h4>
                                            </div>
                                            <div className="space-y-4">
                                                {(additional.applicant1 || transaction.marriageLicenseApplication) && (
                                                    <div className="space-y-2">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic block">Applicant 1 (Groom/Spouse)</span>
                                                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                            <span className="font-black text-xs italic uppercase text-slate-800 dark:text-white">
                                                                {additional.applicant1?.fullName || transaction.marriageLicenseApplication?.app1FullName}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-[9px] font-medium text-slate-400 italic">
                                                            <span>DOB: {safeFormatDate(additional.applicant1?.birthDate || transaction.marriageLicenseApplication?.app1BirthDate)}</span>
                                                            <span>Citizenship: {additional.applicant1?.citizenship || transaction.marriageLicenseApplication?.app1Citizenship || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                                {(additional.applicant2 || transaction.marriageLicenseApplication) && (
                                                    <div className="space-y-2">
                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic block">Applicant 2 (Bride/Spouse)</span>
                                                        <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                            <span className="font-black text-xs italic uppercase text-slate-800 dark:text-white">
                                                                {additional.applicant2?.fullName || transaction.marriageLicenseApplication?.app2FullName}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-[9px] font-medium text-slate-400 italic">
                                                            <span>DOB: {safeFormatDate(additional.applicant2?.birthDate || transaction.marriageLicenseApplication?.app2BirthDate)}</span>
                                                            <span>Citizenship: {additional.applicant2?.citizenship || transaction.marriageLicenseApplication?.app2Citizenship || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            {(additional.fatherName || additional.motherName || transaction.birthCertificateRegistry?.fatherName || transaction.birthCertificateRegistry?.motherName) && (
                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                        <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">Parental Matrix</h4>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {(additional.fatherName || transaction.birthCertificateRegistry?.fatherName) && (
                                                            <div className="space-y-1.5">
                                                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Father</span>
                                                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                                    <span className="font-black text-xs italic uppercase text-slate-800 dark:text-slate-200">
                                                                        {transaction.birthCertificateRegistry?.fatherName || additional.fatherName}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {(additional.motherName || transaction.birthCertificateRegistry?.motherName) && (
                                                            <div className="space-y-1.5">
                                                                <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">Mother</span>
                                                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 min-h-[2.75rem] flex items-center">
                                                                    <span className="font-black text-xs italic uppercase text-slate-800 dark:text-slate-200">
                                                                        {transaction.birthCertificateRegistry?.motherName || additional.motherName}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                            {(additional.registrationType || "").toUpperCase() === "LATE" && (() => {
                                                const types = additional.supportingEvidenceTypes || [];
                                                const type1 = additional.supportingEvidence1Type || types[0];
                                                const type2 = additional.supportingEvidence2Type || types[1];
                                                const label1 = EVIDENCE_LABELS[type1 as string];
                                                const label2 = EVIDENCE_LABELS[type2 as string];

                                                if (!label1 && !label2) return null;

                                                return (
                                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5 w-full">
                                                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">Selected Supporting Evidence</h4>
                                                        </div>
                                                        <div className="space-y-3">
                                                            {label1 && (
                                                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
                                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                        <span className="text-[9px] font-black text-primary">1</span>
                                                                    </div>
                                                                    <p className="text-xs font-bold italic uppercase text-slate-700 dark:text-slate-300 leading-snug">
                                                                        {label1}
                                                                    </p>
                                                                </div>
                                                            )}
                                                            {label2 && (
                                                                <div className="bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
                                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                                        <span className="text-[9px] font-black text-primary">2</span>
                                                                    </div>
                                                                    <p className="text-xs font-bold italic uppercase text-slate-700 dark:text-slate-300 leading-snug">
                                                                        {label2}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>
                            </div>
                            )}
                        </div>

                        {/* Evidence Uploads & Attachments */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-xl dark:shadow-2xl">
                            <div
                                className="flex items-center justify-between p-8 md:p-10 cursor-pointer select-none group"
                                onClick={() => setIsEvidenceOpen(!isEvidenceOpen)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-slate-100 dark:bg-white/10 rounded-xl text-slate-800 dark:text-white">
                                        <Eye className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white">Evidence & Required Dossier</h3>
                                        <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 italic mt-0.5">Uploaded verification materials</p>
                                    </div>
                                </div>
                                <div className="w-9 h-9 rounded-full border border-slate-100 dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:border-slate-300 dark:group-hover:border-white/20 group-hover:text-slate-700 dark:group-hover:text-white transition-all shrink-0">
                                    {isEvidenceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>
                            {isEvidenceOpen && (
                            <div className="px-8 md:px-10 pb-8 md:pb-10 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {finalEvidenceDocs
                                    .filter(doc => {
                                        const label = (doc.label || '').toLowerCase();
                                        const url = (doc.url || '').toLowerCase();
                                        return !label.includes('receipt') &&
                                            !label.includes('o.r.') &&
                                            !label.includes('or doc') &&
                                            !url.includes('receipt') &&
                                            !url.includes('or_doc') &&
                                            doc.url !== transaction.orUrl;
                                    })
                                    .map((doc, i, arr) => {
                                        const isImg = doc.url && /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.url);
                                        const validDocs = arr.filter(d => !!d.url);
                                        const validIndex = validDocs.findIndex(d => d.url === doc.url);
                                        return doc.url ? (
                                            <div
                                                key={i}
                                                onClick={() => doc.url && handleViewFile?.(doc.url, doc.label, validDocs, validIndex)}
                                                className="relative aspect-[4/3] rounded-2xl bg-[#f8fafc] dark:bg-[#1f2937]/20 border border-slate-100 dark:border-slate-800 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all select-none"
                                            >
                                                {isImg ? (
                                                    <>
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={doc.url} alt={doc.label} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                                        <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 dark:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[8px] truncate">
                                                            {doc.label}
                                                        </div>
                                                        <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                            <div
                                                                style={{ backgroundColor: themeColor }}
                                                                className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg animate-in zoom-in-75 duration-200"
                                                            >
                                                                <span>View</span>
                                                            </div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-[#1f2937]/10 dark:to-[#111827]" />
                                                        <div className="relative h-full w-full flex flex-col items-center justify-center gap-3 p-6">
                                                            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#1f2937]/50 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center text-primary">
                                                                <FileText className="w-7 h-7" />
                                                            </div>
                                                            <div className="text-center min-w-0">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                                                                    Document File
                                                                 </p>
                                                                <p className="mt-1 text-sm font-black italic uppercase tracking-tight text-slate-800 dark:text-white truncate max-w-[220px]">
                                                                    {doc.label}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="absolute inset-x-3 bottom-3 rounded-xl bg-slate-900/85 dark:bg-slate-950/75 backdrop-blur-md px-3 py-2 text-center text-white font-black italic uppercase tracking-widest text-[9px] opacity-90 group-hover:opacity-100 transition-opacity">
                                                            Open Document
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div key={i} className="relative aspect-[4/3] rounded-2xl bg-slate-50 dark:bg-[#1f2937]/10 border border-dashed border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-1.5 p-4 select-none">
                                                <Camera className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" />
                                                <span className="text-[8px] font-black uppercase text-center tracking-widest leading-none">{doc.label}</span>
                                                <span className="text-[7px] italic text-slate-400 dark:text-slate-600 uppercase">Pending Attachment</span>
                                            </div>
                                        );
                                    })}
                            </div>

                            {(() => {
                                const typeCode = (transaction?.type?.code || "").toString().toUpperCase();
                                const isBirthType = typeCode === "LCR_BIRTH_REG" || typeCode === "LCR_BIRTH" || (transaction?.type?.name && transaction.type.name.toLowerCase().includes("birth"));
                                const ctcCandidate = additional.communityTaxCertificate || additional.ctcUrl || additional.community_tax_certificate || additional.communityTax;
                                const hasCTCInEvidence = finalEvidenceDocs && finalEvidenceDocs.some(d => /community tax|cedula|ctc/i.test(d.label) || (d.url && (d.url === ctcCandidate)));

                                if (isBirthType && !hasCTCInEvidence) {
                                    let snapshot: any = transaction.residentSnapshot || {};
                                    if (snapshot && typeof snapshot === 'string') {
                                        try { snapshot = JSON.parse(snapshot); } catch { snapshot = {}; }
                                    }
                                    const current = transaction.user?.residentProfile || {};
                                    const snapshotHasId = snapshot && (snapshot.idFrontUrl || snapshot.idBackUrl || snapshot.idNumber || snapshot.idType);
                                    const idChanged = !!snapshotHasId && (
                                        (current.idFrontUrl && current.idFrontUrl !== snapshot.idFrontUrl) ||
                                        (current.idBackUrl && current.idBackUrl !== snapshot.idBackUrl) ||
                                        (current.idNumber && current.idNumber !== snapshot.idNumber) ||
                                        (current.idType && current.idType !== snapshot.idType)
                                    );

                                    if (idChanged) {
                                        return (
                                            <div className="mt-4 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-500">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-amber-100 rounded-xl text-amber-600">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black uppercase">Community Tax Certificate</p>
                                                        <p className="text-[10px] italic">Not uploaded — resident ID was updated after submission</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                    <div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Snapshot (at submission)</span>
                                                        <div className="mt-2 space-y-2">
                                                            {snapshot.idFrontUrl ? (
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={snapshot.idFrontUrl} alt="Previous ID Front" className="w-28 h-20 object-cover rounded-md border border-slate-100 dark:border-white/5" />
                                                                    </DialogTrigger>
                                                                    <LightboxView src={snapshot.idFrontUrl} alt="Previous ID Front" label="Previous ID Front" />
                                                                </Dialog>
                                                            ) : <div className="text-xs text-slate-400 italic">No ID front saved in snapshot</div>}

                                                            {snapshot.idBackUrl ? (
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={snapshot.idBackUrl} alt="Previous ID Back" className="w-28 h-20 object-cover rounded-md border border-slate-100 dark:border-white/5" />
                                                                    </DialogTrigger>
                                                                    <LightboxView src={snapshot.idBackUrl} alt="Previous ID Back" label="Previous ID Back" />
                                                                </Dialog>
                                                            ) : null}

                                                            {snapshot.idNumber && <div className="text-xs font-bold uppercase">{(snapshot.idType || 'ID') + ': ' + snapshot.idNumber}</div>}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Current Resident Record</span>
                                                        <div className="mt-2 space-y-2">
                                                            {current.idFrontUrl ? (
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={current.idFrontUrl} alt="Current ID Front" className="w-28 h-20 object-cover rounded-md border border-slate-100 dark:border-white/5" />
                                                                    </DialogTrigger>
                                                                    <LightboxView src={current.idFrontUrl} alt="Current ID Front" label="Current ID Front" />
                                                                </Dialog>
                                                            ) : <div className="text-xs text-slate-400 italic">No ID front on resident record</div>}

                                                            {current.idBackUrl ? (
                                                                <Dialog>
                                                                    <DialogTrigger asChild>
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={current.idBackUrl} alt="Current ID Back" className="w-28 h-20 object-cover rounded-md border border-slate-100 dark:border-white/5" />
                                                                    </DialogTrigger>
                                                                    <LightboxView src={current.idBackUrl} alt="Current ID Back" label="Current ID Back" />
                                                                </Dialog>
                                                            ) : null}

                                                            {current.idNumber && <div className="text-xs font-bold uppercase">{(current.idType || 'ID') + ': ' + current.idNumber}</div>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            })()}
                            </div>
                            )}
                        </div>

                    </div>

                    {/* Right Column: Workflow Steps & Dynamic Evaluation Controls */}
                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8">



                        {/* Status tracker */}
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

                        {/* Reference Number Card for copy */}
                        {(() => {
                            const refNo =
                                additional?.paymentId ||
                                additional?.reference_number ||
                                additional?.gcashReferenceNo ||
                                (transaction.paymentReference && !transaction.paymentReference.startsWith("http") && !transaction.paymentReference.startsWith("/") ? transaction.paymentReference : null) ||
                                additional?.payment_id ||
                                transaction.paymentId;

                            const isAllowedStatus = ["FOR_REINSPECTION", "FOR_PROCESSING", "FOR_CLAIM", "RELEASED", "DELIVERED", "IN_ROUTE", "FOR_PICKING"].includes(transaction.status);

                            if (!isAllowedStatus) return null;

                            const displayRefNo = refNo || "No payment reference ID stored";

                            return (
                                <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-4 animate-in fade-in duration-300">
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
                                            <div className="flex items-center gap-2">
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    {refNo ? "Copy reference to clipboard" : "Reference ID unavailable"}
                                                </span>
                                            </div>
                                            {refNo && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(refNo);
                                                        toast.success("Reference number copied!");
                                                    }}
                                                    className="text-slate-400 hover:text-primary transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5"
                                                >
                                                    <Copy className="w-4.5 h-4.5" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm font-black italic tracking-widest font-mono text-slate-800 dark:text-slate-200 select-all">
                                            {displayRefNo}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Official Receipt (O.R.) Details Card for Registrar */}
                        {(() => {
                            const orNo = additional?.orSeriesNumber || transaction.orSeriesNumber || additional?.orNumber || additional?.orNo;
                            const orDocUrl = additional?.orDocumentUrl || transaction.orUrl || additional?.orUrl;

                            if (!orNo && !orDocUrl) return null;

                            return (
                                <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-4 animate-in fade-in duration-300">
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
                                            {(() => {
                                                const isPdf = orDocUrl.toLowerCase().endsWith(".pdf") || orDocUrl.includes("application/pdf") || orDocUrl.includes(".pdf?");
                                                if (isPdf) {
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewFile?.(orDocUrl, "Official Treasury Receipt PDF")}
                                                            className="w-full flex items-center justify-between p-4 bg-[#151b28]/60 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg shrink-0 group-hover:scale-110 transition-transform">
                                                                    📕
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Receipt PDF</p>
                                                                    <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic mt-0.5 leading-none">Click to view</p>
                                                                </div>
                                                            </div>
                                                            <div className="h-8 px-3 rounded-lg border border-primary/20 text-primary font-black italic uppercase tracking-widest text-[8px] group-hover:bg-primary/10 flex items-center gap-1 transition-all shrink-0">
                                                                Open PDF ➔
                                                            </div>
                                                        </button>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        onClick={() => handleViewFile?.(orDocUrl, "Official Treasury Receipt")}
                                                        className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block cursor-pointer select-none"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img
                                                            src={orDocUrl}
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
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Interactive Decision / Actions box */}
                        {["FOR_REQUESTING", "EVALUATED", "PAID", "UNPAID"].includes(transaction.status) ? (
                            <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3 animate-in fade-in duration-300">
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center mx-auto",
                                    transaction.status === "FOR_REQUESTING" ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-600"
                                )}>
                                    <Clock className="w-6 h-6 animate-pulse" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200">
                                    {transaction.status === "FOR_REQUESTING" && "Awaiting Payment & Verification"}
                                    {transaction.status === "EVALUATED" && "Assessment Sent"}
                                    {transaction.status === "UNPAID" && "Awaiting Payment"}
                                    {transaction.status === "PAID" && "Payment Confirmed"}
                                </h4>
                                <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">
                                    {transaction.status === "FOR_REQUESTING" && "This request is currently waiting for the citizen to settle the payment and for the Treasury Department to verify the transaction. No action is required from the Registrar at this time."}
                                    {transaction.status === "EVALUATED" && "Assessment has been submitted. Waiting for the citizen to complete GCash payment or walk-in transaction."}
                                    {transaction.status === "UNPAID" && "This request is currently awaiting payment from the citizen."}
                                    {transaction.status === "PAID" && "Payment has been confirmed. The request is proceeding to the next processing phase."}
                                </p>
                            </div>
                        ) : (!isReadOnlyAide || ["FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING"].includes(transaction.status)) && (
                            <div className="space-y-6">

                                {(["FOR_REQUESTING", "UNDER_REVIEW", "EVALUATED", "FOR_INSPECTION"].includes(transaction.status)) && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN" || rawUserRole === "REGISTRAR" || (transaction.type?.category === "Civil Registry")) && (
                                    <div className="space-y-4">
                                        {isBirthReg && transaction.status === "FOR_REQUESTING" ? (
                                            <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
                                                    <Clock className="w-6 h-6 animate-pulse" />
                                                </div>
                                                <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200">Awaiting Payment & Verification</h4>
                                                <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">This request is currently waiting for the citizen to settle the payment and for the Treasury Department to verify the transaction. No action is required from the Registrar at this time.</p>
                                            </div>
                                        ) : transaction.status === "EVALUATED" ? (
                                            <div className="p-8 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mx-auto">
                                                    <Clock className="w-6 h-6 animate-pulse" />
                                                </div>
                                                <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200">Assessment Sent</h4>
                                                <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">Assessment has been submitted. Waiting for the citizen to complete GCash payment or walk-in transaction.</p>
                                            </div>
                                        ) : transaction.status === "FOR_INSPECTION" ? (
                                            <>
                                                {/* Registry Book Verification Choices */}
                                                {transaction.type?.code === "LCR_BIRTH" && (
                                                    <div className="space-y-3 p-5 rounded-3xl bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block mb-1">
                                                            Registry Book Verification <span className="text-rose-500 font-extrabold">*Required</span>
                                                        </label>
                                                        <div className="grid grid-cols-1 gap-2.5">
                                                            {[
                                                                { id: "FORM_1A", title: "Form 1A", desc: "Record Found", activeColor: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                                                                { id: "FORM_1B", title: "Form 1B", desc: "Record Not Available", activeColor: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                                                                { id: "FORM_1C", title: "Form 1C", desc: "Record Destroyed", activeColor: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400" }
                                                            ].map((opt) => {
                                                                const isSelected = registryBookVerification === opt.id;
                                                                return (
                                                                    <button
                                                                        key={opt.id}
                                                                        type="button"
                                                                        onClick={() => setRegistryBookVerification?.(opt.id)}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 active:scale-98 select-none",
                                                                            isSelected ? opt.activeColor + " shadow-md font-bold" : "border-slate-150 dark:border-white/5 text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151b28]/60 hover:bg-slate-50 dark:hover:bg-white/5"
                                                                        )}
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-black uppercase tracking-wider">{opt.title}</span>
                                                                            <span className="text-[10px] italic opacity-85 mt-0.5">{opt.desc}</span>
                                                                        </div>
                                                                        <div className={cn(
                                                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                            isSelected ? "border-current bg-current/15" : "border-slate-300 dark:border-white/10"
                                                                        )}>
                                                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <Button
                                                    onClick={handleEvaluate}
                                                    disabled={actionLoading}
                                                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center"
                                                >
                                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                                    Approve Document
                                                </Button>

                                                <div className="flex gap-2">
                                                    {(transaction.revisionCount || 0) < 3 && (
                                                        <Button
                                                                                                                onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                                                                                                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase"
                                                                                                            >
                                                                                                                Revision
                                                                                                            </Button>
                                                    )}
                                                    <Button
                                                        onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase"
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            // Original: FOR_REQUESTING / UNDER_REVIEW -> Approve & Send Assessment
                                            <>
                                                {/* Registry Book Verification Choices */}
                                                {transaction.type?.code === "LCR_BIRTH" && (
                                                    <div className="space-y-3 p-5 rounded-3xl bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                                        <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block mb-1">
                                                            Registry Book Verification <span className="text-rose-500 font-extrabold">*Required</span>
                                                        </label>
                                                        <div className="grid grid-cols-1 gap-2.5">
                                                            {[
                                                                { id: "FORM_1A", title: "Form 1A", desc: "Record Found", activeColor: "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
                                                                { id: "FORM_1B", title: "Form 1B", desc: "Record Not Available", activeColor: "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                                                                { id: "FORM_1C", title: "Form 1C", desc: "Record Destroyed", activeColor: "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400" }
                                                            ].map((opt) => {
                                                                const isSelected = registryBookVerification === opt.id;
                                                                return (
                                                                    <button
                                                                        key={opt.id}
                                                                        type="button"
                                                                        onClick={() => setRegistryBookVerification?.(opt.id)}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-4 rounded-2xl border text-left transition-all duration-300 active:scale-98 select-none",
                                                                            isSelected ? opt.activeColor + " shadow-md font-bold" : "border-slate-150 dark:border-white/5 text-slate-500 dark:text-slate-400 bg-white dark:bg-[#151b28]/60 hover:bg-slate-50 dark:hover:bg-white/5"
                                                                        )}
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span className="text-xs font-black uppercase tracking-wider">{opt.title}</span>
                                                                            <span className="text-[10px] italic opacity-85 mt-0.5">{opt.desc}</span>
                                                                        </div>
                                                                        <div className={cn(
                                                                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                                            isSelected ? "border-current bg-current/15" : "border-slate-300 dark:border-white/10"
                                                                        )}>
                                                                            {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}



                                                <Button
                                                    onClick={handleEvaluate}
                                                    disabled={actionLoading}
                                                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center"
                                                >
                                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                                    Approve & Send Assessment
                                                </Button>

                                                <div className="flex gap-2">
                                                    {(transaction.revisionCount || 0) < 3 && (
                                                        <Button
                                                                                                                onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                                                                                                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase"
                                                                                                            >
                                                                                                                Request Revision
                                                                                                            </Button>
                                                    )}
                                                    <Button
                                                        onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase"
                                                    >
                                                        Decline
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {transaction.status === "FOR_REINSPECTION" && (
                                    <div className="space-y-4">
                                        <div className="p-6 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto">
                                                <Clock className="w-6 h-6 animate-pulse" />
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200">Ready for Registrar Processing</h4>
                                            <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">Payment has been confirmed. Click below to begin processing this document and officially notify the resident.</p>
                                        </div>

                                        <Button
                                            onClick={handleProcessRequest}
                                            disabled={actionLoading}
                                            className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center"
                                        >
                                            {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                            Process the request
                                        </Button>
                                    </div>
                                )}

                                {(transaction.status === "PAID" || transaction.status === "PENDING_PAYMENT_VERIFICATION") && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN") && (
                                    <div className="space-y-4">
                                        {/* Proof of Payment Lightbox */}
                                        {transaction.paymentReference && additional?.gcashReferenceNo && additional.gcashReferenceNo.toLowerCase() !== "n/a" && additional.gcashReferenceNo.toLowerCase() !== "na" && (
                                            <div className="space-y-3">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Payment Proof Reference</label>
                                                <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl space-y-3">
                                                    <div className="flex items-center gap-2">
                                                        <Coins className="text-primary w-4 h-4" />
                                                        <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                                                            Reference No: {additional?.gcashReferenceNo || "N/A"}
                                                        </span>
                                                    </div>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="relative aspect-[4/3] rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all select-none">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={transaction.paymentReference}
                                                                    alt="GCash Receipt"
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                    <span className="text-[9px] font-black text-white tracking-widest uppercase italic bg-primary px-3 py-1 rounded-full flex items-center gap-1.5">
                                                                        <ExternalLink className="w-3 h-3" /> Zoom Receipt
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </DialogTrigger>
                                                        <LightboxView src={transaction.paymentReference} alt="GCash Receipt" label="GCash Payment Proof" />
                                                    </Dialog>
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
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
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
                                                            setOrFile?.(null);
                                                            return;
                                                        }
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
                                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-[#151b28]/60 border border-slate-200 dark:border-white/10 rounded-2xl group shadow-sm">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 flex-shrink-0">
                                                                <Check className="w-4 h-4 stroke-[3]" />
                                                            </div>
                                                            <div className="overflow-hidden">
                                                                <p className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase leading-none truncate max-w-[180px]" title={orFile ? orFile.name : (transaction.orUrl ? transaction.orUrl.split("/").pop()?.split("?")[0] || "Official-Receipt.pdf" : "Official-Receipt.pdf")}>
                                                                    {orFile ? orFile.name : (transaction.orUrl ? transaction.orUrl.split("/").pop()?.split("?")[0] || "Official-Receipt.pdf" : "Official-Receipt.pdf")}
                                                                </p>
                                                                <p className="text-[8px] text-slate-400 italic mt-1 uppercase">
                                                                    {orFile ? "Ready for submission" : "Uploaded Official Receipt"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            {(orPreview || transaction.orUrl) && (() => {
                                                                const isPdf = orFile
                                                                    ? (orFile.type === "application/pdf" || orFile.name.toLowerCase().endsWith(".pdf"))
                                                                    : (transaction.orUrl
                                                                        ? (transaction.orUrl.toLowerCase().endsWith(".pdf") || transaction.orUrl.includes("application/pdf") || transaction.orUrl.includes(".pdf?"))
                                                                        : false);
                                                                return (
                                                                    <Dialog>
                                                                        <DialogTrigger asChild>
                                                                            <Button type="button" variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-wider flex items-center gap-1 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 select-none">
                                                                                <Eye className="w-3.5 h-3.5" /> Preview
                                                                            </Button>
                                                                        </DialogTrigger>
                                                                        <LightboxView src={orPreview || transaction.orUrl} alt="Attached O.R." label="Attached Official Treasury Receipt" isPdf={isPdf} />
                                                                    </Dialog>
                                                                );
                                                            })()}
                                                            <label
                                                                htmlFor="or-document-upload-paid"
                                                                className="h-8 px-3 rounded-lg border border-transparent bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-sm select-none"
                                                            >
                                                                <Upload className="w-3 h-3" /> Replace
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
                                            disabled={actionLoading || !orSeriesNumber || !orFile}
                                            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center"
                                        >
                                            {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                            Upload O.R. & Mark as Paid
                                        </Button>

                                        <div className="flex gap-2">
                                            {(transaction.revisionCount || 0) < 3 && (
                                                <Button
                                                                                                onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                                                                                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase"
                                                                                            >
                                                                                                Request Revision
                                                                                            </Button>
                                            )}
                                            <Button
                                                onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                                className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase"
                                            >
                                                Decline
                                            </Button>
                                        </div>
                                    </div>
                                )}


                                {transaction.status === "FOR_PROCESSING" && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN" || rawUserRole === "COURIER") && (() => {
                                    const isReleaseDisabled = actionLoading || (!eCopyFile && !transaction.eCopyUrl);
                                    return (
                                        <div className="space-y-6">
                                            <PrintWaybill
                                                transaction={transaction}
                                                resident={resident}
                                                deliveryAddr={null}
                                                fiscal={null}
                                                branding={branding}
                                                themeColor={themeColor}
                                            />

                                            {/* Digital E-Copy Upload Block */}
                                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                                                    Attach Official Digital E-Copy Registry Record <span className="text-rose-500 font-extrabold">*Required</span>
                                                </label>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0] || null;
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
                                                            return;
                                                        }
                                                        setECopyFile(file);
                                                        if (file) {
                                                            const url = URL.createObjectURL(file);
                                                            setECopyPreview(url);
                                                        } else {
                                                            setECopyPreview(null);
                                                        }
                                                    }}
                                                    className="hidden"
                                                    id="treasury-ecopy-upload"
                                                />
                                                <label
                                                    htmlFor="treasury-ecopy-upload"
                                                    className={cn(
                                                        "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition-all h-44 bg-[#f8fafd] dark:bg-white/5 overflow-hidden relative group cursor-pointer",
                                                        (eCopyFile || transaction.eCopyUrl)
                                                            ? "border-primary/30 bg-primary/5 shadow-inner"
                                                            : "border-slate-200 dark:border-white/10 hover:border-primary/30"
                                                    )}
                                                >
                                                    {(eCopyPreview || transaction.eCopyUrl) ? (
                                                        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center">
                                                            {((eCopyFile && eCopyFile.type.startsWith("image/")) || (!eCopyFile && transaction.eCopyUrl && /\.(png|jpe?g|gif|webp|svg)$/i.test(transaction.eCopyUrl))) ? (
                                                                <div className="relative w-full h-full group/img select-none">
                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                    <img
                                                                        src={eCopyPreview || transaction.eCopyUrl}
                                                                        alt="E-Copy Preview"
                                                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-85 transition-opacity"
                                                                    />
                                                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity duration-350 backdrop-blur-[1px] z-10">
                                                                        <Button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault();
                                                                                handleViewFile?.(eCopyPreview || transaction.eCopyUrl, "Official E-Copy Document");
                                                                            }}
                                                                            style={{ backgroundColor: themeColor }}
                                                                            className="h-9 px-4 rounded-xl border border-white/20 text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg hover:scale-105 transition-all"
                                                                        >
                                                                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center text-primary/60 group-hover:text-primary transition-colors">
                                                                    <FileText className="w-10 h-10" />
                                                                    <span className="text-[9px] font-black uppercase italic tracking-widest mt-2">PDF Document Ready</span>
                                                                </div>
                                                            )}

                                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 backdrop-blur-sm">
                                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                                                                    <Upload className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase text-white tracking-widest italic">Update E-Copy Attachment</span>
                                                            </div>

                                                            <div className="absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between border-t border-slate-100 dark:border-white/5 z-20">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                        <Check className="w-3 text-primary stroke-[3]" />
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                                                                        {eCopyFile?.name || "Registry-Record.pdf"}
                                                                    </span>
                                                                </div>
                                                                {(eCopyPreview || transaction.eCopyUrl) && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            e.preventDefault();
                                                                            handleViewFile?.(eCopyPreview || transaction.eCopyUrl, "Digital E-Copy Registry Record");
                                                                        }}
                                                                        className="h-7 px-2.5 text-[8px] font-black uppercase tracking-wider flex items-center gap-1 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 select-none z-30"
                                                                    >
                                                                        <Eye className="w-3 h-3" /> Preview
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 shadow-sm transition-all group-hover:bg-primary group-hover:text-white">
                                                                <Upload className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
                                                            </div>
                                                            <div className="text-center space-y-1">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400 dark:text-slate-500 block">
                                                                    Attach Digital Registry Record
                                                                </span>
                                                                <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase italic tracking-tighter">
                                                                    PDF or Image up to 5MB
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </label>
                                            </div>

                                            {transaction.fulfillmentMode === "DELIVERY" && !transaction.waybillPrintedAt && (
                                                <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-500 flex items-start gap-3">
                                                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-bold leading-relaxed">
                                                        Print the official shipping waybill before releasing to update the logistics carrier dispatch system.
                                                    </p>
                                                </div>
                                            )}

                                            {(!eCopyFile && !transaction.eCopyUrl) && (
                                                <div className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-600 dark:text-rose-500 flex items-start gap-3">
                                                    <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                                                    <p className="text-[10px] font-bold leading-relaxed">
                                                        You must upload the official digital E-Copy registry record before you can release this document.
                                                    </p>
                                                </div>
                                            )}

                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                                {(transaction.fulfillmentMode === "DELIVERY" || transaction.fulfillmentType === "DELIVERY") ? (
                                                    <div className="space-y-3 w-full">
                                                        <Button
                                                            onClick={handlePrintWaybill}
                                                            variant="outline"
                                                            className="w-full h-12 rounded-2xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all flex items-center justify-center"
                                                        >
                                                            Generate & Print Waybill
                                                        </Button>
                                                        <Button
                                                            onClick={handleRelease}
                                                            disabled={isReleaseDisabled}
                                                            className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black italic uppercase tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : "Proceed to For Pick Up"}
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        onClick={handleRelease}
                                                        disabled={isReleaseDisabled}
                                                        className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black italic uppercase tracking-wider shadow-lg shadow-green-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : "Proceed to For Claim"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {transaction.status === "FOR_PICKING" && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN" || rawUserRole === "COURIER") && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <PrintWaybill
                                            transaction={transaction}
                                            resident={resident}
                                            deliveryAddr={null}
                                            fiscal={null}
                                            branding={branding}
                                            themeColor={themeColor}
                                        />
                                        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20 text-primary flex items-start gap-3">
                                            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-bold leading-relaxed">
                                                This document is currently queued for delivery. You can generate and print the shipping waybill using the button below.
                                            </p>
                                        </div>

                                        <Button
                                            onClick={handlePrintWaybill}
                                            variant="outline"
                                            className="w-full h-12 rounded-2xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all flex items-center justify-center"
                                        >
                                            Generate & Print Waybill
                                        </Button>
                                    </div>
                                )}

                                {transaction.status === "FOR_CLAIM" && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN") && (
                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 text-green-600 dark:text-green-500 flex items-start gap-3">
                                            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-bold leading-relaxed">
                                                This document is ready for claiming. Once the resident personally claims the physical copy, click below to confirm and mark this request as officially released.
                                            </p>
                                        </div>

                                        <Button
                                            onClick={handleRelease}
                                            disabled={actionLoading}
                                            className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black italic uppercase tracking-wider shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2"
                                        >
                                            {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : "Confirm & Release Document"}
                                        </Button>
                                    </div>
                                )}

                            </div>
                        )}

                    </div>

                </div>

            </div>

            <RejectionRevisionControls
                isRejecting={isRejecting}
                setIsRejecting={setIsRejecting}
                isRequestingRevision={isRequestingRevision}
                setIsRequestingRevision={setIsRequestingRevision}
                remarks={remarks}
                setRemarks={setRemarks}
                actionLoading={actionLoading}
                handleReject={handleReject}
                handleRequestRevision={handleRequestRevision}
            />
        </div>
    );
}
