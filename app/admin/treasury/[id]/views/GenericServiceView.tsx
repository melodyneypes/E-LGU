

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
    AlertCircle,
    Printer,
    Pencil,
    Layers,
    Sparkles,
    CheckSquare,
    Square,
    RotateCw,
    Calendar,
    Lock,
    Unlock,
    Eye,
    EyeOff,
    ShieldCheck,
    Loader2,
    FileWarning
} from "lucide-react";
import {
    getSameDayPendingAppointments,
    confirmMergedTreasuryPaymentAction,
    SiblingAppointment
} from "@/app/admin/treasury/merged-payment-actions";

const getAlphaColor = (color: string, opacityPercent: number) => {
    if (!color) return undefined;
    const trimmed = color.trim();
    if (trimmed.startsWith("var") || trimmed.startsWith("rgb") || trimmed.startsWith("hsl")) {
        return `color-mix(in srgb, ${trimmed} ${opacityPercent}%, transparent)`;
    }
    if (trimmed.startsWith("#")) {
        const cleanHex = trimmed.length === 4
            ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
            : trimmed.slice(0, 7);
        const alphaInt = Math.round((opacityPercent / 100) * 255);
        const alphaHex = Math.max(0, Math.min(255, alphaInt)).toString(16).padStart(2, "0");
        return `${cleanHex}${alphaHex}`;
    }
    return `color-mix(in srgb, ${trimmed} ${opacityPercent}%, transparent)`;
};
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import LightboxView from "../components/LightboxView";
import ResidentIdentityProfile from "../components/ResidentIdentityProfile";
import TransactionInfoCard from "../components/TransactionInfoCard";
import RejectionRevisionControls from "../components/RejectionRevisionControls";
import TreasuryPaymentCollectionPanel from "../components/TreasuryPaymentCollectionPanel";
import { TreasuryViewProps } from "./types";
import { cn } from "@/lib/utils";
import { verifyTreasuryPasswordAndLogGrossAdjustmentAction } from "@/app/admin/transactions/cedula-actions";

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
        setOrPreview,
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
        handleResolveDispute,
        handleOnsitePayment,
        handlePrintCedula,
        openCedulaPreview,
        editedIncome,
        setEditedIncome,
        draftProfileValues,
        setDraftProfileValues
    } = props;

    const effectiveThemeColor = themeColor || "#f43f5e";

    const [paymentMethod, setPaymentMethod] = React.useState<'CASH' | 'GCASH' | 'LANDBANK'>('CASH');
    const [paymentReference, setPaymentReference] = React.useState('');
    const [isConfirmPaidModalOpen, setIsConfirmPaidModalOpen] = React.useState(false);

    // Sibling Same-Day Appointments for Merged Payment
    const [siblingAppointments, setSiblingAppointments] = React.useState<SiblingAppointment[]>([]);
    const [selectedSiblingIds, setSelectedSiblingIds] = React.useState<string[]>([]);
    const [isLoadingSiblings, setIsLoadingSiblings] = React.useState(false);
    const [isSubmittingMerge, setIsSubmittingMerge] = React.useState(false);

    // Refresh sibling same-day appointments
    const handleRefreshSiblings = React.useCallback(async () => {
        if (!transaction?.id || transaction.status === "PAID") return;
        setIsLoadingSiblings(true);
        try {
            const res = await getSameDayPendingAppointments(transaction.id);
            if (res.success && res.siblings.length > 0) {
                setSiblingAppointments(res.siblings);
                setSelectedSiblingIds((prev) =>
                    prev.filter((id) => res.siblings.some((s) => s.id === id && s.isPayable))
                );
                toast.success(`Found ${res.siblings.length} same-day appointment(s)!`);
            } else {
                setSiblingAppointments([]);
                setSelectedSiblingIds([]);
                toast.info("No other same-day appointments found for this citizen.");
            }
        } catch (err) {
            console.error("Error refreshing sibling appointments in GenericServiceView:", err);
            toast.error("Failed to check for other same-day appointments.");
        } finally {
            setIsLoadingSiblings(false);
        }
    }, [transaction?.id, transaction?.status]);

    // Fetch sibling appointments on mount or when transaction changes
    React.useEffect(() => {
        if (!transaction?.id || transaction.status === "PAID") return;
        let isMounted = true;
        setIsLoadingSiblings(true);
        getSameDayPendingAppointments(transaction.id)
            .then((res) => {
                if (!isMounted) return;
                if (res.success && res.siblings.length > 0) {
                    setSiblingAppointments(res.siblings);
                } else {
                    setSiblingAppointments([]);
                    setSelectedSiblingIds([]);
                }
            })
            .catch((err) => {
                console.error("Error fetching sibling appointments in GenericServiceView:", err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingSiblings(false);
            });

        return () => {
            isMounted = false;
        };
    }, [transaction?.id, transaction?.status]);

    const handleToggleSibling = (sibling: SiblingAppointment) => {
        if (!sibling.isPayable) {
            toast.info(`Cannot issue O.R. for ${sibling.serviceName}: ${sibling.unpayableReason || "Not yet ready for payment."}`);
            return;
        }
        setSelectedSiblingIds((prev) =>
            prev.includes(sibling.id)
                ? prev.filter((id) => id !== sibling.id)
                : [...prev, sibling.id]
        );
    };

    const handleSelectAllSiblings = () => {
        const payableSiblings = siblingAppointments.filter((s) => s.isPayable);
        if (payableSiblings.length === 0) {
            toast.info("None of the detected appointments are ready for payment collection yet.");
            return;
        }
        if (selectedSiblingIds.length === payableSiblings.length) {
            setSelectedSiblingIds([]);
        } else {
            setSelectedSiblingIds(payableSiblings.map((s) => s.id));
        }
    };

    // Declared Gross Security Authorization States
    const [isAuthorized, setIsAuthorized] = React.useState(false);
    const [unlockModalOpen, setUnlockModalOpen] = React.useState(false);
    const [unlockPassword, setUnlockPassword] = React.useState('');
    const [showUnlockPassword, setShowUnlockPassword] = React.useState(false);
    const [unlockReason, setUnlockReason] = React.useState('');
    const [unlockLoading, setUnlockLoading] = React.useState(false);
    const [authorizedStaffName, setAuthorizedStaffName] = React.useState<string | null>(null);

    const isCedula = 
        transaction?.type?.category?.toUpperCase() === "CEDULA" || 
        transaction?.type?.code?.toUpperCase().includes("CEDULA");

    // Accountable Form Incident (Paper Jam / Cancelled Stubs) States
    const [incidentModalOpen, setIncidentModalOpen] = React.useState(false);
    const [incidentFormType, setIncidentFormType] = React.useState<string>("");
    const [incidentType, setIncidentType] = React.useState<"PAPER_JAM" | "PRINTER_MISFEED" | "INK_SMUDGE" | "DAMAGED_LEAF" | "ENCODING_ERROR">("PAPER_JAM");
    const [damagedSerialInput, setDamagedSerialInput] = React.useState("");
    const [replacementSerialInput, setReplacementSerialInput] = React.useState("");
    const [incidentReasonDetails, setIncidentReasonDetails] = React.useState("");
    const [incidentSubmitting, setIncidentSubmitting] = React.useState(false);

    const isGrossLocked = !isAuthorized;

    const handleVerifyAndUnlockGross = async () => {
        if (!unlockPassword.trim()) {
            toast.error("Please enter your account password to authorize changes.");
            return;
        }

        setUnlockLoading(true);
        try {
            const { verifyStaffPasswordToUnlockAction } = await import("../profile-actions");
            const res = await verifyStaffPasswordToUnlockAction({
                transactionId: transaction.id,
                password: unlockPassword.trim(),
                reason: unlockReason.trim() || undefined
            });

            if (res.success && res.data) {
                setIsAuthorized(true);
                setAuthorizedStaffName(res.data.authorizedBy);
                setUnlockModalOpen(false);
                setUnlockPassword('');
                toast.success(`Access granted. Authorized by ${res.data.authorizedBy}. Profile and declared gross unlocked for editing.`);
            } else {
                toast.error(res.error || "Authorization failed. Incorrect password.");
            }
        } catch {
            toast.error("An error occurred while verifying credentials.");
        } finally {
            setUnlockLoading(false);
        }
    };

    const isJuridical = transaction.type?.code?.includes("JURIDICAL") || transaction.additionalData?.applicantType === "JURIDICAL";
    const canApprove = (transaction.status === "FOR_REQUESTING") && (userRole === "TREASURY_STAFF" || userRole === "ADMIN") && !isReadOnlyAide;
    const hasDispute = transaction.status === "RETURN_REQUESTED" || transaction.status === "REFUND_REQUESTED" || !!transaction.disputeReason;
    const [isProfileOpen, setIsProfileOpen] = React.useState(true);
    const [isRequirementsOpen, setIsRequirementsOpen] = React.useState(true);
    const additional = React.useMemo(() => transaction.additionalData || {}, [transaction.additionalData]);
    const relStr = String(additional?.relationshipToApplicant || "").trim().toUpperCase();
    const isRelative = (additional?.applicantTarget === "RELATIVE" || Boolean(additional?.relationshipToApplicant)) &&
        additional?.applicantTarget !== "SELF" &&
        relStr !== "SELF" &&
        relStr !== "";
    const rawSnapshot = transaction.residentSnapshot;
    const parsedSnapshot = React.useMemo(() => {
        return typeof rawSnapshot === "string"
            ? (() => { try { return JSON.parse(rawSnapshot); } catch { return {}; } })()
            : (rawSnapshot || {});
    }, [rawSnapshot]);

    // For Relative applications, resident represents the relative (the actual Cedula Holder)
    const baseResident = React.useMemo(() => {
        return isRelative
            ? (parsedSnapshot.firstName || parsedSnapshot.lastName ? parsedSnapshot : (transaction.user?.residentProfile || parsedSnapshot))
            : (transaction.user?.residentProfile || parsedSnapshot);
    }, [isRelative, parsedSnapshot, transaction.user?.residentProfile]);

    const resident = React.useMemo(() => ({
        ...baseResident,
        gender: baseResident?.gender || parsedSnapshot?.gender || additional?.gender || "—",
        placeOfBirth: baseResident?.placeOfBirth || parsedSnapshot?.placeOfBirth || additional?.placeOfBirth || "—",
        citizenship: baseResident?.citizenship || parsedSnapshot?.citizenship || additional?.citizenship || "Filipino",
        height: baseResident?.height || parsedSnapshot?.height || additional?.height || "—",
        weight: baseResident?.weight || parsedSnapshot?.weight || additional?.weight || "—",
        civilStatus: baseResident?.civilStatus || parsedSnapshot?.civilStatus || additional?.civilStatus || "Single",
        occupation: baseResident?.occupation || parsedSnapshot?.occupation || additional?.incomeSource || additional?.occupation || "—",
    }), [baseResident, parsedSnapshot, additional]);

    const requesterProfile = transaction.user?.residentProfile || transaction.user || {};
    const requesterFullName = requesterProfile?.firstName || requesterProfile?.lastName
        ? `${requesterProfile.firstName || ""} ${requesterProfile.lastName || ""}`.trim()
        : requesterProfile?.name || "Online Applicant";

    const deliveryAddr = transaction.deliveryAddress
        ? (typeof transaction.deliveryAddress === 'string' ? JSON.parse(transaction.deliveryAddress) : transaction.deliveryAddress)
        : null;
    const fiscal = (transaction.fiscalSnapshot as any) || null;

    const hasCheckIn = Boolean(
        additional?.checkedIn === true ||
        additional?.checkInData ||
        additional?.checkIn ||
        additional?.checkInTime ||
        additional?.checkedInAt ||
        additional?.counterName ||
        additional?.scannedAt ||
        additional?.checkInStatus ||
        transaction?.checkIn ||
        transaction?.checkedInAt ||
        transaction?.checkInDetails
    );

    const hasAssignedCounter = Boolean(
        additional?.counterName ||
        (typeof window !== "undefined" && localStorage.getItem("activeCounterName"))
    );

    // Calculate sum of fee line items currently entered in the UI
    const itemsSum = feeLineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
    const isEvaluating = transaction.status === "FOR_REQUESTING";

    const adjustedTotalAmount = isEvaluating
        ? calcResult.totalAmount + itemsSum
        : calcResult.totalAmount;

    const adjustedDisplayTotal = isEvaluating
        ? displayTotal + itemsSum
        : displayTotal;

    const primaryFee = Number(
        displayTotal ||
        calcResult?.totalAmount ||
        transaction.totalAmount ||
        additional?.calculatedTax?.totalAmount ||
        0
    );
    const selectedMergedAmount = siblingAppointments
        .filter((s) => selectedSiblingIds.includes(s.id))
        .reduce((sum, s) => sum + s.amount, 0);
    const consolidatedGrandTotal = primaryFee + selectedMergedAmount;
    const isMerging = selectedSiblingIds.length > 0;

    const handleProceedMergedPayment = async () => {
        if (!orSeriesNumber || !orSeriesNumber.trim()) {
            toast.error("Please enter the O.R. Series Number before proceeding.");
            return;
        }
        if (isCedula && !ctcNumber?.trim()) {
            toast.error("Please enter the CTC Booklet Number for this Cedula.");
            return;
        }
        if (paymentMethod !== "CASH" && !paymentReference.trim()) {
            toast.error(`Please enter the ${paymentMethod} Reference Number.`);
            return;
        }

        setIsSubmittingMerge(true);
        const toastId = "merging-payment";
        toast.loading(`Consolidating ${selectedSiblingIds.length + 1} appointments under O.R. #${orSeriesNumber}...`, { id: toastId });

        try {
            const formData = new FormData();
            formData.append("primaryId", transaction.id);
            formData.append("selectedIds", JSON.stringify(selectedSiblingIds));
            formData.append("orSeriesNumber", orSeriesNumber.trim());
            formData.append("paymentMethod", paymentMethod);
            if (paymentReference.trim()) formData.append("paymentReference", paymentReference.trim());
            if (remarks?.trim()) formData.append("remarks", remarks.trim());
            if (ctcNumber?.trim()) formData.append("ctcNumber", ctcNumber.trim());
            if (orFile) formData.append("orFile", orFile);

            const res = await confirmMergedTreasuryPaymentAction(formData);
            if (res.success) {
                toast.success(
                    `Consolidated payment recorded! ${res.mergedCount} appointments linked to O.R. #${res.orNumber} (Total: ₱${res.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
                    { id: toastId }
                );
                window.location.reload();
            } else {
                toast.error(res.error || "Failed to merge appointments payment.", { id: toastId });
            }
        } catch (err: any) {
            toast.error(err.message || "An unexpected error occurred during merged payment.", { id: toastId });
        } finally {
            setIsSubmittingMerge(false);
        }
    };


    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            {/* Minimal Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <Link
                    href={backUrl}
                    prefetch={false}
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
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                        {isRelative ? "Relative Profile (Cedula Holder)" : "Primary Applicant Profile"}
                                    </span>
                                    {isRelative && (
                                        <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-0.5 rounded-full">
                                            {additional?.relationshipToApplicant ? `Relative: ${additional.relationshipToApplicant}` : "Relative Application"}
                                        </Badge>
                                    )}
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
                                {isRelative && requesterFullName && (
                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider pt-1">
                                        Application Filed By: <span className="text-slate-700 dark:text-slate-300 font-bold">{requesterFullName}</span>
                                    </p>
                                )}
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
                                        onClick={() => {
                                            if (isCedula && setEditedIncome && (transaction.status === "FOR_PROCESSING" || transaction.status === "FOR_REQUESTING") && !transaction.isStudent && isGrossLocked) {
                                                setUnlockModalOpen(true);
                                            }
                                        }}
                                        className={`p-4 rounded-2xl space-y-1 transition-all ${isCedula && setEditedIncome && (transaction.status === "FOR_PROCESSING" || transaction.status === "FOR_REQUESTING") && !transaction.isStudent
                                                ? !isGrossLocked
                                                    ? "bg-emerald-500/5 border border-emerald-500/30"
                                                    : "bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10 cursor-pointer group"
                                                : "bg-[#f8fafd] dark:bg-white/5"
                                            }`}
                                        title={
                                            transaction.isStudent
                                                ? String(declaredValue)
                                                : isGrossLocked && isCedula && setEditedIncome && (transaction.status === "FOR_PROCESSING" || transaction.status === "FOR_REQUESTING")
                                                    ? "Click to unlock and adjust declared gross income"
                                                    : `₱${Number(declaredValue).toLocaleString()}`
                                        }
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 truncate">
                                                {declaredLabel}
                                            </span>
                                            {isCedula && setEditedIncome && (transaction.status === "FOR_PROCESSING" || transaction.status === "FOR_REQUESTING") && !transaction.isStudent && !isGrossLocked && (
                                                <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                                    Authorized
                                                </span>
                                            )}
                                        </div>
                                        {isCedula && setEditedIncome && (transaction.status === "FOR_PROCESSING" || transaction.status === "FOR_REQUESTING") && !transaction.isStudent ? (
                                            !isGrossLocked ? (
                                                <div className="space-y-1">
                                                    <div className="relative flex items-center mt-1">
                                                        <span className="absolute left-2.5 text-xs font-black text-emerald-600 dark:text-emerald-400 select-none">₱</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="any"
                                                            autoFocus
                                                            value={editedIncome !== null && editedIncome !== undefined ? editedIncome : (Number(declaredValue) || 0)}
                                                            onChange={(e) => {
                                                                const val = parseFloat(e.target.value);
                                                                setEditedIncome(isNaN(val) ? 0 : Math.max(0, val));
                                                            }}
                                                            className="w-full pl-6 pr-2 py-1 bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-lg text-sm font-black italic tracking-tighter text-emerald-700 dark:text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    {authorizedStaffName && (
                                                        <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold truncate">
                                                            By: {authorizedStaffName}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="pt-1">
                                                    <p className="text-xl font-black italic tracking-tighter text-slate-800 dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                                                        ₱{Number(declaredValue).toLocaleString()}
                                                    </p>
                                                </div>
                                            )
                                        ) : (
                                            <p className="text-base font-black italic tracking-tighter dark:text-slate-200 truncate">
                                                {transaction.isStudent ? String(declaredValue) : `₱${Number(declaredValue).toLocaleString()}`}
                                            </p>
                                        )}
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
                                        title={`₱${adjustedTotalAmount.toLocaleString()}`}
                                    >
                                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Total Amount</span>
                                        <p className="text-xl font-black italic tracking-tighter text-primary truncate">
                                            ₱{adjustedTotalAmount.toLocaleString()}
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
                                                    {additional.incomeSource === "UNEMPLOYED" ? "UE" : additional.incomeSource === "PROFESSION" ? "PR" : additional.incomeSource === "BUSINESS" ? "BU" : "RP"}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black italic uppercase tracking-tight text-slate-800 dark:text-white leading-tight">
                                                        {additional.incomeSource === "UNEMPLOYED" ? "Unemployed" : additional.incomeSource === "PROFESSION" ? "Profession" : additional.incomeSource === "BUSINESS" ? "Business" : "Real Property"}
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

                                        {/* ADDITIONAL FEES EDITOR — Hiding but keeping code for future project reference */}
                                        {/*
                                        {(transaction.status === "FOR_REQUESTING" && (userRole === "TREASURY_STAFF" || userRole === "ADMIN")) && (
                                            <div className="pt-2 space-y-2">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                                    Additional Fees
                                                </p>
                                                <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                                                    {feeLineItems.map((item, idx) => {
                                                        const labelEmpty = item.label.trim() === "";
                                                        const amountEmpty = item.amount.trim() === "" || item.amount === "0";
                                                        const labelInvalid = labelEmpty && !amountEmpty;   // label missing but amount filled
                                                        const amountInvalid = !labelEmpty && amountEmpty;  // amount missing but label filled
                                                        return (
                                                        <div key={idx} className={cn(
                                                            "flex gap-3 items-center group bg-white dark:bg-slate-900 border px-3 py-1.5 rounded-xl shadow-sm focus-within:ring-2 transition-all",
                                                            (labelInvalid || amountInvalid)
                                                                ? "border-red-500 focus-within:ring-red-500/20"
                                                                : "border-slate-100 dark:border-white/5 focus-within:ring-primary/20"
                                                        )}>
                                                            <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 w-6 h-6 flex items-center justify-center rounded-lg select-none shrink-0">
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                placeholder={transaction.isStudent ? "Add a Additional fee here" : "Fee Description"}
                                                                value={item.label}
                                                                onChange={(e) => updateFeeLineItem(idx, 'label', e.target.value)}
                                                                className={cn(
                                                                    "flex-1 h-9 bg-transparent text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none border-none p-0 focus:ring-0",
                                                                    labelInvalid && "placeholder-red-400"
                                                                )}
                                                            />
                                                            <div className={cn(
                                                                "relative w-28 shrink-0 flex items-center border-l pl-3",
                                                                amountInvalid ? "border-red-500" : "border-slate-100 dark:border-white/5"
                                                            )}>
                                                                <span className={cn(
                                                                    "text-xs font-black mr-1 select-none",
                                                                    amountInvalid ? "text-red-400" : "text-slate-400"
                                                                )}>₱</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0.00"
                                                                    value={item.amount}
                                                                    onChange={(e) => updateFeeLineItem(idx, 'amount', e.target.value)}
                                                                    className={cn(
                                                                        "w-full bg-transparent text-sm font-black text-right text-slate-800 dark:text-white focus:outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                                                                        amountInvalid ? "placeholder-red-400" : "placeholder-slate-400"
                                                                    )}
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
                                        */}

                                        {/* DELIVERY FEE — always visible if applicable */}
                                        {transaction.fulfillmentType === "DELIVERY" && (
                                            <div className="flex justify-between items-center pt-2 gap-4">
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 italic">Delivery Fee</span>
                                                <span className="text-xs font-black dark:text-white italic">
                                                    ₱{Number(deliveryFee || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        )}

                                        {/* Total Amount */}
                                        <div className="border-t border-dotted border-slate-300 dark:border-white/10 pt-4 mt-4 flex justify-between items-center">
                                            <span className="text-base font-black uppercase italic tracking-widest text-slate-900 dark:text-white leading-none">Total Amount</span>
                                            <span className="text-3xl font-black italic tracking-tighter text-primary leading-none">
                                                ₱{Number(adjustedDisplayTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RESIDENT / RELATIVE IDENTITY PROFILE ACCORDION */}
                    <ResidentIdentityProfile
                        resident={resident}
                        safeFormatDate={safeFormatDate}
                        themeColor={themeColor}
                        titleColorText={isRelative ? "Relative" : "Resident"}
                        titleWhiteText="Identity Profile"
                        subtitleText={isRelative ? "Relative / Cedula Holder Dossier" : "Verified Citizen Data Dossier"}
                        relationship={isRelative ? (additional?.relationshipToApplicant || "Relative") : undefined}
                        relationshipLabel="Relationship to Representative / Applicant"
                        transactionId={transaction.id}
                        canEdit={!isReadOnlyAide}
                        onProfileUpdated={props.fetchTransaction}
                        isAuthorized={isAuthorized}
                        setIsAuthorized={setIsAuthorized}
                        authorizedStaffName={authorizedStaffName}
                        setAuthorizedStaffName={setAuthorizedStaffName}
                        declaredGross={editedIncome !== null && editedIncome !== undefined ? editedIncome : (Number(declaredValue) || undefined)}
                        onOpenUnlockModal={() => {
                            setUnlockPassword('');
                            setUnlockReason('');
                            setUnlockModalOpen(true);
                        }}
                        onFormValuesChange={(values) => {
                            setDraftProfileValues?.(values);
                        }}
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
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {(() => {
                                    const hasValidDoc = evidenceDocs.some(d => Boolean(d.url));
                                    if (!hasValidDoc) {
                                        return (
                                            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 text-amber-700 dark:text-amber-400">
                                                <AlertCircle className="w-5 h-5 shrink-0" />
                                                <div className="space-y-0.5 text-left">
                                                    <p className="text-[10px] font-black uppercase tracking-wider italic">No Requirements Provided</p>
                                                    <p className="text-xs font-bold leading-relaxed italic text-slate-600 dark:text-slate-300">
                                                        The resident did not attach any Valid ID or Income Verification documents for this request.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}

                                <div className="grid grid-cols-2 gap-4">
                                    {evidenceDocs.map((doc, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => doc.url && handleViewFile?.(doc.url, doc.label, evidenceDocs, idx)}
                                            className={cn(
                                                "relative aspect-[4/3] rounded-2xl border transition-all select-none overflow-hidden group",
                                                doc.url
                                                    ? "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 cursor-pointer hover:border-primary/50"
                                                    : "bg-amber-500/[0.03] dark:bg-amber-500/5 border-amber-500/20 cursor-default"
                                            )}
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
                                                <div className="w-full h-full flex flex-col items-center justify-center text-amber-600/80 dark:text-amber-400/80 gap-2 p-4 text-center">
                                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                                        <AlertCircle className="w-5 h-5 text-amber-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black uppercase tracking-wider block text-slate-700 dark:text-slate-200">{doc.label}</span>
                                                        <span className="text-[8px] font-bold uppercase tracking-widest leading-tight block text-amber-600 dark:text-amber-400 italic">
                                                            Not Provided by Resident
                                                        </span>
                                                    </div>
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
                    {((transaction.status === "FOR_REQUESTING" || transaction.status === "EVALUATED" || transaction.status === "UNPAID" || (transaction.status === "FOR_PROCESSING" && !transaction.orSeriesNumber && !transaction.paymentType)) && (userRole === "TREASURY_STAFF" || userRole === "ADMIN") && !isReadOnlyAide) && (
                        <div className="space-y-3">
                            {/* If status is FOR_REQUESTING and NOT checked-in: Show Queue notice and optional Request Revision */}
                            {transaction.status === "FOR_REQUESTING" && !hasCheckIn && (
                                <div className="space-y-4">
                                    {/* Notice Banner */}
                                    <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 space-y-2">
                                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                                            <AlertCircle className="w-5 h-5 shrink-0" />
                                            <span className="text-[10px] font-black uppercase tracking-widest italic">Awaiting Queue Arrival</span>
                                        </div>
                                        <p className="text-xs font-bold leading-relaxed italic text-slate-600 dark:text-slate-300">
                                            Please wait for the resident to arrive on-site and enter the physical queue before processing and marking this request as paid.
                                        </p>
                                    </div>

                                    {/* Optional Request Revision button */}
                                    {!isCedula && transaction.revisionCount < 3 && (
                                        <Button
                                            onClick={() => {
                                                setRemarks("");
                                                setIsRequestingRevision(true);
                                            }}
                                            disabled={actionLoading}
                                            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black italic uppercase tracking-widest text-[10px] rounded-2xl shadow-lg shadow-amber-500/10 active:scale-95 transition-all"
                                        >
                                            Request Revision
                                        </Button>
                                    )}
                                </div>
                            )}

                            {/* If status is EVALUATED / FOR_PROCESSING OR checked-in FOR_REQUESTING: Show Payment & Release stage */}
                            {((transaction.status === "EVALUATED" || transaction.status === "FOR_PROCESSING") || (transaction.status === "FOR_REQUESTING" && hasCheckIn)) && (() => {
                                const hasInvalidFees = feeLineItems.some(item => {
                                    const labelEmpty = item.label.trim() === "";
                                    const amountEmpty = item.amount.trim() === "" || item.amount === "0";
                                    return (labelEmpty && !amountEmpty) || (!labelEmpty && amountEmpty);
                                });
                                return (
                                    <div className="space-y-4">
                                        {/* SIBLING SAME-DAY APPOINTMENTS SELECTION PANEL */}
                                        {isLoadingSiblings && siblingAppointments.length === 0 && (
                                            <div className="flex items-center gap-2 p-3.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-bold animate-pulse">
                                                <RotateCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                                                <span>Checking same-day appointments for this citizen...</span>
                                            </div>
                                        )}

                                        {siblingAppointments.length > 0 && (() => {
                                            const payableCount = siblingAppointments.filter(s => s.isPayable).length;
                                            const unpayableCount = siblingAppointments.length - payableCount;
                                            return (
                                                <div className="bg-slate-50/70 dark:bg-[#121824] border border-slate-200 dark:border-white/10 rounded-3xl p-5 space-y-4 animate-in fade-in duration-300 shadow-sm">
                                                    {/* Header */}
                                                    <div className="space-y-3">
                                                        {/* Row 1: Title & Action Buttons */}
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                                                                    <Layers className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                                                                </div>
                                                                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 truncate">
                                                                    Same-Day Appointments
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={handleRefreshSiblings}
                                                                    disabled={isLoadingSiblings}
                                                                    title="Refresh same-day appointments"
                                                                    className="text-[9px] font-black uppercase tracking-wider h-6 px-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                                                                >
                                                                    <RotateCw className={`w-3 h-3 ${isLoadingSiblings ? "animate-spin" : ""}`} />
                                                                    <span>Refresh</span>
                                                                </Button>
                                                                {payableCount > 0 && (
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={handleSelectAllSiblings}
                                                                        className="text-[9px] font-black uppercase tracking-wider h-6 px-2.5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0 rounded-lg transition-all active:scale-95 cursor-pointer"
                                                                    >
                                                                        {selectedSiblingIds.length === payableCount ? "Deselect All" : "Select All Payable"}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Row 2: Status Chips (Cleanly Relocated) */}
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                                {siblingAppointments.length} Found
                                                            </span>
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                {payableCount} Payable
                                                            </span>
                                                            {unpayableCount > 0 && (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/15 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                                                    {unpayableCount} In Review
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Row 3: Explanatory Helper Text */}
                                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                                            This citizen has other appointments today. You can combine appointments that are ready for payment into this Official Receipt:
                                                        </p>
                                                    </div>

                                                    {/* Appointment Items List */}
                                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                                        {siblingAppointments.map((sibling) => {
                                                            const isSelected = selectedSiblingIds.includes(sibling.id);
                                                            return (
                                                                <div
                                                                    key={sibling.id}
                                                                    onClick={() => handleToggleSibling(sibling)}
                                                                    className={cn(
                                                                        "flex items-center justify-between p-3 rounded-xl border transition-all select-none",
                                                                        sibling.isPayable
                                                                            ? (isSelected
                                                                                ? "shadow-sm cursor-pointer"
                                                                                : "bg-white/80 dark:bg-[#151c28] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer")
                                                                            : "bg-slate-100/50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-75"
                                                                    )}
                                                                    style={
                                                                        sibling.isPayable && isSelected
                                                                            ? {
                                                                                backgroundColor: getAlphaColor(effectiveThemeColor, 12),
                                                                                borderColor: getAlphaColor(effectiveThemeColor, 50)
                                                                            }
                                                                            : undefined
                                                                    }
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="shrink-0">
                                                                            {!sibling.isPayable ? (
                                                                                <div title={sibling.unpayableReason || "Not yet payable"} className="w-5 h-5 flex items-center justify-center">
                                                                                    <Ban className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                                                </div>
                                                                            ) : isSelected ? (
                                                                                <CheckSquare
                                                                                    className="w-5 h-5 text-white dark:text-slate-900"
                                                                                    style={{ fill: effectiveThemeColor, color: effectiveThemeColor }}
                                                                                />
                                                                            ) : (
                                                                                <Square className="w-5 h-5 text-slate-400" />
                                                                            )}
                                                                        </div>
                                                                        <div className="space-y-0.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <p
                                                                                    className={cn("text-xs font-black uppercase tracking-tight", !sibling.isPayable && "text-slate-500 dark:text-slate-400")}
                                                                                    style={sibling.isPayable && isSelected ? { color: effectiveThemeColor } : undefined}
                                                                                >
                                                                                    {sibling.serviceName}
                                                                                </p>
                                                                                {!sibling.isPayable && (
                                                                                    <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
                                                                                        {sibling.unpayableReason || "Not for payment"}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                                                                                <span className="font-mono font-bold">Ref: {sibling.reference}</span>
                                                                                <span>•</span>
                                                                                <span className="flex items-center gap-1">
                                                                                    <Calendar className="w-3 h-3" />
                                                                                    {sibling.appointmentSlot}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-right shrink-0">
                                                                        <p
                                                                            className={cn(
                                                                                "text-xs font-black font-mono",
                                                                                sibling.isPayable ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"
                                                                            )}
                                                                            style={sibling.isPayable && isSelected ? { color: effectiveThemeColor } : undefined}
                                                                        >
                                                                            ₱{sibling.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                                        </p>
                                                                        <span className={cn(
                                                                            "text-[8px] font-black uppercase tracking-wider",
                                                                            sibling.isPayable ? "text-emerald-500" : "text-slate-400"
                                                                        )}>
                                                                            {sibling.isPayable ? "READY FOR OR" : sibling.status}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Dynamic Consolidated Totalizer */}
                                                    <div className="bg-slate-900 dark:bg-black/40 text-white rounded-2xl p-3.5 flex items-center justify-between border border-white/10">
                                                        <div className="space-y-0.5">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                                Consolidated Cashier Total
                                                            </span>
                                                            <p className="text-[10px] text-slate-300">
                                                                {isMerging
                                                                    ? `Current (₱${primaryFee.toFixed(2)}) + ${selectedSiblingIds.length} Merged`
                                                                    : "Current Request Only"}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg md:text-xl font-black font-mono text-emerald-400 tracking-tight">
                                                                ₱{consolidatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </p>
                                                            {isMerging && (
                                                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300">
                                                                    {selectedSiblingIds.length + 1} Appointments in 1 O.R.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        {!isLoadingSiblings && siblingAppointments.length === 0 && (
                                            <button
                                                type="button"
                                                onClick={handleRefreshSiblings}
                                                className="w-full flex items-center justify-between p-3 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 text-[11px] font-bold transition-all"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                    Check Same-Day Mergeable Appointments
                                                </span>
                                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-black">Scan</span>
                                            </button>
                                        )}

                                        {/* Inline Payment Selector */}
                                        <div className="space-y-4 bg-slate-50 dark:bg-white/5 p-6 rounded-3xl border border-slate-100 dark:border-white/5">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Payment Method</Label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {(["CASH", "GCASH", "LANDBANK"] as const).map((method) => (
                                                        <button
                                                            key={method}
                                                            type="button"
                                                            onClick={() => {
                                                                setPaymentMethod(method);
                                                            }}
                                                            className={cn(
                                                                "h-12 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all active:scale-95",
                                                                paymentMethod === method
                                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                                                    : "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-white/10"
                                                            )}
                                                        >
                                                            {method}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* OR Number Input */}
                                            <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                                    {isMerging ? "Consolidated OR Number (Official Receipt)" : "OR Number (Official Receipt)"}
                                                </Label>
                                                <Input
                                                    type="text"
                                                    name="official_receipt_series_number"
                                                    autoComplete="off"
                                                    data-lpignore="true"
                                                    data-1p-ignore="true"
                                                    data-form-type="other"
                                                    placeholder={isMerging ? "Enter Shared OR Series Number for All..." : "Enter OR Series Number..."}
                                                    value={orSeriesNumber || ""}
                                                    onChange={(e) => setOrSeriesNumber && setOrSeriesNumber(e.target.value)}
                                                    className="h-12 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm font-bold"
                                                />
                                            </div>

                                            {paymentMethod !== "CASH" && (
                                                <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{paymentMethod} Reference Number</Label>
                                                    <Input
                                                        type="text"
                                                        name="online_payment_reference_code"
                                                        autoComplete="off"
                                                        data-lpignore="true"
                                                        data-1p-ignore="true"
                                                        data-form-type="other"
                                                        placeholder={`Enter ${paymentMethod} Transaction Reference...`}
                                                        value={paymentReference}
                                                        onChange={(e) => setPaymentReference(e.target.value)}
                                                        className="h-12 rounded-xl border-slate-200 focus:ring-primary shadow-sm text-xs md:text-sm font-bold"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() => setIsConfirmPaidModalOpen(true)}
                                            disabled={actionLoading || isSubmittingMerge || hasInvalidFees || !orSeriesNumber?.trim() || (paymentMethod !== "CASH" && !paymentReference.trim())}
                                            title={hasInvalidFees ? "Please complete all fee descriptions and amounts before approving." : (!orSeriesNumber?.trim() ? "Official Receipt (OR) Number is required." : (paymentMethod !== "CASH" && !paymentReference.trim() ? `${paymentMethod} reference number is required.` : undefined))}
                                            className={cn(
                                                "w-full h-14 font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
                                                isMerging
                                                    ? "bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:opacity-95 text-white shadow-amber-500/25"
                                                    : "bg-primary hover:opacity-90 text-white shadow-primary/20"
                                            )}
                                        >
                                            {actionLoading || isSubmittingMerge ? (
                                                <span className="flex items-center gap-2">
                                                    <RotateCw className="w-4 h-4 animate-spin" />
                                                    Processing...
                                                </span>
                                            ) : isMerging ? (
                                                `Consolidate & Release (${selectedSiblingIds.length + 1} Appointments • ₱${consolidatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })})`
                                            ) : (
                                                "Mark as Paid & Released"
                                            )}
                                        </Button>

                                        {/* Dedicated Print Cedula action - positioned right below Mark as Paid & Released */}
                                        {isCedula && (transaction.status === "FOR_PROCESSING" || (transaction.status === "FOR_REQUESTING" && hasCheckIn) || transaction.status === "EVALUATED") && (
                                            <Button
                                                type="button"
                                                onClick={() => openCedulaPreview ? openCedulaPreview() : (handlePrintCedula ? handlePrintCedula() : window.print())}
                                                variant="outline"
                                                className="w-full h-14 rounded-2xl border-2 border-primary/30 text-primary hover:bg-primary/5 font-black italic uppercase tracking-widest text-[10px] transition-all shadow-sm active:scale-95 mt-3"
                                            >
                                                <Printer className="w-4 h-4 mr-2" />
                                                Preview & Print Cedula Form
                                            </Button>
                                        )}

                                        {/* Report Paper Jam / Cancelled Serial Action Button — strictly available once called to an active counter */}
                                        {hasAssignedCounter ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    const currentSerial = isCedula 
                                                        ? (ctcNumber || transaction.cedula?.ctcNumber || orSeriesNumber || "")
                                                        : (orSeriesNumber || transaction.additionalData?.orSeriesNumber || "");
                                                    setDamagedSerialInput(currentSerial);
                                                    setReplacementSerialInput("");
                                                    setIncidentReasonDetails("");
                                                    setIncidentFormType("");
                                                    setIncidentType("PAPER_JAM");
                                                    setIncidentModalOpen(true);
                                                }}
                                                className="w-full h-12 rounded-2xl border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 font-black italic uppercase tracking-widest text-[10px] transition-all shadow-sm active:scale-95 mt-3 flex items-center justify-center gap-2"
                                            >
                                                <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />
                                                Report Cancelled / Jammed Form
                                            </Button>
                                        ) : (
                                            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-slate-800 dark:text-slate-200 space-y-2 mt-3 text-left">
                                                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">Unassigned Counter Window</span>
                                                </div>
                                                <p className="text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                                                    This ticket has not yet been assigned to a counter window. Please call this ticket from the{" "}
                                                    <Link href="/admin/treasury/queue" className="underline font-bold text-primary hover:opacity-80">
                                                        Live Queue board
                                                    </Link>{" "}
                                                    to enable form printing and incident reporting.
                                                </p>
                                            </div>
                                        )}

                                        {hasCheckIn && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    if (setIsRejecting) {
                                                        setIsRejecting(true);
                                                    }
                                                }}
                                                disabled={actionLoading}
                                                className="w-full h-14 border-2 border-rose-500/30 hover:border-rose-500 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-black italic uppercase tracking-widest text-[11px] rounded-2xl transition-all active:scale-95 mt-3"
                                            >
                                                Reject Application
                                            </Button>
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Merged Payment Metadata Banner if Already Paid */}
                            {transaction.status === "PAID" && additional?.isMergedPayment && (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase tracking-wider">
                                        <Layers className="w-4 h-4" />
                                        <span>Consolidated Municipal Payment</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Consolidated O.R.</p>
                                            <p className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
                                                {additional.mergedGroupOr || additional.orSeriesNumber || transaction.orSeriesNumber}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Grand Total Collected</p>
                                            <p className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                                                ₱{Number(additional.mergedGrandTotal || transaction.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {transaction.status === "PAID" && (
                                <Button
                                    onClick={() => handleConfirmPayment()}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                                >
                                    {actionLoading ? "Processing..." : "Approve Payment & Start Processing"}
                                </Button>
                            )}
                        </div>
                    )}

                    {/* PENDING PAYMENT NOTE — shown when status is EVALUATED */}
                    {transaction.status === "EVALUATED" && (userRole !== "TREASURY_STAFF" && userRole !== "ADMIN") && (
                        <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200 font-bold">Awaiting Citizen Payment</h4>
                            <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">
                                The assessment fee has been computed. We are currently waiting for the citizen to complete the payment online or upload their proof of payment.
                            </p>
                        </div>
                    )}

                    {/* PENDING REVISION NOTE — shown when status is FOR_REVISION */}
                    {transaction.status === "FOR_REVISION" && (
                        <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-4 text-center">
                            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto">
                                <AlertCircle className="w-6 h-6 animate-pulse" />
                            </div>
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-700 dark:text-slate-200 font-bold">Awaiting Resident Revision</h4>
                            <p className="text-[10px] text-slate-400 italic max-w-xs mx-auto">
                                This request has been sent back to the resident for revisions. We are currently waiting for them to update and resubmit their application.
                            </p>
                            {transaction.rejectionRemarks && (
                                <div className="mt-2 p-4 bg-slate-50 dark:bg-white/5 rounded-2xl text-left border border-slate-100 dark:border-white/5">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">Requested Corrections</span>
                                    <p className="text-xs font-bold text-slate-755 dark:text-slate-200 italic">
                                        &ldquo;{transaction.rejectionRemarks}&rdquo;
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* INTERACTIVE RELEASE HUB FOR PROCESSING PHASES — Temporarily hidden per request */}
                    {false && (["PAID", "FOR_CLAIM", "FOR_PICKING"].includes(transaction.status) || (transaction.status === "FOR_PROCESSING" && (!!transaction.orSeriesNumber || !!transaction.paymentType))) && (
                        <div className="space-y-6">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 block italic leading-none">Document Issuance</span>
                                <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white mt-1">Fulfillment Actions</h3>
                            </div>

                            {/* Document Inputs Block */}
                            <div className="space-y-4">
                                {/* Treasury Payment and Collection Controls */}
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
                                                    const isECopyPdf = Boolean(
                                                        eCopyFile?.type === "application/pdf" ||
                                                        eCopyFile?.name?.toLowerCase()?.endsWith(".pdf") ||
                                                        (!eCopyFile && transaction.eCopyUrl?.toLowerCase()?.includes(".pdf"))
                                                    );

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
                                        {transaction.status !== "PAID" && (
                                            <Button
                                                onClick={handleRelease}
                                                disabled={
                                                    actionLoading ||
                                                    (transaction.status === "FOR_PROCESSING" && (!eCopyFile && !transaction.eCopyUrl))
                                                }
                                                className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                                            >
                                                {actionLoading
                                                    ? "Submitting..."
                                                    : (transaction.fulfillmentType === "DELIVERY" ? "Approve & Dispatch to Courier" : "Approve & Ready for Claiming")
                                                }
                                            </Button>
                                        )}
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

                                {/* Dedicated Print Cedula action - strictly visible ONLY when status is FOR_PROCESSING */}
                                {isCedula && transaction.status === "FOR_PROCESSING" && (
                                    <Button
                                        type="button"
                                        onClick={() => openCedulaPreview ? openCedulaPreview() : (handlePrintCedula ? handlePrintCedula() : window.print())}
                                        variant="outline"
                                        className="w-full h-14 rounded-2xl border-2 border-primary/30 text-primary hover:bg-primary/5 font-black italic uppercase tracking-widest text-[10px] transition-all shadow-sm active:scale-95"
                                    >
                                        <Printer className="w-4 h-4 mr-2" />
                                        Preview & Print Cedula Form
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* RELEASED / DELIVERED DETAILS VIEW */}
                    {["RELEASED", "DELIVERED"].includes(transaction.status) && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="p-8 rounded-[2rem] bg-white dark:bg-[#151b28] border border-slate-100 dark:border-white/5 shadow-2xl space-y-6">
                                <div className="text-center space-y-3">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
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

                                {/* CTC Serial Number */}
                                {transaction.cedula?.ctcNumber && (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1 text-left">
                                        <span className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 block leading-none">CTC Serial Number</span>
                                        <p className="text-xs font-black uppercase italic tracking-wider text-slate-800 dark:text-slate-200 font-mono">
                                            {transaction.cedula.ctcNumber}
                                        </p>
                                    </div>
                                )}

                                {/* E-Copy document */}
                                {transaction.eCopyUrl && (
                                    <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 space-y-4 text-left">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Official E-Copy Document</span>
                                        {(() => {
                                            const isPdf = transaction.eCopyUrl.toLowerCase().includes(".pdf");
                                            if (isPdf) {
                                                return (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleViewFile?.(transaction.eCopyUrl, "Official E-Copy PDF")}
                                                        className="w-full flex items-center justify-between p-5 bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl shrink-0 group-hover:scale-110 transition-transform">
                                                                📕
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Official E-Copy PDF</p>
                                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Click to View Document</p>
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
                                                    onClick={() => handleViewFile?.(transaction.eCopyUrl, "Official E-Copy Document")}
                                                    className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all cursor-pointer select-none"
                                                >
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={transaction.eCopyUrl}
                                                        alt="Official E-Copy"
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
                                                </div>
                                            );
                                        })()}
                                    </div>
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

            {/* Confirmation & Details Verification Modal for "Mark as Paid & Released" */}
            {isConfirmPaidModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/10 w-full max-w-lg p-7 space-y-6 animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-xl shrink-0">
                                🧾
                            </div>
                            <div>
                                <h3 className="text-base font-black italic uppercase tracking-tight text-slate-850 dark:text-white">
                                    Verify Payment & Release Details
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">
                                    Double-check details before finalizing this official transaction.
                                </p>
                            </div>
                        </div>

                        {/* Summary Verification Cards */}
                        <div className="space-y-3">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 space-y-3 text-xs">
                                {/* Applicant Name */}
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Applicant / Payor</span>
                                    <span className="font-black text-slate-800 dark:text-slate-200 uppercase">
                                        {resident.firstName ? `${resident.firstName} ${resident.lastName || ""}` : (transaction.user?.name || "N/A")}
                                    </span>
                                </div>

                                {/* Service Name */}
                                <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-white/5 pt-2.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Service</span>
                                    <span className="font-bold text-slate-700 dark:text-slate-300">
                                        {transaction.type?.name || "Official Transaction"}
                                    </span>
                                </div>

                                {/* Total Amount */}
                                <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-white/5 pt-2.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Amount Collected</span>
                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                        ₱{(isMerging ? consolidatedGrandTotal : adjustedTotalAmount).toFixed(2)}
                                    </span>
                                </div>

                                {isMerging && (
                                    <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-white/5 pt-2.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Merged Appointments</span>
                                        <span className="font-black text-amber-500 text-xs">
                                            Current + {selectedSiblingIds.length} Sibling(s)
                                        </span>
                                    </div>
                                )}

                                {/* Payment Method */}
                                <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-white/5 pt-2.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Method</span>
                                    <span className="font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                        {paymentMethod}
                                    </span>
                                </div>

                                {/* Official Receipt (OR) Number */}
                                <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-white/5 pt-2.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Official Receipt (OR) #</span>
                                    <span className="font-black text-slate-900 dark:text-white font-mono text-sm tracking-wide">
                                        {orSeriesNumber?.trim() || "N/A"}
                                    </span>
                                </div>

                                {/* Reference Number (for GCASH / LANDBANK) */}
                                {paymentMethod !== "CASH" && (
                                    <div className="flex justify-between items-center border-t border-dashed border-slate-200 dark:border-white/5 pt-2.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{paymentMethod} Reference #</span>
                                        <span className="font-black text-primary font-mono text-sm tracking-wide">
                                            {paymentReference?.trim() || "N/A"}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium text-center italic leading-relaxed">
                                Please confirm that the entered Official Receipt details match the physical transaction.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsConfirmPaidModalOpen(false)}
                                disabled={actionLoading || isSubmittingMerge}
                                className="flex-1 rounded-xl border-slate-200 dark:border-white/10 font-bold py-6 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                            >
                                Edit / Go Back
                            </Button>
                            <Button
                                type="button"
                                onClick={async () => {
                                    if (isMerging) {
                                        await handleProceedMergedPayment();
                                    } else if (handleOnsitePayment) {
                                        await handleOnsitePayment(paymentMethod, undefined, paymentMethod !== "CASH" ? paymentReference : undefined);
                                    }
                                    setIsConfirmPaidModalOpen(false);
                                }}
                                disabled={actionLoading || isSubmittingMerge}
                                className={cn(
                                    "flex-1 rounded-xl text-white font-black italic uppercase tracking-wider py-6 shadow-lg",
                                    isMerging
                                        ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/20"
                                        : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                                )}
                            >
                                {actionLoading || isSubmittingMerge ? "Finalizing..." : isMerging ? "Confirm Consolidated Payment" : "Confirm & Release"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* TREASURY GROSS UNLOCK AUTHORIZATION MODAL */}
            <Dialog open={unlockModalOpen} onOpenChange={(open) => {
                if (!unlockLoading) {
                    setUnlockModalOpen(open);
                    if (!open) {
                        setUnlockPassword('');
                        setUnlockReason('');
                    }
                }
            }}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6">
                    <DialogHeader className="space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-1">
                            <Lock className="w-6 h-6" />
                        </div>
                        <DialogTitle className="text-lg font-black text-center text-slate-800 dark:text-slate-100">
                            Staff Authorization Required
                        </DialogTitle>
                        <DialogDescription className="text-xs text-center text-slate-500 dark:text-slate-400">
                            Please enter your account password to authorize and unlock editing for the citizen profile and declared gross income. All modifications are logged in the municipal audit trail.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleVerifyAndUnlockGross();
                        }}
                        autoComplete="off"
                        className="space-y-4 my-2"
                    >
                        {/* Hidden fake inputs to absorb any stubborn browser autofill */}
                        <input type="text" name="fake_user_name_absorber" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
                        <input type="password" name="fake_password_absorber" style={{ display: 'none' }} tabIndex={-1} autoComplete="new-password" />

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Treasury Staff Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showUnlockPassword ? "text" : "password"}
                                    name="staff_security_passphrase"
                                    autoComplete="new-password"
                                    data-lpignore="true"
                                    data-1p-ignore="true"
                                    value={unlockPassword}
                                    onChange={(e) => setUnlockPassword(e.target.value)}
                                    placeholder="Enter your current password"
                                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Reason for Adjustment (Optional / Recommended)
                            </label>
                            <input
                                type="text"
                                name="staff_adjustment_rationale"
                                autoComplete="off"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                value={unlockReason}
                                onChange={(e) => setUnlockReason(e.target.value)}
                                placeholder="e.g. Verified with BIR Form 2316 or payslip"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            />
                        </div>
                    </form>

                    <DialogFooter className="flex items-center gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setUnlockModalOpen(false);
                                setUnlockPassword('');
                                setUnlockReason('');
                            }}
                            disabled={unlockLoading}
                            className="flex-1 rounded-xl font-bold py-2.5 text-slate-700 dark:text-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={handleVerifyAndUnlockGross}
                            disabled={unlockLoading || !unlockPassword}
                            className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 shadow-md shadow-amber-600/20"
                        >
                            {unlockLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Unlock className="w-4 h-4" /> Authorize & Unlock
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ACCOUNTABLE FORM INCIDENT (PAPER JAM / CANCELLED STUB) MODAL */}
            <Dialog open={incidentModalOpen} onOpenChange={(open) => {
                if (!incidentSubmitting) {
                    setIncidentModalOpen(open);
                }
            }}>
                <DialogContent className="sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
                    <DialogHeader className="space-y-2 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-1 border border-amber-500/20 shadow-sm">
                            <FileWarning className="w-7 h-7" />
                        </div>
                        <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                            Log Cancelled Accountable Form
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                            Log a cancelled or paper-jammed physical stub. This event is permanently recorded in the municipal audit trail for official COA RAAF compliance.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Form Type Selector */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Form Classification
                            </Label>
                            <Input
                                type="text"
                                value={incidentFormType}
                                onChange={(e) => setIncidentFormType(e.target.value)}
                                placeholder="Official Receipt"
                                className="h-10 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-white/10 placeholder:text-slate-400/70"
                            />
                        </div>

                        {/* Incident Type Selector */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Incident Category
                            </Label>
                            <select
                                value={incidentType}
                                onChange={(e) => setIncidentType(e.target.value as any)}
                                className="w-full h-11 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                            >
                                <option value="PAPER_JAM">Paper Jam / Printer Feeder Jam</option>
                                <option value="PRINTER_MISFEED">Printer Misfeed / Misaligned Sheet</option>
                                <option value="INK_SMUDGE">Ink Smudge / Illegible Printout</option>
                                <option value="DAMAGED_LEAF">Torn / Damaged Booklet Leaf</option>
                                <option value="ENCODING_ERROR">Encoding Error / Cancelled Serial</option>
                            </select>
                        </div>

                        {/* Cancelled Serial & Replacement Serial Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                                    Cancelled Serial #
                                </Label>
                                <Input
                                    type="text"
                                    value={damagedSerialInput}
                                    onChange={(e) => setDamagedSerialInput(e.target.value)}
                                    placeholder="e.g. 029293882"
                                    className="h-11 rounded-xl border-rose-300 dark:border-rose-900/50 bg-rose-500/5 text-rose-700 dark:text-rose-400 font-mono font-black text-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                    Replacement Serial # (Active)
                                </Label>
                                <Input
                                    type="text"
                                    value={replacementSerialInput}
                                    onChange={(e) => setReplacementSerialInput(e.target.value)}
                                    placeholder="e.g. 029293883"
                                    className="h-11 rounded-xl border-emerald-300 dark:border-emerald-900/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 font-mono font-black text-sm"
                                />
                            </div>
                        </div>

                        {/* Remarks / Reason Details */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                Notes / Cashier Remarks (Optional)
                            </Label>
                            <Input
                                type="text"
                                value={incidentReasonDetails}
                                onChange={(e) => setIncidentReasonDetails(e.target.value)}
                                placeholder="e.g. Paper folded in roller during printing"
                                className="h-10 rounded-xl text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex items-center gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIncidentModalOpen(false)}
                            disabled={incidentSubmitting}
                            className="flex-1 rounded-xl font-bold py-2.5 text-slate-700 dark:text-slate-300"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            onClick={async () => {
                                if (!damagedSerialInput.trim()) {
                                    toast.error("Please specify the cancelled / jammed serial number.");
                                    return;
                                }
                                if (!replacementSerialInput.trim()) {
                                    toast.error("Please enter the new replacement serial number.");
                                    return;
                                }
                                if (damagedSerialInput.trim() === replacementSerialInput.trim()) {
                                    toast.error("Replacement serial must be different from cancelled serial.");
                                    return;
                                }

                                setIncidentSubmitting(true);
                                try {
                                    const { reportAccountableFormIncidentAction } = await import("@/app/admin/transactions/treasury-incident-actions");
                                    const effectiveFormType = incidentFormType.trim() || (isCedula ? "Cedula (CTC Form)" : "Official Receipt");
                                    const activeCounter = (typeof window !== "undefined" ? localStorage.getItem("activeCounterName") : null) 
                                        || transaction.additionalData?.counterName 
                                        || "Counter 1";

                                    const res = await reportAccountableFormIncidentAction({
                                        transactionId: transaction.id,
                                        formType: effectiveFormType,
                                        incidentType,
                                        damagedSeriesNumber: damagedSerialInput.trim(),
                                        replacedSeriesNumber: replacementSerialInput.trim(),
                                        reasonDetails: incidentReasonDetails.trim(),
                                        counterName: activeCounter
                                    });

                                    if (res.success) {
                                        toast.success("Form cancellation incident logged to AuditLog!");
                                        
                                        const cleanReplacement = replacementSerialInput.trim();

                                        // Auto-fill active serial in UI form inputs immediately
                                        const isCtcForm = isCedula || incidentFormType.toLowerCase().includes("cedula") || incidentFormType.toLowerCase().includes("ctc");
                                        if (isCtcForm) {
                                            setCtcNumber?.(cleanReplacement);
                                        }
                                        
                                        // Always auto-fill the main OR Number field as well so the payment/fulfillment panel gets the new active serial
                                        setOrSeriesNumber?.(cleanReplacement);
                                        
                                        // Terminate / dismiss modal without refreshing page
                                        setIncidentModalOpen(false);
                                    } else {
                                        toast.error(res.error || "Failed to record incident.");
                                    }
                                } catch (err: any) {
                                    console.error("Error logging form incident:", err);
                                    toast.error(err?.message || "An unexpected error occurred.");
                                } finally {
                                    setIncidentSubmitting(false);
                                }
                            }}
                            disabled={incidentSubmitting || !damagedSerialInput.trim() || !replacementSerialInput.trim()}
                            className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold py-2.5 shadow-md shadow-amber-600/20"
                        >
                            {incidentSubmitting ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> Recording...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Check className="w-4 h-4" /> Apply & Record Incident
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

