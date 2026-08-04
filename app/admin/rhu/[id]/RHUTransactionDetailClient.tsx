"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, CheckCircle2, XCircle, Printer,
    Activity, Stethoscope, ClipboardList,
    ZoomIn, ZoomOut, RotateCw, Eye, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateRHUAppointmentStatus } from "../actions";

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function calculateBMI(heightCm?: string | number, weightKg?: string | number) {
    const h = parseFloat(String(heightCm || ""));
    const w = parseFloat(String(weightKg || ""));
    if (!h || !w || h <= 0 || w <= 0) return null;
    const heightM = h / 100;
    const bmiVal = w / (heightM * heightM);
    const bmiStr = bmiVal.toFixed(1);

    let category = "Normal weight";
    let badgeClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (bmiVal < 18.5) {
        category = "Underweight";
        badgeClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    } else if (bmiVal <= 24.9) {
        category = "Normal weight";
        badgeClass = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    } else if (bmiVal <= 29.9) {
        category = "Overweight";
        badgeClass = "text-orange-500 bg-orange-500/10 border-orange-500/20";
    } else {
        category = "Obese";
        badgeClass = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    }
    return { bmi: bmiStr, category, badgeClass };
}

function evaluateTemperature(temp?: string | number) {
    const t = parseFloat(String(temp || ""));
    if (isNaN(t) || t <= 0) return null;
    if (t < 36.5) return { category: "Low Temp", isCritical: false, isWarning: true, badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (t <= 37.5) return { category: "Normal Temp", isCritical: false, isWarning: false, badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    if (t <= 37.9) return { category: "Low Fever", isCritical: false, isWarning: true, badgeClass: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    return { category: "High Fever ⚠️", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/20 border-rose-500/40 animate-pulse" };
}

function evaluateBloodPressure(bpStr?: string, sysStr?: string | number, diaStr?: string | number) {
    let sys = parseFloat(String(sysStr || ""));
    let dia = parseFloat(String(diaStr || ""));
    if ((isNaN(sys) || isNaN(dia)) && bpStr && bpStr.includes("/")) {
        const parts = bpStr.split("/");
        sys = parseFloat(parts[0]);
        dia = parseFloat(parts[1]);
    }
    if (isNaN(sys) || isNaN(dia) || sys <= 0 || dia <= 0) return null;

    if (sys > 180 || dia > 120) return { category: "Crisis 🚨", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/20 border-rose-500/50 animate-pulse" };
    if (sys >= 140 || dia >= 90) return { category: "Stage 2 HTN ⚠️", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/15 border-rose-500/30" };
    if (sys >= 130 || dia >= 80) return { category: "Stage 1 HTN", isCritical: false, isWarning: true, badgeClass: "text-orange-400 bg-orange-500/10 border-orange-500/20" };
    if (sys >= 120 && dia < 80) return { category: "Elevated BP", isCritical: false, isWarning: true, badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    return { category: "Normal BP", isCritical: false, isWarning: false, badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
}

function evaluatePulseRate(pulse?: string | number) {
    const p = parseFloat(String(pulse || ""));
    if (isNaN(p) || p <= 0) return null;
    if (p < 60) return { category: "Bradycardia", isCritical: false, isWarning: true, badgeClass: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    if (p <= 100) return { category: "Normal Rate", isCritical: false, isWarning: false, badgeClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
    return { category: "Tachycardia ⚠️", isCritical: true, isWarning: true, badgeClass: "text-rose-400 bg-rose-500/15 border-rose-500/30" };
}


function getResidentSnapshot(tx: any): any {
    if (!tx?.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === 'string') {
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
    if (typeof tx.additionalData === 'string') {
        try {
            return JSON.parse(tx.additionalData);
        } catch {
            return {};
        }
    }
    return tx.additionalData;
}

export default function RHUTransactionDetailClient({ transaction }: { transaction: any }) {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    // Cancel modal state
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [cancelRemarks, setCancelRemarks] = useState("");

    // Referral modal state
    const [referralModalOpen, setReferralModalOpen] = useState(false);
    const [referralFacility, setReferralFacility] = useState("");
    const [referralReason, setReferralReason] = useState("");

    // Lightbox image viewer state
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [rotateAngle, setRotateAngle] = useState(0);

    // Vitals Check-In modal state
    const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
    const [vitals, setVitals] = useState({
        height: "",
        weight: "",
        systolic: "",
        diastolic: "",
        temperature: "",
        pulseRate: "",
        philhealthNumber: "",
        konsultationNumber: "",
    });
    const [vitalsErrors, setVitalsErrors] = useState<Record<string, boolean>>({});

    // Doctor's Clinical Notes (DEOS) modal state
    const [deosModalOpen, setDeosModalOpen] = useState(false);
    const [deos, setDeos] = useState({
        diagnosis: "",
        examinationFindings: "",
        orders: "",
        status: "",
    });
    const [deosErrors, setDeosErrors] = useState<Record<string, boolean>>({});

    // Vaccine batch encoder state
    const [vaccines, setVaccines] = useState([{
        name: "", batchNumber: "", doseNumber: "", dateAdministered: "", site: ""
    }]);

    // Active console tab
    const [activeTab, setActiveTab] = useState<"deos" | "vaccine" | "rx">("deos");

    // Prescription / referral inline state
    const [rxText, setRxText] = useState("");

    const resident = getResidentSnapshot(transaction);
    const addData = getAdditionalData(transaction);

    const patientName = resident.firstName
        ? `${resident.firstName} ${resident.middleName ? resident.middleName + ' ' : ''}${resident.lastName}`
        : transaction.user?.name || "N/A";

    const isPriority = addData.isPriorityLane;
    const checkupDisplay = addData.checkupType === "OTHER"
        ? addData.customCheckupType || "Custom Check-up"
        : addData.checkupType || transaction.type?.name || "General Consultation";

    // Attachments
    const attachments: string[] = [];
    if (addData.attachments && Array.isArray(addData.attachments)) {
        attachments.push(...addData.attachments);
    }
    if (addData.idPhotoUrl) attachments.push(addData.idPhotoUrl);
    if (addData.medicalRecordUrl) attachments.push(addData.medicalRecordUrl);
    if (transaction.attachments && Array.isArray(transaction.attachments)) {
        attachments.push(...transaction.attachments);
    }

    const handleUpdateStatus = async (
        newStatus: string,
        remarks?: string,
        refData?: { facility?: string; reason?: string },
        vitalsData?: typeof vitals,
        deosData?: typeof deos
    ) => {
        setSubmitting(true);
        try {
            const res = await updateRHUAppointmentStatus(transaction.id, newStatus, remarks, refData, vitalsData, deosData);
            if (res.success) {
                toast.success(`Appointment status updated to ${newStatus.replace(/_/g, " ")}`);
                setCancelModalOpen(false);
                setReferralModalOpen(false);
                setVitalsModalOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch {
            toast.error("Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmCheckIn = () => {
        const errors: Record<string, boolean> = {};
        if (!vitals.height.trim()) errors.height = true;
        if (!vitals.weight.trim()) errors.weight = true;
        if (!vitals.systolic.trim()) errors.systolic = true;
        if (!vitals.diastolic.trim()) errors.diastolic = true;
        if (!vitals.temperature.trim()) errors.temperature = true;
        if (!vitals.pulseRate.trim()) errors.pulseRate = true;
        if (Object.keys(errors).length > 0) {
            setVitalsErrors(errors);
            toast.error("Please fill in all required vitals fields.");
            return;
        }
        setVitalsErrors({});
        handleUpdateStatus("CHECK_IN", undefined, undefined, vitals);
    };

    const handleConfirmPrescription = () => {
        const errors: Record<string, boolean> = {};
        if (!deos.diagnosis.trim()) errors.diagnosis = true;
        if (!deos.examinationFindings.trim()) errors.examinationFindings = true;
        if (!deos.orders.trim()) errors.orders = true;
        if (Object.keys(errors).length > 0) {
            setDeosErrors(errors);
            toast.error("Please fill in all required clinical notes.");
            return;
        }
        setDeosErrors({});
        handleUpdateStatus("PRESCRIBED", undefined, undefined, undefined, deos);
    };

    const effectiveStatus = addData?.rhuStatus || (
        transaction.isCancelled || transaction.status === "REJECTED" ? "CANCELLED" :
        transaction.status === "FOR_CLAIM" ? "PRESCRIBED" :
        transaction.status === "FOR_PROCESSING" ? "IN_CONSULTATION" :
        transaction.status === "EVALUATED" ? "CHECK_IN" :
        transaction.status === "RELEASED" || transaction.status === "DELIVERED" ? "COMPLETED" :
        "APPOINTMENT_BOOKED"
    );

    // Calculate progress step for status tracker (1 to 5)
    let currentStep = 1; // APPOINTMENT_BOOKED
    if (effectiveStatus === "CHECK_IN" || transaction.status === "EVALUATED") currentStep = 2;
    if (effectiveStatus === "IN_CONSULTATION" || transaction.status === "FOR_PROCESSING") currentStep = 3;
    if (effectiveStatus === "PRESCRIBED" || transaction.status === "FOR_CLAIM") currentStep = 4;
    if (effectiveStatus === "COMPLETED" || transaction.status === "RELEASED") currentStep = 5;
    if (effectiveStatus === "REFERRED") currentStep = 6;
    if (transaction.isCancelled || effectiveStatus === "CANCELLED" || transaction.status === "REJECTED") currentStep = 0;

    const getStatusPill = () => {
        if (transaction.isCancelled || effectiveStatus === "CANCELLED" || transaction.status === "REJECTED") {
            return (
                <span className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                    CANCELLED
                </span>
            );
        }
        switch (effectiveStatus) {
            case "APPOINTMENT_BOOKED":
            case "FOR_REQUESTING":
            case "FOR_INSPECTION":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-sky-500 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        APPOINTMENT BOOKED
                    </span>
                );
            case "CHECK_IN":
            case "EVALUATED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-indigo-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        CHECKED IN
                    </span>
                );
            case "IN_CONSULTATION":
            case "FOR_PROCESSING":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md animate-pulse">
                        IN CONSULTATION
                    </span>
                );
            case "PRESCRIBED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        PRESCRIBED
                    </span>
                );
            case "REFERRED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-fuchsia-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        REFERRED
                    </span>
                );
            case "COMPLETED":
            case "RELEASED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-emerald-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        COMPLETED
                    </span>
                );
            default:
                return (
                    <span className="px-4 py-1.5 rounded-full bg-slate-700 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        {transaction.status.replace(/_/g, " ")}
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6 pb-20 w-full">
            {/* Top Navigation Row (matching Registrar Image 2) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <Button
                    variant="ghost"
                    onClick={() => router.push("/admin/rhu/consultations")}
                    className="h-10 px-0 hover:bg-transparent text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to RHU Consultations
                </Button>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-800/60 dark:bg-white/5 border border-slate-700/50 dark:border-white/10 px-3 py-1.5 rounded-xl">
                        ID: {transaction.controlNumber || transaction.id}
                    </span>
                    {getStatusPill()}
                </div>
            </div>

            {/* 2-Column Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">

                {/* LEFT COLUMN: Main Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Transaction Header Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 md:p-8 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                <Activity className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic">
                                    TRANSACTION INFORMATION
                                </p>
                                <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                    {checkupDisplay}
                                </h1>
                            </div>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-11">
                            RURAL HEALTH UNIT • MEDICAL CONSULTATION
                        </p>
                    </Card>

                    {/* Patient Profile & Record Details Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 md:p-8 space-y-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic mb-1">
                                PATIENT / APPLICANT NAME
                            </p>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                {patientName}
                            </h2>
                        </div>

                        {/* 4-Grid Sub-cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    RELATIONSHIP
                                </p>
                                <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 italic">
                                    {addData.relationship || "SELF"}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    GENDER
                                </p>
                                <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 italic">
                                    {resident.gender || "MALE"}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    BARANGAY
                                </p>
                                <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 italic">
                                    {resident.barangay || "MAPANDAN"}
                                </p>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 space-y-1">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    PRIORITY
                                </p>
                                <p className="text-xs font-black uppercase text-rose-500 italic">
                                    {isPriority ? "PRIORITY LANE" : "REGULAR"}
                                </p>
                            </div>
                        </div>

                        {/* Clinical Symptoms & Schedule Breakdown */}
                        <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-2">
                                    APPOINTMENT DATE & TIME SLOT
                                </p>
                                <p className="text-sm font-black text-rose-500 font-mono italic">
                                    {formatDateTime(transaction.appointmentDate)} • {transaction.appointmentSlot || "08:00 AM - 11:00 AM"}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic mb-2">
                                    CHIEF SYMPTOMS / PURPOSE / NOTES
                                </p>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {addData.symptomsPurpose || addData.purpose || "No additional clinical notes provided."}
                                </div>
                            </div>

                            {/* Referral Info if Referred */}
                            {transaction.status === "REFERRED" && (
                                <div className="p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-xs space-y-1 text-fuchsia-700 dark:text-fuchsia-300">
                                    <p className="font-black uppercase tracking-wider text-[10px]">PATIENT REFERRAL DETAILS</p>
                                    <p className="font-bold">Referred Facility: {addData.referralFacility || "Specialty Hospital / Facility"}</p>
                                    {addData.referralReason && <p className="text-[11px] opacity-90">Reason: {addData.referralReason}</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4 text-xs font-bold pt-2">
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Date of Birth</span>
                                    <span className="text-slate-800 dark:text-slate-200">{resident.dateOfBirth ? formatDateTime(resident.dateOfBirth) : "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Contact Number</span>
                                    <span className="text-slate-800 dark:text-slate-200">{resident.contactNumber || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Attachments if present */}
                        {attachments.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 italic">
                                    ATTACHED MEDICAL RECORDS / ID PHOTOS ({attachments.length})
                                </p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {attachments.map((url, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => {
                                                setPreviewImage(url);
                                                setZoomScale(1);
                                                setRotateAngle(0);
                                            }}
                                            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 aspect-video flex items-center justify-center"
                                        >
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={url}
                                                alt={`Attachment ${idx + 1}`}
                                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Eye className="w-5 h-5 text-white" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Patient Vitals Card (visible after check-in) */}
                    {addData.vitals && (
                        <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm overflow-hidden">
                            <div className="bg-slate-900 dark:bg-[#1c222d] px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-white/10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                        <Activity className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 italic">PATIENT VITALS</p>
                                        <p className="text-xs font-black text-white uppercase tracking-wide">Recorded at Check-In</p>
                                    </div>
                                </div>
                                {addData.checkedInAt && (
                                    <span className="text-[9px] font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-xl">
                                        {new Date(addData.checkedInAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                )}
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Critical Vitals Alert Banner */}
                                {(() => {
                                    const alerts: string[] = [];
                                    const tempEval = evaluateTemperature(addData.vitals.temperature);
                                    const bpEval = evaluateBloodPressure(addData.vitals.bloodPressure, addData.vitals.systolic, addData.vitals.diastolic);
                                    const pulseEval = evaluatePulseRate(addData.vitals.pulseRate);

                                    if (tempEval?.isCritical) alerts.push(`High Fever (${addData.vitals.temperature}°C)`);
                                    if (bpEval?.isCritical) alerts.push(`Hypertension (${addData.vitals.bloodPressure} mmHg - ${bpEval.category})`);
                                    if (pulseEval?.isCritical) alerts.push(`Abnormal Pulse (${addData.vitals.pulseRate} bpm - ${pulseEval.category})`);

                                    if (alerts.length === 0) return null;

                                    return (
                                        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-400">
                                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse text-rose-500" />
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black uppercase tracking-wider text-rose-500">Critical Clinical Warning Detected</p>
                                                <p className="text-xs font-medium text-rose-300">
                                                    Patient presents abnormal vital signs: <span className="font-bold text-white">{alerts.join(" • ")}</span>. Immediate doctor evaluation recommended.
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {/* Height */}
                                    {addData.vitals.height && (
                                        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Height</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.height} cm</p>
                                        </div>
                                    )}

                                    {/* Weight */}
                                    {addData.vitals.weight && (
                                        <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Weight</p>
                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.weight} kg</p>
                                        </div>
                                    )}

                                    {/* BMI with Badge */}
                                    {(() => {
                                        const bmiInfo = calculateBMI(addData.vitals.height, addData.vitals.weight);
                                        const bmiVal = addData.vitals.bmi || bmiInfo?.bmi;
                                        const bmiCat = addData.vitals.bmiCategory || bmiInfo?.category;
                                        if (!bmiVal) return null;
                                        const badgeClass = bmiInfo?.badgeClass || "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                                        return (
                                            <div className="p-4 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">BMI</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{bmiVal} <span className="text-[10px] font-medium text-slate-400">kg/m²</span></p>
                                                    {bmiCat && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${badgeClass}`}>
                                                            {bmiCat}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Blood Pressure */}
                                    {addData.vitals.bloodPressure && (() => {
                                        const bpEval = evaluateBloodPressure(addData.vitals.bloodPressure, addData.vitals.systolic, addData.vitals.diastolic);
                                        return (
                                            <div className={`p-4 bg-slate-50 dark:bg-white/[0.03] border rounded-2xl space-y-1 transition-all ${bpEval?.isCritical ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-100 dark:border-white/5'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Blood Pressure</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.bloodPressure} <span className="text-[10px] font-medium text-slate-400">mmHg</span></p>
                                                    {bpEval && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${bpEval.badgeClass}`}>
                                                            {bpEval.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Temperature */}
                                    {addData.vitals.temperature && (() => {
                                        const tempEval = evaluateTemperature(addData.vitals.temperature);
                                        return (
                                            <div className={`p-4 bg-slate-50 dark:bg-white/[0.03] border rounded-2xl space-y-1 transition-all ${tempEval?.isCritical ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-100 dark:border-white/5'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Temperature</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.temperature} <span className="text-[10px] font-medium text-slate-400">°C</span></p>
                                                    {tempEval && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${tempEval.badgeClass}`}>
                                                            {tempEval.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Pulse Rate */}
                                    {addData.vitals.pulseRate && (() => {
                                        const pulseEval = evaluatePulseRate(addData.vitals.pulseRate);
                                        return (
                                            <div className={`p-4 bg-slate-50 dark:bg-white/[0.03] border rounded-2xl space-y-1 transition-all ${pulseEval?.isCritical ? 'border-rose-500/40 bg-rose-500/5' : 'border-slate-100 dark:border-white/5'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Pulse Rate</p>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase">{addData.vitals.pulseRate} <span className="text-[10px] font-medium text-slate-400">bpm</span></p>
                                                    {pulseEval && (
                                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg border ${pulseEval.badgeClass}`}>
                                                            {pulseEval.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* PhilHealth & Konsultation Sub-section */}
                                {(addData.vitals.philhealthNumber || addData.vitals.konsultationNumber) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                        {addData.vitals.philhealthNumber && (
                                            <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">PhilHealth Number</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white">{addData.vitals.philhealthNumber}</p>
                                            </div>
                                        )}
                                        {addData.vitals.konsultationNumber && (
                                            <div className="p-3.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-0.5">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Konsultation No.</p>
                                                <p className="text-xs font-black text-slate-800 dark:text-white">{addData.vitals.konsultationNumber}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}

                    {/* Doctor's Clinical Notes Card (visible after PRESCRIBED) */}
                    {addData.deos && (
                        <Card className="rounded-3xl border border-teal-500/20 dark:border-teal-500/10 bg-gradient-to-b from-slate-500/5 via-white dark:via-[#151922] to-slate-500/5 dark:to-[#0e1219] shadow-xl overflow-hidden backdrop-blur-md">
                            <div className="relative border-b border-teal-500/20 px-6 py-5 flex items-center gap-4 bg-teal-500/5">
                                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-teal-500/50 via-teal-500/10 to-transparent" />
                                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0 shadow-inner">
                                    <ClipboardList className="w-5 h-5 text-teal-500" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-teal-500/80">Clinical Notes & Orders</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight italic">Doctor&apos;s Consultation Record (DEOS)</p>
                                </div>
                                {addData.prescribedAt && (
                                    <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-full px-3 py-1 shadow-sm">
                                        {new Date(addData.prescribedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                                    </span>
                                )}
                            </div>
                            <div className="p-6 space-y-4">
                                {addData.deos.diagnosis && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-teal-500/10 dark:bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500 shrink-0 font-mono font-black text-sm">
                                            D
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400">Diagnosis</p>
                                            <p className="text-sm font-black text-slate-950 dark:text-white whitespace-pre-wrap leading-relaxed tracking-tight">{addData.deos.diagnosis}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.deos.examinationFindings && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0 font-mono font-black text-sm">
                                            E
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Examination Findings</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{addData.deos.examinationFindings}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.deos.orders && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0 font-mono font-black text-sm">
                                            O
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Orders / Prescription</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{addData.deos.orders}</p>
                                        </div>
                                    </div>
                                )}
                                {addData.deos.status && (
                                    <div className="group relative p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 bg-slate-500/5 dark:bg-[#1a202c]/30 hover:border-teal-500/30 transition-all duration-300 shadow-sm flex gap-4">
                                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 dark:bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500 shrink-0 font-mono font-black text-sm">
                                            S
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Status / Notes</p>
                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{addData.deos.status}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* RIGHT COLUMN: Status Tracker & Action Panel */}
                <div className="space-y-6">

                    {/* Status Tracker Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">
                                RHU WORKFLOW PROGRESS
                            </h3>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                7-STAGE CONSULTATION LIFECYCLE
                            </p>
                        </div>

                        {/* Step Timeline */}
                        <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                            {[
                                { step: 1, title: "1. APPOINTMENT BOOKED" },
                                { step: 2, title: "2. PATIENT CHECK-IN" },
                                { step: 3, title: "3. IN CONSULTATION" },
                                { step: 4, title: "4. PRESCRIBED (PENDING PHARMACY)" },
                                { step: 5, title: "5. DISPENSED & COMPLETED" },
                            ].map((item) => {
                                const isPassed = currentStep >= item.step && currentStep !== 6 && currentStep !== 0;
                                const isCurrent = currentStep === item.step;
                                return (
                                    <div key={item.step} className="flex items-center gap-3 relative z-10">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            isPassed
                                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                : isCurrent
                                                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-4 ring-rose-500/20"
                                                    : "bg-slate-200 dark:bg-white/10 text-slate-400"
                                        }`}>
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-wider ${
                                                isPassed || isCurrent ? "text-slate-900 dark:text-white" : "text-slate-400"
                                            }`}>
                                                {item.title}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Action / Final Decision Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 text-center space-y-6">
                        {transaction.isCancelled || transaction.status === "CANCELLED" || transaction.status === "REJECTED" ? (
                            <div className="py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
                                    <XCircle className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-rose-500">
                                        APPOINTMENT CANCELLED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        CANCELLED / REJECTED
                                    </p>
                                </div>
                                {transaction.rejectionRemarks && (
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-left">
                                        {transaction.rejectionRemarks}
                                    </div>
                                )}
                            </div>
                        ) : transaction.status === "REFERRED" ? (
                            <div className="py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center mx-auto text-fuchsia-500">
                                    <Activity className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-fuchsia-600 dark:text-fuchsia-400">
                                        PATIENT REFERRED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        REFERRED TO HIGHER MEDICAL FACILITY
                                    </p>
                                </div>
                                <Button
                                    onClick={() => window.print()}
                                    className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    PRINT REFERRAL SLIP
                                </Button>
                            </div>
                        ) : transaction.status === "COMPLETED" || transaction.status === "RELEASED" ? (
                            <div className="py-6 space-y-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                        CONSULTATION COMPLETED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        RHU CLINICAL CARE FINALIZED
                                    </p>
                                </div>
                                <Button
                                    onClick={() => window.print()}
                                    className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    PRINT CONSULTATION SLIP
                                </Button>
                            </div>
                        ) : (
                            <div className="py-4 space-y-4">
                                <div className="space-y-1 text-left border-b border-slate-100 dark:border-white/5 pb-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        STAFF ACTIONS & NEXT STAGE
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Advance patient through the RHU consultation workflow
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {(transaction.status === "APPOINTMENT_BOOKED" || transaction.status === "FOR_REQUESTING" || transaction.status === "FOR_INSPECTION") && (
                                        <Button
                                            disabled={submitting}
                                            onClick={() => setVitalsModalOpen(true)}
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-md flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            CHECK IN PATIENT
                                        </Button>
                                    )}

                                    {(transaction.status === "CHECK_IN" || transaction.status === "EVALUATED") && (
                                        <Button
                                            disabled={submitting}
                                            onClick={() => setDeosModalOpen(true)}
                                            className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-md flex items-center justify-center gap-2"
                                        >
                                            <ClipboardList className="w-4 h-4" />
                                            START CONSULTATION
                                        </Button>
                                    )}

                                    {(transaction.status === "IN_CONSULTATION" || transaction.status === "FOR_PROCESSING") && (
                                        <Button
                                            disabled={submitting}
                                            onClick={handleConfirmPrescription}
                                            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-md flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" />
                                            ISSUE PRESCRIPTION / ORDERS
                                        </Button>
                                    )}

                                    {(transaction.status === "PRESCRIBED") && (
                                         <div className="space-y-3">
                                             <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-left space-y-0.5">
                                                 <p className="text-[9px] font-black uppercase tracking-widest text-amber-500">Consultation Completed</p>
                                                 <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                     Pending medicine collection at RHU Pharmacy.
                                                 </p>
                                             </div>
                                             <Button
                                                 disabled={submitting}
                                                 onClick={() => handleUpdateStatus("COMPLETED")}
                                                 className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-md flex items-center justify-center gap-2"
                                             >
                                                 <CheckCircle2 className="w-4 h-4" />
                                                 DISPENSE MEDICINE & COMPLETE
                                             </Button>
                                         </div>
                                     )}

                                    <div className="pt-2 grid grid-cols-2 gap-2">
                                        <Button
                                            disabled={submitting}
                                            onClick={() => setReferralModalOpen(true)}
                                            className="h-10 bg-fuchsia-600/90 hover:bg-fuchsia-700 text-white font-black italic uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-1"
                                        >
                                            <Activity className="w-3.5 h-3.5" />
                                            REFER PATIENT
                                        </Button>
                                        <Button
                                            disabled={submitting}
                                            onClick={() => setCancelModalOpen(true)}
                                            className="h-10 bg-rose-600/90 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-1"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                            CANCEL APPT
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Patient Vitals Check-In Dialog */}
            <Dialog open={vitalsModalOpen} onOpenChange={(open) => { setVitalsModalOpen(open); if (!open) setVitalsErrors({}); }}>
                <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] bg-white dark:bg-[#151922] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col">
                    {/* Modal Header */}
                    <div className="bg-slate-900 dark:bg-[#1c222d] px-8 py-6 border-b border-slate-100 dark:border-white/10 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                                <Stethoscope className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black italic uppercase tracking-tight text-white leading-none">
                                    Patient Check-In
                                </DialogTitle>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Record Vitals Before Consultation</p>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-white/[0.04] border border-white/10 rounded-2xl">
                            <p className="text-xs font-black text-white uppercase tracking-wide">{patientName}</p>
                            <p className="text-[10px] text-rose-400 uppercase tracking-widest font-bold mt-0.5">{checkupDisplay}</p>
                        </div>
                    </div>

                    <div className="px-8 py-6 space-y-5 overflow-y-auto flex-1 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                        {/* Height & Weight */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Anthropometric Measurements</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Height (cm) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 165"
                                        value={vitals.height}
                                        onChange={(e) => setVitals(p => ({ ...p, height: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.height ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.height && <p className="text-[10px] text-red-500 font-medium">Height is required.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Weight (kg) <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 60"
                                        value={vitals.weight}
                                        onChange={(e) => setVitals(p => ({ ...p, weight: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.weight ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.weight && <p className="text-[10px] text-red-500 font-medium">Weight is required.</p>}
                                </div>
                            </div>
                            {/* Live Calculated BMI */}
                            {(() => {
                                const bmiRes = calculateBMI(vitals.height, vitals.weight);
                                if (!bmiRes) return null;
                                return (
                                    <div className={`mt-3 p-3.5 rounded-2xl border flex items-center justify-between transition-all ${bmiRes.badgeClass}`}>
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black uppercase tracking-widest">Calculated BMI</p>
                                            <p className="text-sm font-black uppercase">{bmiRes.bmi} <span className="text-[10px] font-bold">kg/m²</span></p>
                                        </div>
                                        <span className="text-xs font-black uppercase px-3 py-1 rounded-xl bg-white/20 dark:bg-black/20">
                                            {bmiRes.category}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Blood Pressure */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blood Pressure (mmHg)</p>
                                {(() => {
                                    const bpRes = evaluateBloodPressure(undefined, vitals.systolic, vitals.diastolic);
                                    if (!bpRes) return null;
                                    return (
                                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-lg border ${bpRes.badgeClass}`}>
                                            {bpRes.category}
                                        </span>
                                    );
                                })()}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Systolic <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 120"
                                        value={vitals.systolic}
                                        onChange={(e) => setVitals(p => ({ ...p, systolic: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.systolic ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.systolic && <p className="text-[10px] text-red-500 font-medium">Systolic BP is required.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                        Diastolic <span className="text-rose-500">*</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 80"
                                        value={vitals.diastolic}
                                        onChange={(e) => setVitals(p => ({ ...p, diastolic: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.diastolic ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.diastolic && <p className="text-[10px] text-red-500 font-medium">Diastolic BP is required.</p>}
                                </div>
                            </div>
                        </div>

                        {/* Temperature & Pulse Rate */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Other Vitals</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                            Temperature (°C) <span className="text-rose-500">*</span>
                                        </Label>
                                        {(() => {
                                            const tRes = evaluateTemperature(vitals.temperature);
                                            if (!tRes) return null;
                                            return <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${tRes.badgeClass}`}>{tRes.category}</span>;
                                        })()}
                                    </div>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        placeholder="e.g. 36.5"
                                        value={vitals.temperature}
                                        onChange={(e) => setVitals(p => ({ ...p, temperature: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.temperature ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.temperature && <p className="text-[10px] text-red-500 font-medium">Temperature is required.</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                            Pulse Rate (bpm) <span className="text-rose-500">*</span>
                                        </Label>
                                        {(() => {
                                            const pRes = evaluatePulseRate(vitals.pulseRate);
                                            if (!pRes) return null;
                                            return <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${pRes.badgeClass}`}>{pRes.category}</span>;
                                        })()}
                                    </div>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 72"
                                        value={vitals.pulseRate}
                                        onChange={(e) => setVitals(p => ({ ...p, pulseRate: e.target.value }))}
                                        className={`h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border ${vitalsErrors.pulseRate ? "border-red-500 focus-visible:ring-red-500" : "border-slate-200 dark:border-white/10"}`}
                                    />
                                    {vitalsErrors.pulseRate && <p className="text-[10px] text-red-500 font-medium">Pulse rate is required.</p>}
                                </div>
                            </div>
                        </div>

                        {/* PhilHealth & Konsultation */}
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">PhilHealth / Konsultation</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">PhilHealth Number</Label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. 01-234567890-1"
                                        value={vitals.philhealthNumber}
                                        onChange={(e) => setVitals(p => ({ ...p, philhealthNumber: e.target.value }))}
                                        className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Konsultation No.</Label>
                                    <Input
                                        type="text"
                                        placeholder="e.g. KSL-2026-001"
                                        value={vitals.konsultationNumber}
                                        onChange={(e) => setVitals(p => ({ ...p, konsultationNumber: e.target.value }))}
                                        className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs border border-slate-200 dark:border-white/10"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex gap-2 justify-end px-8 py-5 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => { setVitalsModalOpen(false); setVitalsErrors({}); }}
                            className="h-11 px-6 rounded-xl text-xs font-bold uppercase text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={handleConfirmCheckIn}
                            className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            {submitting ? "Checking In..." : "Confirm Check-In"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Doctor Console Modal */}
            <Dialog open={deosModalOpen} onOpenChange={(open) => { setDeosModalOpen(open); if (!open) setDeosErrors({}); }}>
                <DialogContent className="sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[1300px] w-[95vw] max-h-[88vh] bg-[#0d1117] border border-slate-200/20 dark:border-white/10 rounded-3xl shadow-2xl p-0 overflow-hidden flex flex-col">
                    <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0 h-full overflow-hidden">
                        {/* LEFT PANEL: Patient Chronicles (4 cols) */}
                        <div className="md:col-span-4 bg-[#0d1117] border-r border-white/10 flex flex-col h-full min-h-0 overflow-hidden">
                            <div className="bg-amber-500/10 border-b border-amber-500/30 px-6 py-4 flex items-center gap-3 shrink-0">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                                    <Stethoscope className="w-4 h-4 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">PATIENT CHRONICLES</p>
                                    <p className="text-xs font-black text-white uppercase truncate max-w-[220px]">{patientName}</p>
                                </div>
                                <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">IN CONSULTATION</span>
                            </div>

                            <div className="overflow-y-auto flex-1 p-6 space-y-5 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {/* Patient Identity */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Patient Identity</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: "Gender", value: resident.gender || "N/A" },
                                            { label: "Date of Birth", value: resident.dateOfBirth ? formatDateTime(resident.dateOfBirth) : "N/A" },
                                            { label: "Barangay", value: addData.barangay || resident.barangay || "N/A" },
                                            { label: "Contact", value: resident.contactNumber || "N/A" },
                                            { label: "Relationship", value: addData.relationship || "SELF" },
                                            { label: "Priority", value: isPriority ? "PRIORITY LANE" : "REGULAR" },
                                        ].map((item, i) => (
                                            <div key={i} className="bg-white/[0.03] border border-white/5 p-3 rounded-xl space-y-0.5">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{item.label}</p>
                                                <p className="text-[11px] font-black text-white uppercase">{item.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Appointment */}
                                <div className="space-y-3">
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Appointment</p>
                                    <div className="bg-white/[0.03] border border-white/5 p-3 rounded-xl space-y-1">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Consultation Type</p>
                                        <p className="text-xs font-black text-amber-400 uppercase">{checkupDisplay}</p>
                                    </div>
                                    {addData.chiefComplaint && (
                                        <div className="bg-white/[0.03] border border-white/5 p-3 rounded-xl space-y-1">
                                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Chief Complaint / Purpose</p>
                                            <p className="text-xs font-bold text-slate-300">{addData.chiefComplaint}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Vitals Timeline */}
                                {addData.vitals && (
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 border-b border-white/5 pb-2">Vitals at Check-In</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { label: "Height", value: addData.vitals.height ? `${addData.vitals.height} cm` : null },
                                                { label: "Weight", value: addData.vitals.weight ? `${addData.vitals.weight} kg` : null },
                                                { 
                                                    label: "BMI", 
                                                    value: addData.vitals.bmi 
                                                        ? `${addData.vitals.bmi} kg/m² (${addData.vitals.bmiCategory || calculateBMI(addData.vitals.height, addData.vitals.weight)?.category || ''})` 
                                                        : (calculateBMI(addData.vitals.height, addData.vitals.weight) ? `${calculateBMI(addData.vitals.height, addData.vitals.weight)?.bmi} kg/m² (${calculateBMI(addData.vitals.height, addData.vitals.weight)?.category})` : null) 
                                                },
                                                { label: "Blood Pressure", value: addData.vitals.bloodPressure ? `${addData.vitals.bloodPressure} mmHg` : null },
                                                { label: "Temperature", value: addData.vitals.temperature ? `${addData.vitals.temperature} °C` : null },
                                                { label: "Pulse Rate", value: addData.vitals.pulseRate ? `${addData.vitals.pulseRate} bpm` : null },
                                                { label: "PhilHealth No.", value: addData.vitals.philhealthNumber || null },
                                                { label: "Konsultation No.", value: addData.vitals.konsultationNumber || null },
                                            ].filter(v => v.value).map((item, i) => (
                                                <div key={i} className="bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl space-y-0.5">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-indigo-400">{item.label}</p>
                                                    <p className="text-[11px] font-black text-white uppercase">{item.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT PANEL: Doctor Encoder (8 cols) */}
                        <div className="md:col-span-8 bg-[#111827] flex flex-col h-full min-h-0 overflow-hidden">
                            <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                                        <ClipboardList className="w-4 h-4 text-teal-400" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-teal-400">DOCTOR CONSOLE</p>
                                        <p className="text-xs font-black text-white uppercase">Clinical Encoder</p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-white/10 shrink-0">
                                {(["deos", "vaccine", "rx"] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                                            activeTab === tab
                                                ? "bg-teal-500/10 text-teal-400 border-b-2 border-teal-500"
                                                : "text-slate-500 hover:text-slate-300"
                                        }`}
                                    >
                                        {tab === "deos" ? "D·E·O·S" : tab === "vaccine" ? "Vaccine Batch" : "RX / Referral"}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Content */}
                            <div className="overflow-y-auto flex-1 p-6 space-y-4 min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                {activeTab === "deos" && (
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Diagnosis · Examination · Orders · Status</p>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">D — Diagnosis <span className="text-rose-500">*</span></Label>
                                            <Textarea
                                                placeholder="e.g. Acute URTI, Hypertension Stage 1..."
                                                value={deos.diagnosis}
                                                onChange={(e) => setDeos(p => ({ ...p, diagnosis: e.target.value }))}
                                                rows={3}
                                                className={`rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border ${
                                                    deosErrors.diagnosis ? "border-red-500 focus-visible:ring-red-500" : "border-white/10"
                                                }`}
                                            />
                                            {deosErrors.diagnosis && <p className="text-[10px] text-red-500 font-medium">Diagnosis is required.</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E — Examination Findings <span className="text-rose-500">*</span></Label>
                                            <Textarea
                                                placeholder="e.g. BP 120/80, Temp 37.2°C, clear breath sounds..."
                                                value={deos.examinationFindings}
                                                onChange={(e) => setDeos(p => ({ ...p, examinationFindings: e.target.value }))}
                                                rows={3}
                                                className={`rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border ${
                                                    deosErrors.examinationFindings ? "border-red-500 focus-visible:ring-red-500" : "border-white/10"
                                                }`}
                                            />
                                            {deosErrors.examinationFindings && <p className="text-[10px] text-red-500 font-medium">Examination findings are required.</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">O — Orders / Prescription <span className="text-rose-500">*</span></Label>
                                            <Textarea
                                                placeholder="e.g. Amoxicillin 500mg TID x 7 days, CBC, rest..."
                                                value={deos.orders}
                                                onChange={(e) => setDeos(p => ({ ...p, orders: e.target.value }))}
                                                rows={4}
                                                className={`rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border ${
                                                    deosErrors.orders ? "border-red-500 focus-visible:ring-red-500" : "border-white/10"
                                                }`}
                                            />
                                            {deosErrors.orders && <p className="text-[10px] text-red-500 font-medium">Orders / Prescription are required.</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">S — Status / Notes <span className="text-slate-600 font-bold normal-case tracking-normal">(optional)</span></Label>
                                            <Textarea
                                                placeholder="e.g. Follow-up in 1 week, advised rest..."
                                                value={deos.status}
                                                onChange={(e) => setDeos(p => ({ ...p, status: e.target.value }))}
                                                rows={2}
                                                className="rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border border-white/10"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === "vaccine" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Vaccine Batch Encoder</p>
                                            <button
                                                onClick={() => setVaccines(v => [...v, { name: "", batchNumber: "", doseNumber: "", dateAdministered: "", site: "" }])}
                                                className="text-[10px] font-black uppercase text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-3 py-1 rounded-lg transition-colors"
                                            >
                                                + Add Vaccine
                                            </button>
                                        </div>
                                        {vaccines.map((vax, idx) => (
                                            <div key={idx} className="border border-white/10 p-4 rounded-xl space-y-3 bg-white/[0.02]">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-teal-400">Vaccine #{idx + 1}</p>
                                                    {vaccines.length > 1 && (
                                                        <button onClick={() => setVaccines(v => v.filter((_, i) => i !== idx))} className="text-[9px] font-black uppercase text-rose-400 hover:text-rose-300">Remove</button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vaccine Name</Label>
                                                        <Input value={vax.name} onChange={(e) => setVaccines(v => v.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} placeholder="e.g. Flu Vaccine" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Batch Number</Label>
                                                        <Input value={vax.batchNumber} onChange={(e) => setVaccines(v => v.map((x, i) => i === idx ? { ...x, batchNumber: e.target.value } : x))} placeholder="e.g. BN-2026-001" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dose No.</Label>
                                                        <Input value={vax.doseNumber} onChange={(e) => setVaccines(v => v.map((x, i) => i === idx ? { ...x, doseNumber: e.target.value } : x))} placeholder="e.g. 1st, 2nd" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Date Administered</Label>
                                                        <Input type="date" value={vax.dateAdministered} onChange={(e) => setVaccines(v => v.map((x, i) => i === idx ? { ...x, dateAdministered: e.target.value } : x))} className="h-9 rounded-xl bg-white/5 text-white text-xs border-white/10" />
                                                    </div>
                                                    <div className="col-span-2 space-y-1">
                                                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Site of Injection</Label>
                                                        <Input value={vax.site} onChange={(e) => setVaccines(v => v.map((x, i) => i === idx ? { ...x, site: e.target.value } : x))} placeholder="e.g. Left deltoid" className="h-9 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === "rx" && (
                                    <div className="space-y-4">
                                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Digital Prescription / Referral Encoder</p>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Prescription Text</Label>
                                            <Textarea
                                                placeholder="Detailed prescription notes, drug dosages, frequency, duration..."
                                                value={rxText}
                                                onChange={(e) => setRxText(e.target.value)}
                                                rows={8}
                                                className="rounded-xl bg-white/5 text-white placeholder:text-slate-600 font-medium text-xs resize-none border border-white/10"
                                            />
                                        </div>
                                        <div className="border-t border-white/10 pt-4 space-y-3">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Referral (if needed)</p>
                                            <Input
                                                placeholder="Referral facility name"
                                                value={referralFacility}
                                                onChange={(e) => setReferralFacility(e.target.value)}
                                                className="h-10 rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs border-white/10"
                                            />
                                            <Textarea
                                                placeholder="Reason for referral..."
                                                value={referralReason}
                                                onChange={(e) => setReferralReason(e.target.value)}
                                                rows={3}
                                                className="rounded-xl bg-white/5 text-white placeholder:text-slate-600 text-xs resize-none border border-white/10"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="border-t border-white/10 px-6 py-4 bg-[#0d1117] flex gap-3 items-center justify-end shrink-0">
                                <Button
                                    variant="ghost"
                                    onClick={() => { setDeosModalOpen(false); setDeosErrors({}); }}
                                    className="h-11 px-6 rounded-xl text-xs font-bold uppercase text-slate-400 hover:text-white"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    disabled={submitting}
                                    onClick={handleConfirmPrescription}
                                    className="h-11 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-rose-600/20 flex items-center gap-2"
                                >
                                    <Activity className="w-4 h-4" />
                                    {submitting ? "Saving..." : "Start Consultation"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Referral Dialog */}
            <Dialog open={referralModalOpen} onOpenChange={setReferralModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-8">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter text-fuchsia-600 dark:text-fuchsia-400">
                            Refer <span className="text-slate-900 dark:text-white">Patient</span>
                        </DialogTitle>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Medical Referral Record</p>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Referral Hospital / Facility Name *</p>
                            <Input
                                placeholder="e.g. Region 1 Medical Center, Pangasinan Provincial Hospital..."
                                value={referralFacility}
                                onChange={(e) => setReferralFacility(e.target.value)}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason for Referral</p>
                            <Input
                                placeholder="e.g. Specialty evaluation, emergency care, advanced diagnostics..."
                                value={referralReason}
                                onChange={(e) => setReferralReason(e.target.value)}
                                className="h-12 rounded-xl bg-slate-50 dark:bg-white/5 font-bold text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setReferralModalOpen(false)}
                            className="h-11 px-5 rounded-xl text-xs font-bold uppercase"
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={submitting || !referralFacility.trim()}
                            onClick={() => handleUpdateStatus("REFERRED", undefined, { facility: referralFacility, reason: referralReason })}
                            className="h-11 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-black italic uppercase tracking-widest text-xs rounded-xl shadow-md"
                        >
                            Confirm Referral
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Cancel Appointment Dialog */}
            <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                            Cancel <span className="text-red-500">Appointment</span>
                        </DialogTitle>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Cancellation Protocol</p>
                    </DialogHeader>
                    <div className="space-y-6 py-6">
                        <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Cancellation</p>
                            <Input
                                placeholder="Why is this appointment being cancelled? (e.g. Invalid schedule, patient request...)"
                                value={cancelRemarks}
                                onChange={(e) => setCancelRemarks(e.target.value)}
                                className="h-14 rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic px-6 text-sm text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            variant="ghost"
                            onClick={() => setCancelModalOpen(false)}
                            className="h-12 px-6 rounded-2xl text-xs font-bold uppercase"
                        >
                            Back
                        </Button>
                        <Button
                            disabled={submitting || !cancelRemarks}
                            onClick={() => handleUpdateStatus("CANCELLED", cancelRemarks)}
                            className="h-14 bg-red-600 hover:bg-red-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all"
                        >
                            Confirm Cancellation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Preview Modal */}
            {previewImage && (
                <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
                    <DialogContent className="max-w-4xl p-4 bg-slate-950/95 text-white border-white/10 rounded-3xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Document Lightbox Preview</span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoomScale(s => Math.min(s + 0.25, 3))}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setZoomScale(s => Math.max(s - 0.25, 0.5))}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRotateAngle(a => (a + 90) % 360)}
                                    className="h-8 w-8 p-0 text-white hover:bg-white/10"
                                >
                                    <RotateCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-center min-h-[400px] overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={previewImage}
                                alt="Preview"
                                style={{
                                    transform: `scale(${zoomScale}) rotate(${rotateAngle}deg)`,
                                    transition: "transform 0.2s ease-in-out"
                                }}
                                className="max-h-[70vh] object-contain rounded-xl"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
