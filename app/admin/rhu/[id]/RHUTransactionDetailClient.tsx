"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    ArrowLeft, CheckCircle2, XCircle, Printer,
    Activity, Heart,
    ZoomIn, ZoomOut, RotateCw, Eye
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
import { updateRHUAppointmentStatus } from "../actions";

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
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

    // Lightbox image viewer state
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [rotateAngle, setRotateAngle] = useState(0);

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

    const handleUpdateStatus = async (newStatus: string, remarks?: string) => {
        setSubmitting(true);
        try {
            const res = await updateRHUAppointmentStatus(transaction.id, newStatus, remarks);
            if (res.success) {
                toast.success(`Appointment status updated to ${newStatus.replace(/_/g, " ")}`);
                setCancelModalOpen(false);
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

    // Calculate progress step for status tracker (1 to 4)
    let currentStep = 1; // Booked
    if (addData.checkedIn || transaction.status === "FOR_PROCESSING") currentStep = 2;
    if (transaction.status === "EVALUATED" || transaction.status === "APPROVED") currentStep = 3;
    if (transaction.status === "COMPLETED" || transaction.status === "RELEASED") currentStep = 4;
    if (transaction.isCancelled) currentStep = 0;

    const getStatusPill = () => {
        if (transaction.isCancelled) {
            return (
                <span className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                    CANCELLED
                </span>
            );
        }
        switch (transaction.status) {
            case "COMPLETED":
            case "RELEASED":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        COMPLETED
                    </span>
                );
            case "EVALUATED":
            case "APPROVED":
            case "FOR_PROCESSING":
                return (
                    <span className="px-4 py-1.5 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        CONFIRMED
                    </span>
                );
            default:
                return (
                    <span className="px-4 py-1.5 rounded-full bg-amber-500 text-white font-black text-xs uppercase tracking-wider shadow-md">
                        PENDING REVIEW
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
                    onClick={() => router.push("/admin/rhu")}
                    className="h-10 px-0 hover:bg-transparent text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to RHU Dashboard
                </Button>

                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase bg-slate-800/60 dark:bg-white/5 border border-slate-700/50 dark:border-white/10 px-3 py-1.5 rounded-xl">
                        ID: {transaction.controlNumber || transaction.id}
                    </span>
                    {getStatusPill()}
                </div>
            </div>

            {/* 2-Column Grid (matching Registrar Image 2 layout) */}
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
                                    {resident.barangay || "AMANAOAC"}
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
                </div>

                {/* RIGHT COLUMN: Status Tracker & Action Panel (matching Registrar Image 2) */}
                <div className="space-y-6">

                    {/* Status Tracker Card */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white italic">
                                STATUS TRACKER
                            </h3>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                STATUS PHASE PROGRESS
                            </p>
                        </div>

                        {/* Step Timeline */}
                        <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                            {[
                                { step: 1, title: "ATTEND APPOINTMENT" },
                                { step: 2, title: "RESIDENT CHECK-IN" },
                                { step: 3, title: "MEDICAL EVALUATION" },
                                { step: 4, title: "REGISTRAR: RELEASE" },
                            ].map((item) => {
                                const isPassed = currentStep >= item.step;
                                return (
                                    <div key={item.step} className="flex items-center gap-3 relative z-10">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            isPassed
                                                ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                                                : "bg-slate-200 dark:bg-white/10 text-slate-400"
                                        }`}>
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-wider ${
                                                isPassed ? "text-slate-900 dark:text-white" : "text-slate-400"
                                            }`}>
                                                {item.title}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Action / Final Decision Card (Matching Registrar Image 2 & Action Button Styles) */}
                    <Card className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#151922] shadow-sm p-6 text-center space-y-6">
                        {transaction.isCancelled ? (
                            <div className="py-6 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-500">
                                    <XCircle className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-rose-500">
                                        APPOINTMENT CANCELLED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        REQUEST REJECTED / CANCELLED
                                    </p>
                                </div>
                                {transaction.rejectionRemarks && (
                                    <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-bold text-rose-400 text-left">
                                        {transaction.rejectionRemarks}
                                    </div>
                                )}
                            </div>
                        ) : transaction.status === "COMPLETED" || transaction.status === "RELEASED" ? (
                            <div className="py-6 space-y-6">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                        TRANSACTION COMPLETED
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        ENDORSEMENT REQUEST FINALIZED
                                    </p>
                                </div>
                                <Button
                                    onClick={() => window.print()}
                                    className="w-full h-14 bg-slate-800 hover:bg-slate-700 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-4 h-4" />
                                    PRINT WAYBILL / SLIP
                                </Button>
                            </div>
                        ) : (
                            <div className="py-4 space-y-4">
                                <div className="space-y-1 text-left border-b border-slate-100 dark:border-white/5 pb-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        ACTION REQUIRED
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Evaluate or complete patient consultation
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <Button
                                        disabled={submitting}
                                        onClick={() => handleUpdateStatus("COMPLETED")}
                                        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Heart className="w-4 h-4" />
                                        MARK CONSULTATION COMPLETED
                                    </Button>
                                    <Button
                                        disabled={submitting}
                                        onClick={() => setCancelModalOpen(true)}
                                        className="w-full h-14 bg-red-600/90 hover:bg-red-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        CANCEL APPOINTMENT
                                    </Button>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

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
