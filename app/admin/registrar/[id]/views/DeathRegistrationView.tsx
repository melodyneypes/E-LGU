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
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import LightboxView from "@/app/admin/treasury/[id]/components/LightboxView";
import PrintWaybill from "@/app/admin/treasury/[id]/components/PrintWaybill";
import ResidentIdentityProfile from "@/app/admin/treasury/[id]/components/ResidentIdentityProfile";
import TransactionInfoCard from "@/app/admin/treasury/[id]/components/TransactionInfoCard";
import RejectionRevisionControls from "@/app/admin/treasury/[id]/components/RejectionRevisionControls";
import { cn } from "@/lib/utils";

export default function DeathRegistrationView(props: TreasuryViewProps) {
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
    const regType = (additional.registrationType || "").toUpperCase();

    const subjectName = transaction.deathRegistration?.subjectName || additional.fullName || additional.subjectName || "N/A";

    // Hide FOR_REQUESTING from Registrar — only Treasury should see this status
    if (transaction.status === "FOR_REQUESTING" && !isTreasuryContext) {
        return (
            <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a] transition-colors duration-300">
                <div className={`h-1.5 w-full ${themeColor} transition-all duration-500`} />
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                    <Link
                        href={backUrl}
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors group mb-8"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Requests
                    </Link>

                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">
                            Awaiting Payment
                        </h3>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 italic leading-relaxed">
                            This death registration request is currently awaiting payment from the citizen. It is handled by the Treasury Department and is not displayed for the Registrar at this time.
                        </p>
                    </div>
                </div>
            </div>
        );
    }


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
                            transactionName="Death Registration Request "
                            categoryLabel="Local Civil Registry"
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
                                            Deceased Name
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
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Registration Type</span>
                                            <p className="text-lg font-black italic tracking-tighter dark:text-slate-200 uppercase">
                                                {regType || "STANDARD"}
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
                                                <span>Registration Fee</span>
                                                <span className="dark:text-slate-200 font-black">
                                                    {parseFloat(miscFee || "0") > 0
                                                        ? `₱${(parseFloat(miscFee || "0")).toFixed(2)}`
                                                        : "FREE"}
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
                                                if (!item.readonly && transaction.status === "FOR_INSPECTION") {
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
                                            {transaction.status === "FOR_INSPECTION" && (
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

                        {/* Primary LCR Specific Details Panel */}
                        <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-xl dark:shadow-2xl space-y-8 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 italic">
                                    Death Registry Record Data
                                </h3>
                            </div>

                            {(additional.orSeriesNumber || additional.scannedDocUrl) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
                                    {additional.orSeriesNumber && (
                                        <div className="flex flex-col justify-center gap-2">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">O.R. Series Number</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                {additional.orSeriesNumber}
                                            </div>
                                        </div>
                                    )}
                                    {additional.scannedDocUrl && (
                                        <div className="flex flex-col justify-center gap-2">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Verified Registry Document</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center">
                                                <Button
                                                    onClick={() => handleViewFile?.(additional.scannedDocUrl, "Scanned Death Registration Document")}
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-[10px] font-black uppercase tracking-wider flex items-center gap-2 bg-white dark:bg-[#1f2937]/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-[#1f2937] h-8"
                                                >
                                                    <FileText className="w-3.5 h-3.5" /> View Scanned Document
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">
                                        Deceased / Event Info
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Deceased Full Name</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                {subjectName}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Date of Death</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {safeFormatDate(additional.dateOfDeath || additional.dateOfEvent)}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Registry No.</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {transaction.deathRegistration?.registryNumber || "PENDING"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Cause of Death</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.causeOfDeath || "—"}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Place of Death</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.placeOfEvent || additional.placeOfDeath || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        {(transaction.deathRegistration?.issuedBy || additional.issuedBy) && (
                                            <div className="space-y-1.5 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Issued By</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {transaction.deathRegistration?.issuedBy || additional.issuedBy}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">Parental & Demographic Details</h4>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Father&apos;s Full Name</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.fathersName || "—"}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Mother&apos;s Full Name</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.mothersName || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Gender</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.gender || "—"}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Civil Status</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.civilStatus || "—"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Deceased Date of Birth</span>
                                            <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                {safeFormatDate(additional.dateOfBirth)}
                                            </div>
                                        </div>

                                        {additional.civilStatus === "MARRIED" && additional.survivingSpouseName && (
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Surviving Spouse Name</span>
                                                <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                                    {additional.survivingSpouseName}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* CORPSE DISPOSAL & BURIAL DETAILS */}
                            <div className="pt-8 border-t border-slate-100 dark:border-slate-800/50 space-y-6">
                                <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">Corpse Disposal & Burial Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Disposal Method</span>
                                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                            {additional.corpseDisposal || "—"}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Cemetery / Disposal Location</span>
                                        <div className="bg-slate-50 dark:bg-[#1f2937]/50 border border-slate-100 dark:border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-slate-800 dark:text-white text-sm uppercase leading-none">
                                            {additional.burialLocation || "—"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ATTACHMENT CARD FOR EVIDENCE */}
                        {evidenceDocs && evidenceDocs.filter((d: any) => d?.url).length > 0 && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-12 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[#1e293b] dark:text-white leading-none">
                                    Submitted Identifications & Requirements
                                </h3>
                                <div className={cn("grid gap-6", evidenceDocs.filter((d: any) => d?.url).length === 1 ? "grid-cols-1 max-w-sm" : "grid-cols-2")}>
                                    {evidenceDocs.map((doc: any, idx: number) => {
                                        if (!doc.url) return null;
                                        const isPdf = doc.url.toLowerCase().endsWith(".pdf") || doc.url.includes("application/pdf") || doc.url.includes(".pdf?");
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => handleViewFile?.(doc.url, doc.label, evidenceDocs, idx)}
                                                className="relative group rounded-3xl overflow-hidden aspect-[3/2] bg-[#f8fafd] dark:bg-white/5 border border-slate-200/50 dark:border-white/5 cursor-pointer shadow-md hover:shadow-xl transition-all"
                                            >
                                                {isPdf ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#1f2937]/20 gap-2 p-4 group-hover:scale-[1.03] transition-all duration-500">
                                                        <FileText className="w-10 h-10 text-red-500 animate-pulse" />
                                                        <span className="text-[9px] font-black uppercase text-red-500/70 tracking-widest text-center">View PDF Document</span>
                                                    </div>
                                                ) : (
                                                    /* eslint-disable-next-line @next/next/no-img-element */
                                                    <img
                                                        src={doc.url}
                                                        alt={doc.label}
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
                                                    {doc.label}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Workflow Actions Controls */}
                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8 animate-in fade-in duration-300">
                        {/* PHASE TRACKER STEPPER */}
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#1e293b] dark:text-slate-400">
                                Service Request Progress
                            </h3>
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
                                                This death registration request has been declined.
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

                        {/* PAYMENT REFERENCE AND O.R. DETAILS (Shown below Status Tracker for FOR_REINSPECTION status) */}
                        {transaction.status === "FOR_REINSPECTION" && (
                            <div className="space-y-4">
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

                                {/* O.R. Details Card */}
                                {(() => {
                                    const orNo = additional?.orSeriesNumber || transaction.orSeriesNumber || additional?.orNumber || additional?.orNo;
                                    const orDocUrl = additional?.orDocumentUrl || transaction.orUrl || additional?.orUrl;

                                    if (!orNo && !orDocUrl) return null;

                                    return (
                                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-xl dark:shadow-2xl border border-slate-50 dark:border-white/5 space-y-4">
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
                                                                className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all cursor-pointer select-none"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={orDocUrl}
                                                                    alt="Official Receipt"
                                                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-500"
                                                                />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center z-10">
                                                                    <div
                                                                        style={{ backgroundColor: themeColor }}
                                                                        className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg"
                                                                    >
                                                                        <span>VIEW</span>
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
                            </div>
                        )}

                        {/* SPECIFIC REGISTRAR OPERATION STEP CONTROLLER */}
                        {transaction.status === "FOR_INSPECTION" && (
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
                                    <Button
                                        onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                        className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all"
                                    >
                                        Revision
                                    </Button>
                                    <Button
                                        onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all"
                                    >
                                        Decline
                                    </Button>
                                </div>
                            </div>
                        )}

                        {transaction.status === "FOR_REQUESTING" && (
                            <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-4 text-center animate-in fade-in duration-300">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
                                    <Clock className="w-6 h-6 animate-pulse" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200 font-bold">Awaiting Payment & Verification</h4>
                                <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">
                                    This request is currently waiting for the citizen to settle the payment and for the Treasury Department to verify the transaction. No action is required from the Registrar at this time.
                                </p>
                            </div>
                        )}

                        {transaction.status === "EVALUATED" && (
                            <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-4 text-center animate-in fade-in duration-300">
                                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 mx-auto">
                                    <Clock className="w-6 h-6 animate-pulse" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200 font-bold">Assessment Sent</h4>
                                <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">
                                    Assessment has been submitted. Waiting for the citizen to complete GCash payment or walk-in transaction. No action is required from the Registrar at this time.
                                </p>
                            </div>
                        )}

                        {/* REGISTRAR FOR_REINSPECTION CONTROLLER */}
                        {transaction.status === "FOR_REINSPECTION" && (
                            <div className="space-y-6">
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

                        {/* TREASURY PAID / VERIFICATION CONTROLLER */}
                        {(transaction.status === "PAID" || transaction.status === "PENDING_PAYMENT_VERIFICATION") && (
                            <div className="space-y-4">
                                {/* GCash Reference Card */}
                                {(() => {
                                    const refNo = additional?.gcashReferenceNo || transaction.paymentReference || additional?.paymentReference;
                                    if (!refNo) return null;

                                    return (
                                        <div className="space-y-3">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Payment Proof Reference</label>
                                            <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <Coins className="text-primary w-4 h-4" />
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
                                        </div>
                                    );
                                })()}

                                {/* GCash Receipt Image Card */}
                                {transaction.paymentReference && transaction.paymentReference.trim() !== "" && transaction.paymentReference.startsWith("http") && (
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Receipt Image</label>
                                        <div className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                                            <div
                                                onClick={() => handleViewFile?.(transaction.paymentReference, "Payment Proof Document")}
                                                className="relative aspect-[4/3] rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/5 overflow-hidden group cursor-pointer hover:border-primary/50 transition-all select-none"
                                            >
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
                                        </div>
                                    </div>
                                )}

                                {/* Treasury OR Form - Only visible on Treasury context */}
                                {isTreasuryContext && (
                                    <>
                                        <div className="space-y-4 p-5 rounded-3xl bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block mb-1">
                                                Upload Official Treasury Receipt
                                            </span>

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
                                            disabled={actionLoading || !orSeriesNumber || !orFile}
                                            className="w-full h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all shadow-green-500/10"
                                        >
                                            {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                            Upload O.R. & Mark as Paid
                                        </Button>
                                    </>
                                )}

                                {/* Registrar Read-Only Note */}
                                {!isTreasuryContext && (
                                    <div className="p-6 text-center rounded-3xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3">
                                        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
                                            <Clock className="w-6 h-6 animate-pulse" />
                                        </div>
                                        <h4 className="text-xs font-black uppercase tracking-[0.25em] text-slate-700 dark:text-slate-200 font-bold">Awaiting Treasury Verification</h4>
                                        <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">
                                            This request is currently read-only for Registrar Staff. We are waiting for the Treasury Department to verify the payment and upload the Official Receipt (O.R.).
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* REGISTRAR PROCESS STATE (FOR_PROCESSING) */}
                        {transaction.status === "FOR_PROCESSING" && (
                            <div className="space-y-6">
                                <div className="bg-white dark:bg-[#111827] border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl dark:shadow-2xl space-y-6">
                                    <div className="space-y-1">
                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#10b981] italic">Upload & Release Document</h4>
                                        <p className="text-xs font-bold text-slate-500 italic">Verify registry book, attach records, and release e-copy.</p>
                                    </div>

                                    {/* Digital E-Copy Upload Block */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
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
                                                "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition-all h-44 bg-slate-50 dark:bg-[#1f2937]/20 overflow-hidden relative group cursor-pointer",
                                                (eCopyFile || transaction.eCopyUrl)
                                                    ? "border-primary/30 bg-primary/5 shadow-inner"
                                                    : "border-slate-200 dark:border-slate-800 hover:border-primary/30"
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
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-500 shadow-sm transition-all group-hover:bg-primary group-hover:text-white">
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
                                </div>

                                {transaction.fulfillmentType === "DELIVERY" && (
                                    <Button
                                        onClick={handlePrintWaybill}
                                        variant="outline"
                                        className="w-full h-12 rounded-xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all"
                                    >
                                        Generate & Print Waybill
                                    </Button>
                                )}

                                <Button
                                    onClick={handleRelease}
                                    disabled={actionLoading || (!eCopyFile && !transaction.eCopyUrl)}
                                    className={`w-full rounded-xl h-12 text-xs font-black uppercase tracking-widest italic text-white ${themeColor}`}
                                >
                                    {actionLoading
                                        ? "Releasing Request..."
                                        : transaction.fulfillmentType === "DELIVERY"
                                            ? "Ready For Picking"
                                            : "Ready For Claim"}
                                </Button>
                            </div>
                        )}

                        {/* REGISTRAR RELEASE FOR PICKING ACTION */}
                        {transaction.status === "FOR_PICKING" && (
                            <div className="space-y-6">
                                <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-6">
                                    <div className="text-center space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
                                            <FileText className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200 font-bold">Awaiting Rider Pickup</h4>
                                        <p className="text-xs text-slate-400 italic max-w-sm mx-auto">
                                            The document is ready for delivery. Generate the waybill below for the delivery rider.
                                        </p>
                                    </div>
                                </div>

                                <Button
                                    onClick={handlePrintWaybill}
                                    variant="outline"
                                    className="w-full h-14 rounded-2xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all"
                                >
                                    Generate & Print Waybill
                                </Button>
                            </div>
                        )}

                        {/* REGISTRAR RELEASE FOR CLAIM ACTION */}
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

                                    {(transaction.eCopyUrl || additional.eCopyUrl) && (
                                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 space-y-4 text-left">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">E-copy of the Requirements</span>
                                            <div
                                                onClick={() => handleViewFile?.(transaction.eCopyUrl || additional.eCopyUrl, "Issued Registry Record")}
                                                className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all cursor-pointer select-none"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={transaction.eCopyUrl || additional.eCopyUrl}
                                                    alt="Registry Record Preview"
                                                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                                                    <button
                                                        type="button"
                                                        style={{ backgroundColor: themeColor }}
                                                        className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg hover:scale-105 transition-all"
                                                    >
                                                        <span>VIEW</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleRelease}
                                    disabled={actionLoading}
                                    className={`w-full h-14 rounded-2xl text-xs font-black uppercase tracking-wider italic text-white ${themeColor} shadow-lg active:scale-95 transition-all`}
                                >
                                    {actionLoading && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                    Release the Document
                                </Button>
                            </div>
                        )}

                        {/* REGISTRAR RELEASED / DELIVERED DETAILS VIEW */}
                        {(transaction.status === "RELEASED" || transaction.status === "DELIVERED") && (
                            <div className="space-y-6">
                                <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-6">
                                    <div className="text-center space-y-3">
                                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 mx-auto">
                                            <Check className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-sm font-black uppercase tracking-[0.25em] text-slate-800 dark:text-slate-200 font-bold">
                                            {transaction.status === "DELIVERED" ? "Document Delivered" : "Document Released"}
                                        </h4>
                                        <p className="text-xs text-slate-400 italic max-w-sm mx-auto">
                                            {transaction.status === "DELIVERED"
                                                ? "This request has been successfully delivered to the resident."
                                                : "This request has been completed and the official document has been released."}
                                        </p>
                                    </div>

                                    {(transaction.eCopyUrl || additional.eCopyUrl) && (
                                        <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 space-y-4 text-left">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">E-copy of the Requirements</span>
                                            <div
                                                onClick={() => handleViewFile?.(transaction.eCopyUrl || additional.eCopyUrl, "Issued Registry Record")}
                                                className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all cursor-pointer select-none"
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={transaction.eCopyUrl || additional.eCopyUrl}
                                                    alt="Registry Record Preview"
                                                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                                                    <button
                                                        type="button"
                                                        style={{ backgroundColor: themeColor }}
                                                        className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg hover:scale-105 transition-all"
                                                    >
                                                        <span>VIEW</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
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
