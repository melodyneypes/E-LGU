"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Copy, Upload, RotateCw, CheckSquare, Square,
    Layers, Sparkles, Ban, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";
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

interface TreasuryPaymentCollectionPanelProps {
    transaction: any;
    additional: any;
    actionLoading: boolean;
    orSeriesNumber?: string;
    setOrSeriesNumber?: (val: string) => void;
    orFile?: File | null;
    setOrFile?: (file: File | null) => void;
    orPreview?: string | null;
    setOrPreview?: (url: string | null) => void;
    themeColor: string;
    handleConfirmPayment: (arg1?: string, arg2?: string) => void;
    handleViewFile?: (url: string, label: string) => void;
}

export default function TreasuryPaymentCollectionPanel({
    transaction,
    additional,
    actionLoading,
    orSeriesNumber,
    setOrSeriesNumber,
    orFile,
    setOrFile,
    orPreview,
    setOrPreview,
    themeColor,
    handleConfirmPayment,
    handleViewFile
}: TreasuryPaymentCollectionPanelProps) {
    const router = useRouter();
    const effectiveThemeColor = themeColor || "#f43f5e";

    const refNo =
        additional?.paymentId ||
        additional?.reference_number ||
        additional?.gcashReferenceNo ||
        (transaction.paymentReference && !transaction.paymentReference.startsWith("http") && !transaction.paymentReference.startsWith("/") ? transaction.paymentReference : null) ||
        additional?.payment_id ||
        transaction.paymentId;

    const isBusinessPermit = transaction?.type?.code?.startsWith("BUSINESS_PERMIT") ?? false;
    const isPaid = Boolean(
        transaction.isPaid === true ||
        transaction.status === "PAID" ||
        transaction.status === "RELEASED" ||
        transaction.status === "COMPLETED" ||
        transaction.status === "FOR_CLAIM" ||
        transaction.status === "FOR_PICKING"
    );

    // Payment method state
    const [paymentMethod, setPaymentMethod] = useState<"CASH" | "GCASH" | "LANDBANK">(
        (transaction.paymentType as any) || "CASH"
    );
    const [paymentReference, setPaymentReference] = useState(
        transaction.paymentReference || additional?.paymentReference || ""
    );

    // Same-Day Sibling Appointments state
    const [siblingAppointments, setSiblingAppointments] = useState<SiblingAppointment[]>([]);
    const [selectedSiblingIds, setSelectedSiblingIds] = useState<string[]>([]);
    const [isLoadingSiblings, setIsLoadingSiblings] = useState(false);
    const [isSubmittingMerge, setIsSubmittingMerge] = useState(false);

    // Refresh sibling same-day appointments
    const handleRefreshSiblings = useCallback(async () => {
        if (!transaction?.id || isPaid) return;
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
            console.error("Error refreshing sibling appointments:", err);
            toast.error("Failed to check for other same-day appointments.");
        } finally {
            setIsLoadingSiblings(false);
        }
    }, [transaction?.id, isPaid]);

    // Fetch sibling appointments on mount or when transaction changes
    useEffect(() => {
        if (!transaction?.id || isPaid) return;

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
                console.error("Error fetching sibling appointments:", err);
            })
            .finally(() => {
                if (isMounted) setIsLoadingSiblings(false);
            });

        return () => {
            isMounted = false;
        };
    }, [transaction?.id, isPaid]);

    // Checkbox toggle logic
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

    // Real-time consolidated total calculation
    const primaryAmount = Number(
        transaction.totalAmount ||
        additional?.calculatedTax?.totalAmount ||
        additional?.totalTaxDue ||
        transaction.realPropertyTax?.totalTaxDue ||
        0
    );
    const selectedMergedAmount = siblingAppointments
        .filter((s) => selectedSiblingIds.includes(s.id))
        .reduce((sum, s) => sum + s.amount, 0);
    const consolidatedGrandTotal = primaryAmount + selectedMergedAmount;
    const isMerging = selectedSiblingIds.length > 0;

    // Handle payment button click
    const handleProceedPayment = async () => {
        if (isMerging) {
            if (!orSeriesNumber || !orSeriesNumber.trim()) {
                toast.error("Please enter the O.R. Series Number before proceeding.");
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
                if (paymentMethod !== "CASH" && paymentReference.trim()) {
                    formData.append("paymentReference", paymentReference.trim());
                }
                if (orFile) formData.append("orFile", orFile);

                const res = await confirmMergedTreasuryPaymentAction(formData);
                if (res.success) {
                    toast.success(
                        `Consolidated payment recorded! ${res.mergedCount} appointments linked to O.R. #${res.orNumber} (Total: ₱${res.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2 })})`,
                        { id: toastId }
                    );
                    router.refresh();
                } else {
                    toast.error(res.error || "Failed to merge appointments payment.", { id: toastId });
                }
            } catch (err: any) {
                toast.error(err.message || "An unexpected error occurred during merged payment.", { id: toastId });
            } finally {
                setIsSubmittingMerge(false);
            }
        } else {
            handleConfirmPayment(paymentMethod, paymentMethod !== "CASH" ? paymentReference : undefined);
        }
    };

    return (
        <div className="space-y-4">
            {/* GCash Reference Panel */}
            {refNo && (
                <div className="bg-slate-50 dark:bg-white/5 rounded-[1.5rem] p-6 border border-slate-100 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-450 dark:text-slate-500 leading-none">
                            Resident GCash Reference
                        </span>
                        <button
                            type="button"
                            onClick={async () => {
                                const success = await copyToClipboard(refNo);
                                if (success) toast.success("Reference number copied!");
                                else toast.error("Failed to copy reference number.");
                            }}
                            className="text-slate-450 hover:text-primary transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-sm md:text-base font-black tracking-widest font-mono text-slate-800 dark:text-white select-all">
                        {refNo}
                    </p>
                </div>
            )}

            {/* O.R. Upload and Confirmation Section */}
            {["PAID", "PENDING_PAYMENT_VERIFICATION", "EVALUATED", "UNPAID"].includes(transaction.status) && (
                <div className="space-y-6">
                    <div className="space-y-6 bg-white dark:bg-[#151b28] rounded-[2rem] p-8 border border-slate-50 dark:border-white/5 shadow-2xl">
                        <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-white/5">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] italic" style={{ color: themeColor }}>
                                    Treasury Collection
                                </h4>
                                {additional?.isMergedPayment && (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                        <Sparkles className="w-3 h-3" />
                                        Merged Payment ({additional?.mergedSiblingTxIds?.length || "Consolidated"})
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 italic">
                                {isPaid && (transaction.orSeriesNumber || additional?.orSeriesNumber)
                                    ? "Official Receipt details recorded for this payment."
                                    : "Record receipt serial, attach scanned document, and mark as paid."}
                            </p>
                        </div>

                        {/* Merged Payment Metadata Banner if Already Paid */}
                        {isPaid && additional?.isMergedPayment && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
                                <div className="flex items-center gap-2 text-emerald-500 font-black text-xs uppercase tracking-wider">
                                    <Layers className="w-4 h-4" />
                                    <span>Consolidated Municipal Payment</span>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Consolidated O.R.</p>
                                        <p className="font-mono font-extrabold text-slate-800 dark:text-slate-100">
                                            {additional.mergedGroupOr || additional.orSeriesNumber}
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

                        {/* SIBLING SAME-DAY APPOINTMENTS SELECTION PANEL (WHEN UNPAID) */}
                        {!isPaid && isLoadingSiblings && siblingAppointments.length === 0 && (
                            <div className="flex items-center gap-2 p-3.5 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-xs font-bold animate-pulse">
                                <RotateCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                                <span>Checking same-day appointments for this citizen...</span>
                            </div>
                        )}

                        {!isPaid && siblingAppointments.length > 0 && (() => {
                            const payableCount = siblingAppointments.filter(s => s.isPayable).length;
                            const unpayableCount = siblingAppointments.length - payableCount;
                            return (
                                <div className="bg-slate-50/70 dark:bg-[#121824] border border-slate-200 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-3.5 animate-in fade-in duration-300 shadow-sm">
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
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Combine ready appointments for this citizen into a single Official Receipt:
                                        </p>
                                    </div>

                                    {/* Appointment Items List */}
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {siblingAppointments.map((sibling) => {
                                            const isSelected = selectedSiblingIds.includes(sibling.id);
                                            return (
                                                <div
                                                    key={sibling.id}
                                                    onClick={() => handleToggleSibling(sibling)}
                                                    className={`p-3 rounded-xl border transition-all select-none space-y-2 ${
                                                        sibling.isPayable
                                                            ? isSelected
                                                                ? "shadow-sm cursor-pointer"
                                                                : "bg-white/80 dark:bg-[#151c28] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer"
                                                            : "bg-slate-100/50 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-75 cursor-not-allowed"
                                                    }`}
                                                    style={
                                                        sibling.isPayable && isSelected
                                                            ? {
                                                                backgroundColor: getAlphaColor(effectiveThemeColor, 12),
                                                                borderColor: getAlphaColor(effectiveThemeColor, 50)
                                                            }
                                                            : undefined
                                                    }
                                                >
                                                    {/* Top row: Checkbox, Service Title, and Amount */}
                                                    <div className="flex items-start justify-between gap-2.5">
                                                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                            <div className="shrink-0 mt-0.5">
                                                                {!sibling.isPayable ? (
                                                                    <div title={sibling.unpayableReason || "Not yet payable"} className="w-4 h-4 flex items-center justify-center">
                                                                        <Ban className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                                                    </div>
                                                                ) : isSelected ? (
                                                                    <CheckSquare
                                                                        className="w-4 h-4 text-white dark:text-slate-900"
                                                                        style={{ fill: effectiveThemeColor, color: effectiveThemeColor }}
                                                                    />
                                                                ) : (
                                                                    <Square className="w-4 h-4 text-slate-400" />
                                                                )}
                                                            </div>
                                                            <p
                                                                className={`text-xs font-black uppercase tracking-tight leading-snug break-words ${
                                                                    sibling.isPayable
                                                                        ? isSelected ? "" : "text-slate-800 dark:text-slate-100"
                                                                        : "text-slate-400 dark:text-slate-500"
                                                                }`}
                                                                style={sibling.isPayable && isSelected ? { color: effectiveThemeColor } : undefined}
                                                            >
                                                                {sibling.serviceName}
                                                            </p>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <span
                                                                className={`text-xs font-black font-mono whitespace-nowrap ${
                                                                    sibling.isPayable
                                                                        ? isSelected ? "" : "text-slate-900 dark:text-white"
                                                                        : "text-slate-400 dark:text-slate-500"
                                                                }`}
                                                                style={sibling.isPayable && isSelected ? { color: effectiveThemeColor } : undefined}
                                                            >
                                                                ₱{sibling.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Bottom row: Ref, Slot, and Ready Badge */}
                                                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-500 dark:text-slate-400">
                                                        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                            <span className="font-mono font-bold truncate max-w-[130px]">
                                                                Ref: {sibling.reference}
                                                            </span>
                                                            {sibling.appointmentSlot && (
                                                                <>
                                                                    <span className="text-slate-300 dark:text-slate-600">•</span>
                                                                    <span className="flex items-center gap-1 shrink-0">
                                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                                        {sibling.appointmentSlot}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="shrink-0">
                                                            {sibling.isPayable ? (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 whitespace-nowrap">
                                                                    Ready for O.R.
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 whitespace-nowrap">
                                                                    {sibling.unpayableReason || sibling.status}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Consolidated Totalizer */}
                                    <div className="bg-slate-900 dark:bg-black/60 text-white rounded-xl p-3 border border-white/10 space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                Consolidated Total
                                            </span>
                                            {isMerging && (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                                                    {selectedSiblingIds.length + 1} Appointments in 1 O.R.
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className="text-[10px] text-slate-300 truncate">
                                                {isMerging
                                                    ? `Primary (₱${primaryAmount.toFixed(2)}) + ${selectedSiblingIds.length} Merged`
                                                    : "Primary Appointment Only"}
                                            </p>
                                            <p className="text-lg font-black font-mono text-emerald-400 tracking-tight shrink-0">
                                                ₱{consolidatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {!isPaid && !isLoadingSiblings && siblingAppointments.length === 0 && (
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

                        <div className="space-y-4 pt-2">
                            {/* Payment Method Selector (When Unpaid) */}
                            {!isPaid && (
                                <div className="space-y-3 bg-slate-50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                            Payment Method
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {(["CASH", "GCASH", "LANDBANK"] as const).map((method) => (
                                                <button
                                                    key={method}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(method)}
                                                    className={`h-10 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                                                        paymentMethod === method
                                                            ? "border-primary text-white shadow-md shadow-primary/20"
                                                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                                                    }`}
                                                    style={paymentMethod === method ? { backgroundColor: themeColor, borderColor: themeColor } : undefined}
                                                >
                                                    {method}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {paymentMethod !== "CASH" && (
                                        <div className="space-y-1.5 pt-2 border-t border-slate-200/50 dark:border-white/5">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                                {paymentMethod} Reference Number
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={`Enter ${paymentMethod} transaction reference...`}
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151b28]/60 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block">
                                    O.R. Series Number{" "}
                                    {((!isPaid || !(transaction.orSeriesNumber || additional?.orSeriesNumber)) || isBusinessPermit) && (
                                        <span className="text-rose-500 font-extrabold">*Required</span>
                                    )}
                                </label>
                                {isPaid && (transaction.orSeriesNumber || additional?.orSeriesNumber) && !isBusinessPermit ? (
                                    <div className="h-11 flex items-center px-4 rounded-xl border border-slate-150 dark:border-white/5 bg-slate-50 dark:bg-white/5 text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {orSeriesNumber || transaction.orSeriesNumber || additional?.orSeriesNumber || "N/A"}
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        name="official_receipt_series_number"
                                        autoComplete="off"
                                        data-lpignore="true"
                                        data-1p-ignore="true"
                                        data-form-type="other"
                                        value={orSeriesNumber || ""}
                                        onChange={(e) => setOrSeriesNumber?.(e.target.value)}
                                        placeholder={isMerging ? "Enter Shared O.R. Series Number for All..." : "Enter O.R. Series Number..."}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-150 dark:border-white/5 bg-white dark:bg-[#151b28]/60 text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary transition-all"
                                    />
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 italic block">
                                    Official Receipt (O.R.) Document{" "}
                                    {(() => {
                                        const code = (transaction?.type?.code || "").toUpperCase();
                                        const cat = (transaction?.type?.category || "").toUpperCase();
                                        const isLcr = code.startsWith("LCR") || cat.includes("CIVIL");
                                        const isFileStrictlyRequired = isBusinessPermit || (isLcr && !transaction.orUrl);
                                        return isFileStrictlyRequired ? (
                                            <span className="text-rose-500 font-extrabold">*Required</span>
                                        ) : (
                                            <span className="text-slate-400 font-normal text-[9px]">(Optional Scanned Copy)</span>
                                        );
                                    })()}
                                </label>
                                {((!isPaid || !transaction.orUrl) || isBusinessPermit) && (
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
                                )}
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
                                                                <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">
                                                                    Official Receipt PDF
                                                                </p>
                                                                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">
                                                                    Click to View PDF in Modal
                                                                </p>
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
                                                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-350 backdrop-blur-[2px]">
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
                                        {((!isPaid || !transaction.orUrl) || isBusinessPermit) && (
                                            <div className="flex justify-end">
                                                <label
                                                    htmlFor="or-document-upload-paid"
                                                    className="h-8 px-3 rounded-lg border border-transparent bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-[9px] font-black uppercase tracking-widest italic flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm select-none"
                                                >
                                                    Replace O.R. File
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    ((!isPaid || !transaction.orUrl) || isBusinessPermit) ? (
                                        <label
                                            htmlFor="or-document-upload-paid"
                                            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all h-28 bg-white dark:bg-[#151b28]/60 overflow-hidden relative group cursor-pointer border-slate-200 dark:border-white/10 hover:border-primary/30"
                                        >
                                            <Upload className="w-4.5 h-4.5 text-slate-400 group-hover:text-primary transition-colors mb-1" />
                                            <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 text-center px-2">
                                                Upload Scanned O.R. Document
                                            </span>
                                        </label>
                                    ) : (
                                        <div className="h-28 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest italic">
                                            No O.R. Document Uploaded
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {((!isPaid || !transaction.orSeriesNumber || !transaction.orUrl) || isBusinessPermit) && (() => {
                        const code = (transaction?.type?.code || "").toUpperCase();
                        const cat = (transaction?.type?.category || "").toUpperCase();
                        const isLcr = code.startsWith("LCR") || cat.includes("CIVIL");
                        const isFileStrictlyRequired = isBusinessPermit || (isLcr && !transaction.orUrl);
                        const isSubmitDisabled =
                            actionLoading ||
                            isSubmittingMerge ||
                            !orSeriesNumber?.trim() ||
                            (isFileStrictlyRequired && !orFile && !transaction.orUrl) ||
                            (paymentMethod !== "CASH" && !paymentReference.trim());

                        return (
                            <Button
                                onClick={handleProceedPayment}
                                disabled={isSubmitDisabled}
                                style={{ backgroundColor: themeColor }}
                                className="w-full h-14 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider flex items-center justify-center active:scale-95 transition-all opacity-100 hover:opacity-90 disabled:opacity-50"
                            >
                                {(actionLoading || isSubmittingMerge) && <RotateCw className="w-4 h-4 animate-spin mr-2" />}
                                {isPaid
                                    ? "Submit O.R. Details"
                                    : isMerging
                                        ? `Consolidate & Pay ${selectedSiblingIds.length + 1} Appointments (₱${consolidatedGrandTotal.toFixed(2)})`
                                        : "Upload O.R. & Mark as Paid"}
                            </Button>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}
