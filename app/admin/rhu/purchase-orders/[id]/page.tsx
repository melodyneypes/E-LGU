"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft, Printer, FileText, ExternalLink, Pill,
    CheckCircle2, Building2, User, Calendar, MapPin,
    ShieldCheck, Clock, Sparkles, Check, AlertTriangle, UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getRHUPurchaseOrders } from "../../actions";
import { useSystemTheme } from "@/components/providers/ThemeProvider";
import lguConfig from "@/config/lgu.config.json";

function getResidentSnapshot(tx: any): any {
    if (!tx?.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === "string") {
        try {
            return JSON.parse(tx.residentSnapshot);
        } catch {
            return {};
        }
    }
    return tx.residentSnapshot;
}

function getAdditionalData(tx: any): any {
    if (!tx?.additionalData) return {};
    if (typeof tx.additionalData === "string") {
        try {
            return JSON.parse(tx.additionalData);
        } catch {
            return {};
        }
    }
    return tx.additionalData;
}

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric"
    });
}

function formatFullDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function parseOrderItems(ordersText: string) {
    if (!ordersText) return [];
    return ordersText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            const cleanText = line.replace(/^[•\-\*\s]+/, "").trim();
            const isOutOfStock = cleanText.toLowerCase().includes("out of stock");
            const isExternal = cleanText.toLowerCase().includes("external purchase");

            let extractedQty: string | null = null;
            const qtyMatch = cleanText.match(/\b(\d+)\s*(pcs|pc|tabs|tab|caps|cap|boxes|box|capsules|capsule|units|unit|bottles|bottle)?\b/i);
            if (qtyMatch) {
                extractedQty = `${qtyMatch[1]} ${qtyMatch[2] || "pcs"}`;
            }

            return {
                text: cleanText,
                dispensedQty: extractedQty,
                isOutOfStock,
                isExternal
            };
        });
}

