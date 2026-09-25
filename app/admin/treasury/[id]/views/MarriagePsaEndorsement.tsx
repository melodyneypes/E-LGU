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
    Hash,
    Heart
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { callTicketToCounter } from "@/app/admin/transactions/calling-actions";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ResidentIdentityProfile from "@/app/admin/treasury/[id]/components/ResidentIdentityProfile";
import TransactionInfoCard from "@/app/admin/treasury/[id]/components/TransactionInfoCard";
import RejectionRevisionControls from "@/app/admin/treasury/[id]/components/RejectionRevisionControls";
import PrintWaybill from "@/app/admin/treasury/[id]/components/PrintWaybill";
import PremiumDocumentUpload from "@/components/shared/PremiumDocumentUpload";
import TreasuryPaymentCollectionPanel from "../components/TreasuryPaymentCollectionPanel";
import { cn } from "@/lib/utils";

export default function MarriagePsaEndorsementView(props: TreasuryViewProps) {
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
        handlePrintWaybill,
        handleCollectPsaPayment
    } = props;

    const [isAssessmentOpen, setIsAssessmentOpen] = React.useState(true);

    const handleCallInQueue = async () => {
        const activeCounter = typeof window !== "undefined" ? localStorage.getItem("activeCounterName") : null;
        if (!activeCounter) {
            toast.error("Please configure your active counter/window first using the Set Counter selector.");
            return;
        }

        try {
            const res = await callTicketToCounter(transaction.id, activeCounter);
            if (res.success) {
                toast.success(`Successfully called ticket: ${transaction.queueNumber || transaction.id}`);
                window.location.href = "/admin/treasury/queue";
            } else {
                toast.error(res.error || "Failed to call ticket.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to call ticket.");
        }
    };
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const additional = transaction.additionalData || {};

    const deliveryAddr = transaction.deliveryAddress
        ? (typeof transaction.deliveryAddress === 'string' ? JSON.parse(transaction.deliveryAddress) : transaction.deliveryAddress)
        : null;
    const fiscal = transaction.fiscalSnapshot || null;

    const isTreasuryContext = backUrl?.includes("/admin/treasury") || rawUserRole === "TREASURY_STAFF";
    const typeCode = transaction?.type?.code || "";
    const isAppointmentPsa = typeCode === "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT";
    const isRegistrarReleasing = isAppointmentPsa && (transaction.isPaid || transaction.status === "FOR_CLAIM" || transaction.status === "FOR_PICKING" || (transaction.status === "FOR_PROCESSING" && additional?.servingDepartment === "Registrar"));
    const isPaymentInputDisabled = isAppointmentPsa && (
        (transaction.status === "FOR_PROCESSING" && additional?.servingDepartment !== "Treasury") ||
        transaction.status === "UNPAID"
    );
    const husbandFullName = additional.husbandFullName || additional.husbandName || "—";
    const wifeFullName = additional.wifeFullName || additional.wifeName || "—";
    const subjectName = husbandFullName !== "—" && wifeFullName !== "—" ? `${husbandFullName} & ${wifeFullName}` : "N/A";
    const dateOfMarriage = additional.dateOfMarriage || additional.dateOfEvent || "";
    const placeOfMarriage = additional.placeOfMarriage || "";

    const psaNegativeCertUrl = additional.psaNegativeCert || null;
    const form3aUrl = additional.form3a || null;

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
                            transactionName={isAppointmentPsa ? "Marriage Certified True Copy Appointment" : "Marriage PSA Endorsement Request"}
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

                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-12 animate-in fade-in duration-300">
                            <div
                                className="flex justify-between items-center cursor-pointer select-none"
                                onClick={() => setIsAssessmentOpen(!isAssessmentOpen)}
                            >
                                <div className="space-y-1 flex-1 min-w-0 pr-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                        Husband & Wife Name
                                    </span>
                                    <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none truncate">
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
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Relationship to Subject</span>
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
                                                <span>Miscellaneous Fee</span>
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
                                                                    <div className="relative w-28 shrink-0 flex items-center border-l border-slate-105 dark:border-white/5 pl-3">
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
                                                        {!feeLineItems.some(i => !i.readonly) && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={addFeeLineItem}
                                                                className="w-full h-10 border-dashed border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-350 rounded-xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                                Add Assessment Row
                                                            </Button>
                                                        )}
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

                        <ResidentIdentityProfile
                            resident={resident}
                            safeFormatDate={safeFormatDate}
                            themeColor={themeColor}
                            titleColorText="Informant"
                            titleWhiteText="Profile"
                            subtitleText="Verified Requester / Informant Data Dossier"
                            relationship={additional.relationship}
                        />

                        <div className="bg-[#111827] border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl space-y-8 animate-in fade-in duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-primary rounded-xl text-white shadow-lg shadow-primary/20">
                                    <Heart className="w-5 h-5" />
                                </div>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 italic">
                                    Marriage PSA Endorsement Information
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-primary italic">
                                        Marriage Details
                                    </h4>
                                    <div className="space-y-6">
                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Husband Full Name</span>
                                            <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                {husbandFullName}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Wife Full Name (Maiden Name)</span>
                                            <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                {wifeFullName}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Date of Marriage</span>
                                            <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                {safeFormatDate(dateOfMarriage)}
                                            </div>
                                        </div>

                                        {placeOfMarriage && (
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block leading-none">Place of Marriage</span>
                                                <div className="bg-[#1f2937]/50 border border-slate-800 rounded-2xl h-12 px-4 flex items-center font-bold text-white text-sm uppercase leading-none">
                                                    {placeOfMarriage}
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

                        {((psaNegativeCertUrl || form3aUrl) && (
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
                                    {form3aUrl && (
                                        <div
                                            onClick={() => handleViewFile?.(form3aUrl, "Form 3A (Local Copy)")}
                                            className="relative group rounded-3xl overflow-hidden aspect-[3/2] bg-[#f8fafd] dark:bg-white/5 border border-slate-200/50 dark:border-white/5 cursor-pointer shadow-md hover:shadow-xl transition-all"
                                        >
                                            <img
                                                src={form3aUrl}
                                                alt="Form 3A (Local Copy)"
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
                                                Form 3A (Local Registry Copy)
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-4 space-y-8 lg:sticky lg:top-8 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
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

                        {isTreasuryContext && !isRegistrarReleasing && ["PAID", "PENDING_PAYMENT_VERIFICATION", "EVALUATED", "UNPAID"].includes(transaction.status) && (
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


                        {/* TREASURY RELEASE ACTION FOR APPOINTMENT PSA (FOR_CLAIM / FOR_PICKING / FOR_PROCESSING at Registrar) */}
                        {isTreasuryContext && isRegistrarReleasing && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-4 text-center">
                                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
                                        <Check className="w-7 h-7" />
                                    </div>
                                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200">Releasing under Civil Registrar</h4>
                                    <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">
                                        The payment has been collected and verified. The Civil Registrar is responsible for releasing the documents to the resident.
                                    </p>
                                </div>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
