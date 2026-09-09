/* eslint-disable @typescript-eslint/no-unused-vars */
import { Dispatch, SetStateAction } from "react";
import { TreasuryViewProps } from "./types";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import {
    ArrowLeft,
    Check,
    Coins,
    FileText,
    Hash,
    Plus,
    AlertCircle,
    RotateCw,
    ExternalLink,
    Ban,
    Trash2,
    Upload,
    ZoomIn,
    Volume2
} from "lucide-react";
import { toast } from "sonner";
import { callTicketToCounter } from "@/app/admin/transactions/calling-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LightboxView from "../components/LightboxView";
import PrintWaybill from "../components/PrintWaybill";
import ResidentIdentityProfile from "../components/ResidentIdentityProfile";
import TransactionInfoCard from "../components/TransactionInfoCard";
import RejectionRevisionControls from "../components/RejectionRevisionControls";
import { cn } from "@/lib/utils";

export default function BuildingPermitView(props: TreasuryViewProps) {
    const router = useRouter();
    const {
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
        setDeliveryFee,
        eCopyFile,
        setECopyFile,
        eCopyPreview,
        setECopyPreview,
        orFile,
        setOrFile,
        orPreview,
        setOrPreview,
        themeColor,
        branding,
        additionalFeeLabel,
        setAdditionalFeeLabel,
        additionalFeeAmount,
        setAdditionalFeeAmount,
        showAdditionalFeeForm,
        setShowAdditionalFeeForm,
        isResolvingDispute,
        setIsResolvingDispute,
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
        handleAddAdditionalFee,
        handleRemoveAdditionalFee,
        handleApproveBilling,
        handleReject,
        handleRequestRevision,
        safeFormatDate,
        displayTotal,
        evidenceDocs,
        steps,
        currentStepIdx,
        hasVerification,
        hasDispute,
        isRequirementsAlone,
        receiptFile,
        setReceiptFile,
        receiptPreview,
        setReceiptPreview,
        handleReceiptFileSelect,
        orSeriesNumber,
        setOrSeriesNumber
    } = props;

    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const residentFullName = [resident?.firstName, resident?.lastName].filter(Boolean).join(" ") || transaction.user?.name || transaction.fullName || "";
    const additional = typeof transaction.additionalData === "string"
        ? (() => { try { return JSON.parse(transaction.additionalData); } catch { return {}; } })()
        : (transaction.additionalData || {});

    const [callingQueue, setCallingQueue] = React.useState(false);
    const [activeCounterName, setActiveCounterName] = React.useState<string>("Counter 1");

    React.useEffect(() => {
        const updateCounter = () => {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem("activeCounterName");
                if (saved) setActiveCounterName(saved);
            }
        };
        updateCounter();
        window.addEventListener("storage", updateCounter);
        return () => window.removeEventListener("storage", updateCounter);
    }, []);

    const playLocalChimeAndVoice = (queueNum: string, counter: string) => {
        try {
            if (typeof window === "undefined") return;
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                const ctx = new AudioContextClass();
                const freqs = [523.25, 659.25, 783.99, 1046.50];
                freqs.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.type = "sine";
                    const startTime = ctx.currentTime + i * 0.12;
                    const duration = i === 3 ? 1.5 : 0.3;
                    osc.frequency.setValueAtTime(freq, startTime);
                    gain.gain.setValueAtTime(0, ctx.currentTime);
                    gain.gain.setValueAtTime(i === 3 ? 0.15 : 0.12, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                    osc.start(startTime);
                    osc.stop(startTime + duration);
                });
            }

            if (window.speechSynthesis) {
                setTimeout(() => {
                    window.speechSynthesis.cancel();
                    const phrase = `Ticket number, ${queueNum.split("").join(" ")}, please proceed to ${counter}.`;
                    const utterance = new SpeechSynthesisUtterance(phrase);
                    utterance.rate = 0.85;
                    utterance.pitch = 1.05;
                    const voices = window.speechSynthesis.getVoices();
                    const femaleVoice = voices.find(v => {
                        const n = v.name.toLowerCase();
                        const l = v.lang.toLowerCase();
                        return l.startsWith("en") && (n.includes("zira") || n.includes("samantha") || n.includes("hazel") || n.includes("female"));
                    });
                    if (femaleVoice) utterance.voice = femaleVoice;
                    window.speechSynthesis.speak(utterance);
                }, 1000);
            }
        } catch (e) {
            console.error("Local audio chime error:", e);
        }
    };

    const handleCallInQueue = async () => {
        const activeCounter = typeof window !== "undefined" ? (localStorage.getItem("activeCounterName") || activeCounterName || "Counter 1") : "Counter 1";
        setCallingQueue(true);
        try {
            const res = await callTicketToCounter(transaction.id, activeCounter);
            if (res.success) {
                toast.success(`Successfully called ticket: ${transaction.queueNumber || transaction.id}`);
                playLocalChimeAndVoice(transaction.queueNumber || transaction.id, activeCounter);
                window.location.href = "/admin/treasury/queue";
            } else {
                toast.error(res.error || "Failed to call ticket.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to call ticket.");
        } finally {
            setCallingQueue(false);
        }
    };

    const handleRecallInQueue = async () => {
        const activeCounter = additional.counterName || activeCounterName || "Counter 1";
        setCallingQueue(true);
        try {
            const res = await callTicketToCounter(transaction.id, activeCounter);
            if (res.success) {
                toast.success(`📢 Re-calling ticket: ${transaction.queueNumber || transaction.id} to ${activeCounter}`);
                playLocalChimeAndVoice(transaction.queueNumber || transaction.id, activeCounter);
                await fetchTransaction();
            } else {
                toast.error(res.error || "Failed to recall ticket.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to recall ticket.");
        } finally {
            setCallingQueue(false);
        }
    };

    const hasQueueTicket = Boolean(transaction.queueNumber);
    const isServingAtCounter = Boolean(
        additional?.counterName &&
        (transaction.status === "FOR_PROCESSING" || additional?.servingDepartment === "Treasury")
    );
    const requiresQueueCall = hasQueueTicket && !isServingAtCounter;

    const totalEndorsedAmount =
        (additional.feeAssessment?.buildingPermitFee || 0) +
        (additional.feeAssessment?.municipalCharges || 0) +
        (additional.feeAssessment?.engineerMunicipalCharges || []).reduce(
            (sum: number, c: any) => sum + Number(c.amount || 0),
            0
        ) +
        (additional.feeAssessment?.zoningMunicipalCharges || []).reduce(
            (sum: number, c: any) => sum + Number(c.amount || 0),
            0
        ) +
        (additional.feeAssessment?.additionalFees || []).reduce(
            (sum: number, f: any) => sum + Number(f.amount || 0),
            0
        );

    const [amountPaid, setAmountPaid] = React.useState(totalEndorsedAmount.toString());

    const paymentSrc = transaction.paymentReference || transaction.paymentProofUrl;
    const isValidPaymentSrc =
        typeof paymentSrc === "string" &&
        (paymentSrc.trim().startsWith("/") ||
            paymentSrc.trim().startsWith("http://") ||
            paymentSrc.trim().startsWith("https://") ||
            paymentSrc.trim().startsWith("blob:") ||
            paymentSrc.trim().startsWith("data:"));

    const paymongoPaymentId = (() => {
        const paymongo = additional.paymongo || {};
        const lastPayment = paymongo.lastPayment || {};
        const payments =
            lastPayment?.data?.attributes?.payments ||
            lastPayment?.attributes?.payments ||
            lastPayment?.data?.payments ||
            [];
        const payment = Array.isArray(payments) ? payments[0] : null;
        return payment?.id || payment?.data?.id || paymongo.paymentId || null;
    })();

    const paymentReferenceNumber =
        additional.gcashReferenceNo ||
        paymongoPaymentId ||
        (transaction.paymentReference && String(transaction.paymentReference).startsWith("pay_") ? transaction.paymentReference : null) ||
        additional.paymentId ||
        additional.id ||
        additional.payment_id;

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
                        prefetch={false}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-primary transition-all group"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Back to Registry
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
                            categoryLabel="Building Permit"
                            themeColor={themeColor}
                        />

                        {/* RESIDENT IDENTITY PROFILE ACCORDION */}
                        <ResidentIdentityProfile
                            resident={resident}
                            safeFormatDate={props.safeFormatDate}
                            themeColor={themeColor}
                        />



                        {/* FEES SET BY ENGINEER */}
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <Coins className="text-primary w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                            Endorsed Fees Set by Engineering & Zoning
                                        </span>
                                    </div>
                                </div>

                                {/* Add Fee Button (Disabled for Building Permit) */}
                                {false && !showAdditionalFeeForm && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN") && transaction.status === "EVALUATED" && additional.feeAssessment?.endorsed === true && (
                                    <Button
                                        onClick={() => setShowAdditionalFeeForm(true)}
                                        size="sm"
                                        className="h-9 gap-2 bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/20 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Additional Fee
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Building Permit Fee</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        ₱{Number(additional?.feeAssessment?.buildingPermitFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                {false && <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Electrical Permit Fee</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        ₱{Number(additional?.feeAssessment?.electricalPermitFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>}
                                {false && <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Sanitary Permit Fee</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        ₱{Number(additional?.feeAssessment?.sanitaryPermitFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>}
                                {additional?.feeAssessment?.engineerMunicipalCharges && additional.feeAssessment.engineerMunicipalCharges.length > 0 ? (
                                    additional.feeAssessment.engineerMunicipalCharges.map((charge: any, idx: number) => (
                                        <div key={idx} className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">{charge.name || "Other Applicable Municipal Charges"}</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                                ₱{Number(charge.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Other Applicable Municipal Charges</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                            ₱{Number(additional?.feeAssessment?.municipalCharges || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                )}
                                
                                {additional?.feeAssessment?.zoningMunicipalCharges && additional.feeAssessment.zoningMunicipalCharges.length > 0 && (
                                    additional.feeAssessment.zoningMunicipalCharges.map((charge: any, idx: number) => (
                                        <div key={`zoning-${idx}`} className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">{charge.name || "Zoning Clearance"}</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                                ₱{Number(charge.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>



                            {/* ADDITIONAL TREASURY FEES LIST */}
                            {additional?.feeAssessment?.additionalFees && additional.feeAssessment.additionalFees.length > 0 && (
                                <div className="space-y-4 pt-6 border-t border-dashed border-slate-100 dark:border-white/5">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary italic">
                                        Additional Treasury Charges
                                    </span>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {additional.feeAssessment.additionalFees.map((fee: any, idx: number) => (
                                            <div key={idx} className="space-y-2 relative group">
                                                <div className="flex justify-between items-center ml-1">
                                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{fee.label}</label>
                                                    {false && transaction.status === "EVALUATED" && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN") && additional.feeAssessment?.endorsed === true && (
                                                        <button
                                                            onClick={() => handleRemoveAdditionalFee(idx)}
                                                            disabled={actionLoading}
                                                            className="text-xs font-black text-red-500/60 hover:text-red-500 transition-colors uppercase tracking-wider text-[8px]"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="h-12 flex items-center px-5 bg-amber-500/5 border border-amber-500/10 rounded-xl font-black text-sm text-amber-500">
                                                    ₱{Number(fee.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ADD ADDITIONAL FEE INLINE FORM (Disabled for Building Permit) */}
                            {false && showAdditionalFeeForm && additional.feeAssessment?.endorsed === true && (
                                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-primary italic">Create New Additional Charge</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Fee Type / Description</Label>
                                            <Input
                                                type="text"
                                                placeholder="e.g., Penalty, Zoning Fee, Convenience Charge..."
                                                value={additionalFeeLabel}
                                                onChange={(e) => setAdditionalFeeLabel(e.target.value)}
                                                className="h-11 rounded-xl text-slate-800 font-bold dark:text-slate-100"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Amount (₱)</Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={additionalFeeAmount}
                                                onChange={(e) => setAdditionalFeeAmount(e.target.value)}
                                                className="h-11 rounded-xl text-slate-800 font-black dark:text-slate-100"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setShowAdditionalFeeForm(false)}
                                            className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400"
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            onClick={handleAddAdditionalFee}
                                            disabled={actionLoading}
                                            className="h-9 px-4 rounded-xl bg-primary text-white font-black italic uppercase tracking-wider text-[10px] shadow-lg shadow-primary/20"
                                        >
                                            Save Additional Charge
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* TOTAL AMOUNT BLOCK */}
                            <div className="pt-6 border-t border-dashed border-slate-100 dark:border-white/5 flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Endorsed Amount</span>
                                <span className="text-xl font-black italic text-primary">
                                    ₱{Number(totalEndorsedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>



                        {/* Submitted Payment Proofs Section (Moved here from UNPAID block) */}
                        {(transaction.paymentReference || transaction.paymentProofUrl || (additional.previousPaymentProofs && additional.previousPaymentProofs.length > 0)) && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6 animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                            Payment <span className="text-primary">Proofs</span>
                                        </h2>
                                        <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">
                                            Citizen Submitted Receipts
                                        </p>
                                    </div>
                                </div>

                                    {(transaction.paymentReference || transaction.paymentProofUrl) && (
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-primary italic">Current Payment Proof</span>
                                            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
                                                {isValidPaymentSrc && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="relative w-32 h-44 rounded-xl overflow-hidden border-2 border-primary/20 hover:border-primary/50 cursor-pointer transition-all shadow-md">
                                                                <Image src={paymentSrc} alt="Current Proof" fill className="object-cover" />
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                                    <ZoomIn className="w-8 h-8 text-white" />
                                                                </div>
                                                            </div>
                                                        </DialogTrigger>
                                                        <LightboxView src={paymentSrc} alt="Current Proof" label="Current Payment Proof" />
                                                    </Dialog>
                                                )}
                                                <div className="space-y-4 flex-1">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date Submitted</div>
                                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                            {safeFormatDate(transaction.updatedAt)}
                                                        </div>
                                                    </div>
                                                    {paymentReferenceNumber && paymentReferenceNumber.toLowerCase() !== "n/a" && paymentReferenceNumber.toLowerCase() !== "na" && (
                                                        <div className="space-y-1">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference No / Payment ID</div>
                                                            <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                                {paymentReferenceNumber}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                                                        <div className="flex">
                                                            {transaction.status === "UNPAID" ? (
                                                                <span className="text-[11px] font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">Pending Verification</span>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Verified & Paid</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {additional.previousPaymentProofs && additional.previousPaymentProofs.length > 0 && (
                                        <div className="space-y-3 pt-6 border-t border-dashed border-slate-200 dark:border-white/10">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Previous Rejected Proofs</span>
                                            <div className="flex gap-4 overflow-x-auto pb-4">
                                                {additional.previousPaymentProofs.map((proof: any, idx: number) => {
                                                    const isValidProofUrl = typeof proof.url === "string" && proof.url.trim().length > 0;
                                                    return (
                                                        <Dialog key={idx}>
                                                            <DialogTrigger asChild>
                                                                <div className="relative w-28 h-40 shrink-0 rounded-xl overflow-hidden border-2 border-red-500/20 hover:border-red-500/50 cursor-pointer transition-all opacity-70 hover:opacity-100 shadow-sm flex flex-col">
                                                                    <div className="relative flex-1">
                                                                        <Image src={isValidProofUrl ? proof.url : "/placeholder.png"} alt={`Rejected Proof ${idx + 1}`} fill className="object-cover grayscale hover:grayscale-0 transition-all" />
                                                                        <div className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-sm">Rejected</div>
                                                                    </div>
                                                                    {proof.rejectedAt && (
                                                                        <div className="bg-slate-900 text-center py-1.5 px-1 border-t border-red-500/20">
                                                                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none block">Rejected on</span>
                                                                            <span className="text-[9px] font-bold text-slate-200 block">{safeFormatDate(proof.rejectedAt)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </DialogTrigger>
                                                            <LightboxView src={proof.url} alt={`Rejected Proof ${idx + 1}`} label={`Rejected: ${proof.reason || "No reason specified"}`} />
                                                        </Dialog>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                    </div>

                    {/* Right Column: Workflow Steps & Dynamic Evaluation Controls */}
                    <div className="lg:col-span-4 space-y-8">

                        {/* Workflow tracker */}
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
                            <div>
                                <h3 className="text-md font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200">Status Tracker</h3>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic mt-1">Status phase progress</p>
                            </div>
                            <div className="relative border-l border-slate-100 dark:border-white/5 ml-3 space-y-6">
                                {steps.map((step, idx) => {
                                    const isCompleted = idx < currentStepIdx;
                                    const isCurrent = idx === currentStepIdx;
                                    return (
                                        <div key={step.id} className="relative pl-6">
                                            <div className={cn(
                                                "absolute -left-[9px] top-1 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                                                isCompleted ? "bg-primary border-primary text-white" :
                                                    isCurrent ? "bg-white dark:bg-slate-900 border-primary text-primary shadow-lg shadow-primary/20 scale-110" :
                                                        "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-white/10 text-slate-300"
                                            )}>
                                                {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <span className="text-[8px] font-black">{idx + 1}</span>}
                                            </div>
                                            <div>
                                                <p className={cn("text-xs font-black uppercase leading-none", isCurrent ? "text-primary italic" : isCompleted ? "text-slate-500 dark:text-slate-400" : "text-slate-300 dark:text-slate-600")}>
                                                    {step.label}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Interactive Decision / Actions box */}
                        {(!isReadOnlyAide && (transaction.status !== "FOR_PROCESSING" || additional?.servingDepartment === "Treasury" || additional?.counterName)) && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-6">
                                <div>
                                    <h3 className="text-md font-black italic uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                        {transaction.status === "PAID" ? "Payment History" : "Evaluation Hub"}
                                    </h3>
                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic mt-1">
                                        {transaction.status === "PAID" ? "Transaction Verification Record" : "Actions & Endorsements"}
                                    </p>
                                </div>

                                {transaction.status === "EVALUATED" && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN") && (
                                    additional.feeAssessment?.endorsed === true && additional.feeAssessment?.zoningEndorsed === true ? (
                                        <div className="space-y-4">
                                            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                                                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                                    Review the building permit details and the endorsed fees set by the Engineer and Zoning Officer. Once verified, you can approve and send the final billing statement to the resident.
                                                </p>
                                            </div>
                                            <Button
                                                onClick={handleApproveBilling}
                                                disabled={actionLoading}
                                                className="w-full h-12 whitespace-normal px-4 py-2 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black italic uppercase tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 text-center text-xs leading-tight"
                                            >
                                                {actionLoading ? <RotateCw className="w-4 h-4 animate-spin shrink-0" /> : "Approve & Send Billing Statement"}
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 animate-in fade-in duration-300">
                                            <div className="bg-amber-500/10 p-6 rounded-2xl border border-amber-500/20 text-center space-y-3">
                                                <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-500">
                                                    <AlertCircle className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-wider">
                                                        {!additional.feeAssessment?.endorsed ? "Engineering Evaluation Pending" : "Zoning Endorsement Pending"}
                                                    </p>
                                                    <p className="text-[11px] font-bold text-slate-550 dark:text-slate-400 leading-relaxed uppercase tracking-tight">
                                                        {!additional.feeAssessment?.endorsed 
                                                            ? "This building permit record has not yet been endorsed by the Engineering department. Treasury actions are currently restricted to view-only."
                                                            : "This building permit record has been endorsed by Engineering, but is still awaiting the Zoning Clearance fees endorsement from the Zoning department."}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                )}

                                {(transaction.status === "UNPAID" || (transaction.status === "FOR_PROCESSING" && (additional?.servingDepartment === "Treasury" || additional?.counterName))) && (
                                    <div className="space-y-4">
                                        {requiresQueueCall ? (
                                            /* Citizen holds a queue ticket but has not yet been called to counter - matching other services */
                                            <div className="space-y-3 animate-in fade-in duration-300">
                                                <Button
                                                    onClick={handleCallInQueue}
                                                    disabled={actionLoading || callingQueue}
                                                    className="w-full h-14 whitespace-normal px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all shadow-amber-500/10 text-center leading-tight"
                                                >
                                                    {callingQueue ? (
                                                        <>
                                                            <RotateCw className="w-4 h-4 animate-spin mr-2 shrink-0" />
                                                            <span>Calling Resident...</span>
                                                        </>
                                                    ) : (
                                                        <span>Call Resident in Queue</span>
                                                    )}
                                                </Button>

                                                <Button
                                                    variant="outline"
                                                    onClick={() => setIsRejecting(true)}
                                                    disabled={actionLoading}
                                                    className="w-full h-11 border-dashed rounded-xl font-bold text-[10px] uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    Decline
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Payment Processing for Called / At-Counter Citizen */}
                                                {(rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN") && (
                                                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                                        <Dialog>
                                                            <DialogTrigger asChild>
                                                                <Button
                                                                    className="w-full h-12 whitespace-normal px-4 py-2 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black italic uppercase tracking-wider shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 text-center text-xs leading-tight"
                                                                >
                                                                    Approve payment (Move to Paid)
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-md bg-white dark:bg-[#0c111d] border-slate-100 dark:border-white/5 rounded-[2.5rem] p-10">
                                                                <DialogHeader className="space-y-3">
                                                                    <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                                        Treasury <span className="text-emerald-500">Receipt</span>
                                                                    </DialogTitle>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Process Payment / Upload Receipt</p>
                                                                </DialogHeader>
                                                                <div className="space-y-6 py-4">
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">O.R. Number / Reference No. (Required for Cash)</Label>
                                                                        <Input 
                                                                            placeholder="Enter O.R. or Reference Number" 
                                                                            value={orSeriesNumber || ""} 
                                                                            onChange={(e) => setOrSeriesNumber?.(e.target.value)}
                                                                            className="h-12 rounded-xl text-sm border-slate-200 dark:border-white/10"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Amount Paid (₱)</Label>
                                                                        <Input 
                                                                            type="number"
                                                                            placeholder="Enter Amount" 
                                                                            value={amountPaid} 
                                                                            onChange={(e) => setAmountPaid(e.target.value)}
                                                                            className="h-12 rounded-xl text-sm border-slate-200 dark:border-white/10"
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Scanned Receipt (Optional)</Label>
                                                                        {receiptPreview ? (
                                                                            <div className="relative rounded-2xl border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 p-2 overflow-hidden group">
                                                                                <div className="aspect-[4/3] w-full relative rounded-xl overflow-hidden bg-white/50">
                                                                                    <Image src={receiptPreview} alt="Receipt Preview" fill className="object-contain" />
                                                                                </div>
                                                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={() => {
                                                                                            setReceiptFile(null);
                                                                                            setReceiptPreview(null);
                                                                                        }}
                                                                                        className="w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 hover:scale-110 transition-all"
                                                                                    >
                                                                                        <Trash2 className="w-5 h-5" />
                                                                                    </Button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <label className="flex flex-col items-center justify-center h-48 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 hover:border-emerald-500/50 transition-all cursor-pointer group">
                                                                                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform mb-4">
                                                                                    <Upload className="w-6 h-6" />
                                                                                </div>
                                                                                <span className="text-[11px] font-black italic uppercase tracking-widest text-slate-500 dark:text-slate-400">Click to upload receipt</span>
                                                                                <span className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">JPG, PNG, PDF</span>
                                                                                <input type="file" accept="image/*,.pdf" onChange={handleReceiptFileSelect} className="hidden" />
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Additional Notes</Label>
                                                                        <Textarea
                                                                            placeholder="Optional notes for this payment..."
                                                                            value={remarks}
                                                                            onChange={(e) => setRemarks(e.target.value)}
                                                                            className="min-h-[100px] rounded-xl text-sm border-slate-200 dark:border-white/10"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    onClick={() => handleConfirmPayment(amountPaid)}
                                                                    disabled={actionLoading || (!orSeriesNumber && !receiptFile)}
                                                                    className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                                                                >
                                                                    {actionLoading ? "Processing..." : "Confirm & Save Receipt"}
                                                                </Button>
                                                            </DialogContent>
                                                        </Dialog>

                                                        <Button
                                                            variant="outline"
                                                            onClick={() => setIsRejecting(true)}
                                                            disabled={actionLoading}
                                                            className="w-full h-10 rounded-xl font-black text-[10px] uppercase tracking-wider border-red-200/60 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                                        >
                                                            <Ban className="w-3.5 h-3.5 text-red-500" />
                                                            <span>Decline</span>
                                                        </Button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {transaction.status === "PAID" && (
                                     <div className="space-y-6">
                                         <div className="bg-emerald-50 dark:bg-emerald-500/5 p-8 rounded-[2.5rem] border-2 border-emerald-100 dark:border-emerald-500/20 text-center space-y-4">
                                             <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                                 <span className="text-2xl animate-pulse">🎉</span>
                                             </div>
                                             <div className="space-y-1">
                                                 <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 italic">Payment Successful</p>
                                                 <p className="text-[11px] font-bold text-emerald-900/60 dark:text-emerald-400/60 leading-relaxed uppercase tracking-tight">
                                                     Transaction has been paid and verified.
                                                 </p>
                                             </div>
                                         </div>

                                         {(rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN") && (
                                             <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/5">
                                                 {(additional.orSeriesNumber || (transaction as any).payment?.orNumber) && (
                                                     <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                         <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Official Receipt (O.R.) No.</span>
                                                         <span className="font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                                                             #{additional.orSeriesNumber || (transaction as any).payment?.orNumber}
                                                         </span>
                                                     </div>
                                                 )}

                                                 {additional.treasuryReceiptUrl && (
                                                     <div className="space-y-3 p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                                                         <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Uploaded Official Receipt</span>
                                                         <Dialog>
                                                             <DialogTrigger asChild>
                                                                 <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 cursor-pointer group bg-slate-100 dark:bg-white/5">
                                                                     <Image src={additional.treasuryReceiptUrl} alt="Official Receipt" fill className="object-contain" />
                                                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                         <ZoomIn className="w-6 h-6 text-white" />
                                                                     </div>
                                                                 </div>
                                                             </DialogTrigger>
                                                             <LightboxView src={additional.treasuryReceiptUrl} alt="Official Receipt" label="Official Treasury Receipt" />
                                                         </Dialog>
                                                     </div>
                                                 )}

                                                 {(additional.treasuryRemarks || (transaction as any).paymentRemarks) && (
                                                     <div className="p-4 bg-[#f8fafd] dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 text-xs font-bold text-slate-600 dark:text-slate-400 italic">
                                                         <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 not-italic block mb-1">Notes:</span>
                                                         &ldquo;{additional.treasuryRemarks || (transaction as any).paymentRemarks}&rdquo;
                                                     </div>
                                                 )}
                                             </div>
                                         )}
                                     </div>
                                )}

                                {["FOR_CLAIM", "FOR_PICKING"].includes(transaction.status) && (rawUserRole === "TREASURY_STAFF" || rawUserRole === "ADMIN" || rawUserRole === "COURIER") && (
                                    <div className="space-y-6">
                                        <PrintWaybill
                                            transaction={transaction}
                                            resident={resident}
                                            deliveryAddr={null}
                                            fiscal={additional.feeAssessment}
                                            branding={branding}
                                            themeColor={themeColor}
                                        />

                                        {transaction.fulfillmentMode === "DELIVERY" && !transaction.waybillPrintedAt && (
                                            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-600 dark:text-amber-500 flex items-start gap-3">
                                                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                                                <p className="text-[10px] font-bold leading-relaxed">
                                                    Print the official shipping waybill before releasing to update the logistics carrier dispatch system.
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                            {transaction.fulfillmentMode === "DELIVERY" ? (
                                                <Button
                                                    onClick={handleRelease}
                                                    disabled={actionLoading}
                                                    className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/95 text-white font-black italic uppercase tracking-wider shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : "Dispatch to Courier"}
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={handleRelease}
                                                    disabled={actionLoading}
                                                    className="w-full h-12 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-black italic uppercase tracking-wider shadow-lg shadow-green-500/20 transition-all"
                                                >
                                                    {actionLoading ? <RotateCw className="w-4 h-4 animate-spin" /> : "Release Document to Resident"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* REJECT / REVISION INLINE FORMS */}
                                {(isRejecting || isRequestingRevision) && (
                                    <div className="p-6 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-red-500 italic">
                                            {isRejecting ? "Reject Application Remarks" : "Revision Request Description"}
                                        </span>
                                        <Textarea
                                            placeholder={isRejecting ? "Provide exact remarks detailing why this building permit application is being rejected..." : "Provide exact instructions detailing what files or fields the resident needs to correct/update..."}
                                            value={remarks}
                                            onChange={(e) => setRemarks(e.target.value)}
                                            className="min-h-[100px] rounded-xl text-slate-800 dark:text-slate-100"
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setIsRejecting(false);
                                                    setIsRequestingRevision(false);
                                                    setRemarks("");
                                                }}
                                                className="h-9 px-4 rounded-xl font-bold text-[10px] uppercase tracking-wider text-slate-400"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                onClick={isRejecting ? handleReject : (transaction.status === "UNPAID" ? handleDeclinePaymentProof : handleRequestRevision)}
                                                disabled={actionLoading || !remarks.trim()}
                                                className={cn(
                                                    "h-9 px-4 rounded-xl font-black italic uppercase tracking-wider text-[10px] text-white shadow-lg",
                                                    isRejecting ? "bg-red-500 shadow-red-500/20 hover:bg-red-600" : "bg-amber-500 shadow-amber-500/20 hover:bg-amber-600"
                                                )}
                                            >
                                                Submit Decision
                                            </Button>
                                        </div>
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