export default function PurchaseOrderDetail() {
    let themeColor = "var(--primary-theme, #2563eb)";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {
        // fallback
    }

    const router = useRouter();
    const { id } = useParams();
    const [tx, setTx] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPO() {
            try {
                const res: any = await getRHUPurchaseOrders({ page: 1, limit: 1000, search: "", status: "ALL" });
                if (res?.success && res?.data) {
                    const found = res.data.find((t: any) => t.id === id);
                    if (found) {
                        setTx(found);
                    } else {
                        throw new Error("Dispense record not found");
                    }
                } else {
                    throw new Error(res?.error || "Failed to load dispense records");
                }
            } catch (err: any) {
                toast.error(err.message || "Error loading dispense record");
                router.back();
            } finally {
                setLoading(false);
            }
        }
        if (id) {
            fetchPO();
        }
    }, [id, router]);

    const handlePrint = () => {
        window.print();
    };

    const handleExportPDF = async () => {
        if (!tx) return;
        try {
            const resident = getResidentSnapshot(tx);
            const addData = getAdditionalData(tx);
            const controlNo = tx.controlNumber || tx.id.slice(0, 8).toUpperCase();
            const patientName = resident.firstName ? `${resident.firstName} ${resident.lastName}` : tx.user?.name || "N/A";
            const dispenseInfo = addData.dispenseInfo || {};
            const dispenserName = dispenseInfo.dispensedBy || addData.dispensedBy || "RHU Pharmacy Personnel";

            let orders = "";
            if (dispenseInfo.items && Array.isArray(dispenseInfo.items) && dispenseInfo.items.length > 0) {
                orders = dispenseInfo.items.map((i: any) => `• ${i.name} — Actual Dispensed: ${i.quantity} ${i.unit || "pcs"}`).join("\n");
            } else if (dispenseInfo.summaryText) {
                orders = dispenseInfo.summaryText;
            } else {
                orders = addData.deos?.orders || addData.deos?.diagnosis || "Prescription Encoded";
            }

            const { default: jsPDF } = await import("jspdf");
            const doc = new jsPDF();

            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text("LOCAL GOVERNMENT UNIT — RHU PHARMACY", 14, 20);

            doc.setFontSize(11);
            doc.setFont("helvetica", "normal");
            doc.text(`MEDICINE DISPENSE VOUCHER (#${controlNo})`, 14, 28);
            doc.text(`Patient Name: ${patientName}`, 14, 36);
            doc.text(`Barangay: ${resident.barangay || "{{BARANGAY_NAME}}"}`, 14, 44);
            doc.text(`Dispensing Pharmacy / Center: ${healthCenterName}`, 14, 52);
            doc.text(`Dispensed By Pharmacist: ${dispenserName}`, 14, 60);
            doc.text(`Date Issued / Dispensed: ${formatFullDateTime(dispenseInfo.dispensedAt || tx.updatedAt)}`, 14, 68);

            doc.setFont("helvetica", "bold");
            doc.text("Prescribed & Actual Pharmacy Dispensed Items:", 14, 80);

            doc.setFont("helvetica", "normal");
            const lines = doc.splitTextToSize(orders, 180);
            doc.text(lines, 14, 88);

            doc.save(`Dispense_Voucher_${controlNo}.pdf`);
            toast.success("Dispense Voucher exported successfully!");
        } catch (err) {
            console.error("PDF export error:", err);
            toast.error("Failed to generate PDF voucher.");
        }
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen p-4 md:p-6 space-y-6 animate-pulse">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-36 rounded-2xl" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-28 rounded-2xl" />
                        <Skeleton className="h-10 w-28 rounded-2xl" />
                    </div>
                </div>
                <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
        );
    }

    if (!tx) return null;

    const resident = getResidentSnapshot(tx);
    const addData = getAdditionalData(tx);
    const controlNo = tx.controlNumber || tx.id.slice(0, 8).toUpperCase();
    const patientName = resident.firstName ? `${resident.firstName} ${resident.lastName}` : tx.user?.name || "N/A";
    const dispenseInfo = addData.dispenseInfo || {};
    const rawOrdersText = addData.deos?.orders || addData.deos?.diagnosis || "No items prescribed.";
    const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
    const parsedOriginalItems = parseOrderItems(addData.deos?.orders || addData.deos?.diagnosis || "No items prescribed.");
    const isPharmacyActionFinalized = !!addData.poDispensedByPharmacy || rhuStatus === "COMPLETED" || rhuStatus === "DISPENSED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
    
    const itemsList = isPharmacyActionFinalized
        ? parsedOriginalItems.map((originalItem: any) => {
            const matchingDispensed = dispenseInfo.items?.find((i: any) => {
                const nameLower = (i.name || "").toLowerCase();
                const textLower = originalItem.text.toLowerCase();
                return textLower.includes(nameLower) || nameLower.includes(textLower) || 
                       (nameLower.split(" ")[0].length > 2 && textLower.includes(nameLower.split(" ")[0]));
            });
            
            if (matchingDispensed) {
                return {
                    text: originalItem.text,
                    dispensedQty: `${matchingDispensed.quantity} ${matchingDispensed.unit || "pcs"}`,
                    isOutOfStock: false
                };
            } else {
                return {
                    text: originalItem.text,
                    dispensedQty: null,
                    isOutOfStock: true
                };
            }
        })
        : parsedOriginalItems;
    const healthCenterName = addData.healthCenterName || "RHU Main Dispensary";

    const isCompleted = rhuStatus === "COMPLETED" || tx.status === "RELEASED" || tx.status === "DELIVERED";
    const isApproved = rhuStatus === "PO_APPROVED" || tx.status === "FOR_CLAIM" || rhuStatus === "DISPENSED";
    const isCancelled = tx.isCancelled || rhuStatus === "CANCELLED" || tx.status === "REJECTED";

    let statusLabel = "PENDING PO APPROVAL";
    let statusBg = "bg-amber-500/10 text-amber-500 border-amber-500/20";
    if (isCompleted) {
        statusLabel = "COMPLETED & DISPENSED";
        statusBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    } else if (isApproved) {
        statusLabel = "APPROVED — READY TO DISPENSE";
        statusBg = "bg-teal-500/10 text-teal-400 border-teal-500/30";
    } else if (isCancelled) {
        statusLabel = "CANCELLED / REJECTED";
        statusBg = "bg-rose-500/10 text-rose-400 border-rose-500/30";
    }

    // Dispensing Pharmacy & Officer Tracking Info
    const dispenserName = dispenseInfo.dispensedBy || addData.dispensedBy || (isCompleted ? "RHU Pharmacy Personnel" : "Awaiting Dispensing");
    const dispenserEmail = dispenseInfo.dispensedByEmail || (isCompleted ? lguConfig.seedAccounts.rhuEmail : null);
    const dispenserRole = dispenseInfo.dispensedByRole || "RHU_PHARMACY";
    const dispensedTime = formatFullDateTime(dispenseInfo.dispensedAt || addData.dispensedAt || tx.updatedAt);

    return (
        <div className="w-full min-h-screen p-2 sm:p-4 md:p-6 space-y-6 text-slate-900 dark:text-slate-100 animate-in fade-in duration-500">
            {/* Top Navigation & Action Toolbar (Hidden when printing) */}
            <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
                <Button
                    variant="outline"
                    onClick={() => router.push("/admin/rhu/purchase-orders")}
                    className="h-10 px-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dispense
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={handlePrint}
                        className="h-10 px-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 shadow-sm"
                    >
                        <Printer className="w-3.5 h-3.5" style={{ color: themeColor }} /> Print Slip
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportPDF}
                        className="h-10 px-4 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-2 shadow-sm"
                    >
                        <FileText className="w-3.5 h-3.5 text-rose-500" /> Export PDF
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/admin/rhu/${tx.id}`)}
                        className="h-10 px-4 rounded-2xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 font-medium text-xs flex items-center gap-1.5"
                    >
                        <ExternalLink className="w-3.5 h-3.5" /> Full Consultation
                    </Button>
                </div>
            </div>

            {/* Main PO Voucher Document Card */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/90 shadow-xl p-6 sm:p-10 space-y-8 text-slate-900 dark:text-slate-100 print:p-0 print:border-none print:bg-white print:text-slate-900 print:shadow-none">
                
                {/* Decorative Accent Glow */}
                <div 
                    className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-10 dark:opacity-20 print:hidden"
                    style={{ backgroundColor: themeColor }}
                />

                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800/80 print:border-slate-300">
                    <div className="flex items-center gap-4">
                        <div 
                            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md print:bg-slate-100 print:border-slate-400 text-white font-black"
                            style={{
                                backgroundColor: themeColor,
                                boxShadow: `0 8px 20px -4px ${themeColor}40`
                            }}
                        >
                            <Pill className="w-7 h-7" />
                        </div>
                        <div>
                            <span 
                                className="text-[11px] font-extrabold uppercase tracking-widest print:text-slate-600 flex items-center gap-1.5"
                                style={{ color: themeColor }}
                            >
                                <Building2 className="w-3.5 h-3.5" /> Local Government Unit • RHU Pharmacy
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white print:text-slate-900 mt-0.5">
                                Prescription Medicine Dispense Slip
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                                Official Dispensing Summary & Dispenser Verification Record
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 print:bg-slate-100 print:border-slate-300">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 print:text-slate-600">Ref / Dispense #</span>
                            <span className="font-mono text-sm font-black tracking-wider" style={{ color: themeColor }}>#{controlNo}</span>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${statusBg} print:border-slate-400 print:text-slate-800`}>
                            <CheckCircle2 className="w-3.5 h-3.5" /> {statusLabel}
                        </span>
                    </div>
                </div>

                {/* 3-Column Info Cards: Patient Profile, Facility Info, & Pharmacy Dispenser Tracking */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Card 1: Patient Card */}
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-5 space-y-3 print:bg-slate-50 print:border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-400 print:text-slate-700 uppercase tracking-wider">
                            <User className="w-4 h-4 text-teal-400" /> Patient Details
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-base font-extrabold text-white print:text-slate-900">{patientName}</h2>
                            <div className="flex items-center gap-2 text-xs text-slate-400 print:text-slate-600">
                                <span>For: <strong className="text-slate-200 print:text-slate-800 font-semibold">{resident.relationship || "Self"}</strong></span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-slate-400" /> Brgy. {resident.barangay || "{{BARANGAY_NAME}}"}
                                </span>
                            </div>
                            {resident.contactNumber && (
                                <p className="text-xs text-slate-400 print:text-slate-600">Contact: {resident.contactNumber}</p>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Facility & Appointment Info */}
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-5 space-y-3 print:bg-slate-50 print:border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-teal-400 print:text-slate-700 uppercase tracking-wider">
                            <Calendar className="w-4 h-4 text-teal-400" /> Facility & Appointment
                        </div>
                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200">
                                <span className="text-slate-400 print:text-slate-600">Dispensing Center:</span>
                                <span className="font-bold text-slate-200 print:text-slate-900">{healthCenterName}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-slate-800/60 print:border-slate-200">
                                <span className="text-slate-400 print:text-slate-600">Appt Date:</span>
                                <span className="font-bold text-slate-200 print:text-slate-900">{formatDateTime(tx.appointmentDate)}</span>
                            </div>
                            <div className="flex justify-between py-1">
                                <span className="text-slate-400 print:text-slate-600">Slot:</span>
                                <span className="font-mono text-slate-300 font-semibold print:text-slate-900">{tx.appointmentSlot || "Regular Slot"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Pharmacy Dispenser Tracking */}
                    <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-5 space-y-3 print:bg-slate-50 print:border-slate-200">
                        <div className="flex items-center justify-between text-xs font-bold text-teal-300 print:text-slate-700 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4 text-teal-400" /> Dispensed By (Pharmacy)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                                {dispenserRole}
                            </span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-white print:text-slate-900 leading-tight">
                                {dispenserName}
                            </h3>
                            {dispenserEmail && (
                                <p className="text-[11px] font-mono text-slate-400 print:text-slate-600">
                                    {dispenserEmail}
                                </p>
                            )}
                            <div className="pt-1.5 flex items-center gap-1 text-[11px] text-teal-400 print:text-slate-700 font-medium">
                                <Clock className="w-3 h-3" /> Dispensed: {dispensedTime}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Prescribed Items & Purchased Medicines Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 print:text-slate-900 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-teal-400" /> Prescribed Medicines & Actual Dispensed Items
                        </h3>
                        <span className="text-[11px] font-mono text-slate-400 print:text-slate-600">
                            Total Items Listed: {itemsList.length}
                        </span>
                    </div>

                    <div className="rounded-2xl border border-slate-800/80 overflow-hidden bg-slate-950/60 print:bg-white print:border-slate-300">
                        {itemsList.length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-400 print:text-slate-600">
                                {rawOrdersText}
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-800/80 print:divide-slate-200">
                                {itemsList.map((item: any, idx: number) => {
                                    const qtyText = item.dispensedQty;
                                    return (
                                        <div key={idx} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-900/40 transition-colors print:hover:bg-transparent">
                                            <div className="flex items-start gap-3">
                                                <div className="mt-0.5 w-6 h-6 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center flex-shrink-0 print:bg-slate-100">
                                                    <Pill className="w-3.5 h-3.5 text-teal-400 print:text-slate-700" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-sm font-bold text-slate-100 print:text-slate-900 leading-snug">
                                                        {item.text}
                                                    </p>
                                                    {qtyText ? (
                                                        <div className="flex items-center gap-2 pt-0.5">
                                                            <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/30 print:text-slate-900 print:bg-slate-100">
                                                                Actual Pharmacy Dispensed Qty: <span className="text-white font-extrabold print:text-slate-900">{typeof qtyText === 'string' ? qtyText : `${qtyText} pcs`}</span>
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 print:text-slate-600">
                                                            Prescribed item #{idx + 1}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {item.isOutOfStock ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/30 whitespace-nowrap">
                                                    <AlertTriangle className="w-3 h-3" /> OUT OF STOCK / EXTERNAL
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                                                    <Check className="w-3 h-3" /> DISPENSED BY PHARMACY
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Additional Clinical Notes if available */}
                {addData.deos?.diagnosis && (
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 space-y-1.5 print:bg-slate-50 print:border-slate-200">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 print:text-slate-600">
                            Attending Doctor&apos;s Diagnosis & Notes
                        </span>
                        <p className="text-xs text-slate-300 print:text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {addData.deos.diagnosis}
                        </p>
                    </div>
                )}

                {/* Verification Footer & Signatures Block */}
                <div className="pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-8 print:border-slate-300">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-xs text-slate-400 print:text-slate-600">
                            <ShieldCheck className="w-4 h-4 text-teal-400" /> Authorized RHU Medicine Dispense Voucher
                        </div>
                        <div className="pt-6 border-b border-slate-700/60 w-48 print:border-slate-400" />
                        <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
                            Attending RHU Physician Signature
                        </p>
                    </div>

                    <div className="space-y-6 sm:text-right">
                        <div className="flex items-center sm:justify-end gap-2 text-xs text-slate-400 print:text-slate-600">
                            Dispensing Officer: <strong className="text-slate-200 print:text-slate-800">{dispenserName}</strong>
                        </div>
                        <div className="pt-6 border-b border-slate-700/60 w-48 sm:ml-auto print:border-slate-400" />
                        <p className="text-[10px] uppercase font-bold text-slate-400 print:text-slate-600">
                            RHU Pharmacist / Dispensing Officer Signature
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}
