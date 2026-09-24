/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, use, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ZoomIn,
    ZoomOut,
    RotateCw,
    RefreshCcw,
    AlertCircle,
    CheckCircle2,
    FileText,
    ChevronLeft,
    ChevronRight,
    XCircle,
    Ruler,
    Building2,
    MapPin,
    Calendar,
    User,
    Eye,
    Zap,
    BadgeCheck,
    AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { getTransactionById } from "@/app/admin/transactions/actions";
import {
    endorseFencingPermitByEngineer,
    scheduleEngineerFencingInspection,
    sendEngineerFencingRevision,
    rejectEngineerFencingPermit
} from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";

interface PageProps {
    params: Promise<{ id: string }>;
}

const MANDATORY_DOC_CONFIG = [
    { key: "proofOfOwnership", label: "Proof of Land Ownership", agency: "Registry of Deeds" },
    { key: "taxDeclaration", label: "Tax Declaration of Real Property", agency: "Municipal Assessor" },
    { key: "rptReceipt", label: "Current RPT Official Receipt & Tax Clearance", agency: "Municipal Treasury" },
    { key: "lotPlan", label: "Certified Lot Plan & Boundary Survey", agency: "Geodetic Engineer" },
    { key: "fencingPlans", label: "Architectural & Structural Fencing Plans", agency: "Civil Engineer / Architect" },
    { key: "billOfMaterials", label: "Itemized Bill of Materials & Cost Estimate", agency: "Civil Engineer / Architect" },
    { key: "barangayClearance", label: "Barangay Construction Clearance (Fencing)", agency: "Barangay LGU" },
    { key: "governmentId", label: "Valid Government ID & Cedula", agency: "Government / LGU" },
];

const CONDITIONAL_DOC_CONFIG = [
    { key: "zoningClearance", label: "Locational / Zoning Clearance (Prior)", agency: "MPDO" },
    { key: "dpwhClearance", label: "DPWH Clearance (National Highway)", agency: "DPWH" },
    { key: "spaDocument", label: "Special Power of Attorney (SPA)", agency: "Notary Public" },
    { key: "electricalPlan", label: "Electrical Layout & Energizer Specification", agency: "Electrical Engineer / PEE" },
];

function checkIsPdf(url: string | null) {
    if (!url) return false;
    return url.toLowerCase().endsWith(".pdf") || url.includes("application/pdf") || url.includes(".pdf?");
}

export default function FencingEngineerEvaluationPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();

    const [transaction, setTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Lightbox & PDF Viewer State
    const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);
    const [lightboxScale, setLightboxScale] = useState(1);
    const [lightboxRotate, setLightboxRotate] = useState(0);
    const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
    const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
    const [pdfViewerTitle, setPdfViewerTitle] = useState("");

    // Modal Action States
    const [endorseModalOpen, setEndorseModalOpen] = useState(false);
    const [endorseNotes, setEndorseNotes] = useState("");

    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [inspectionDate, setInspectionDate] = useState("");
    const [inspectionTime, setInspectionTime] = useState("");
    const [inspectorName, setInspectorName] = useState("");
    const [inspectionNotes, setInspectionNotes] = useState("");

    const [revisionModalOpen, setRevisionModalOpen] = useState(false);
    const [revisionRemarks, setRevisionRemarks] = useState("");
    const [selectedRevisionDocs, setSelectedRevisionDocs] = useState<{ [key: string]: boolean }>({});
    const [isConfirmingThirdRevision, setIsConfirmingThirdRevision] = useState(false);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectRemarks, setRejectRemarks] = useState("");

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                setTransaction(res.data);
            } else {
                toast.error(res.error || "Failed to load transaction details");
            }
        } catch (err) {
            console.error("Fetch transaction error:", err);
            toast.error("An error occurred while loading application");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTransaction();
    }, [fetchTransaction]);

    const additional = useMemo(() => (transaction?.additionalData as any) || {}, [transaction]);
    const resident = useMemo(() => (transaction?.user?.residentProfile || transaction?.residentSnapshot || {}) as any, [transaction]);
    const documents = useMemo(() => additional?.documents || {}, [additional]);

    // Build Vault Document List
    const vaultDocs = useMemo(() => {
        const list: { key: string; label: string; agency: string; url: string | null; isMandatory: boolean }[] = [];

        // Mandatory slots
        for (const slot of MANDATORY_DOC_CONFIG) {
            const url = documents[slot.key] || null;
            list.push({ ...slot, url, isMandatory: true });
        }

        // Conditional slots
        const isElectrified = additional.fenceSecurityFeature === "ELECTRIFIED" || additional.fenceSecurityFeature === "BOTH";
        for (const slot of CONDITIONAL_DOC_CONFIG) {
            const url = documents[slot.key] || null;
            if (url || (slot.key === "electricalPlan" && isElectrified)) {
                list.push({ ...slot, url, isMandatory: slot.key === "electricalPlan" && isElectrified });
            }
        }

        return list;
    }, [documents, additional]);

    const activeDoc = activeDocIndex !== null ? vaultDocs[activeDocIndex] : null;

    const handleOpenDoc = (index: number) => {
        const doc = vaultDocs[index];
        if (!doc?.url) return;
        if (checkIsPdf(doc.url)) {
            setPdfViewerUrl(doc.url);
            setPdfViewerTitle(doc.label);
            setPdfViewerOpen(true);
        } else {
            setActiveDocIndex(index);
            setLightboxScale(1);
            setLightboxRotate(0);
        }
    };

    // Endorse Fencing Application to MPDC Zoning
    const handleEndorseToZoning = async () => {
        setActionLoading(true);
        try {
            const res = await endorseFencingPermitByEngineer(id, endorseNotes);
            if (res.success) {
                toast.success("Fencing permit approved and endorsed to MPDC Zoning!");
                setEndorseModalOpen(false);
                router.push("/admin/engineer");
            } else {
                toast.error(res.error || "Failed to endorse fencing permit");
            }
        } catch {
            toast.error("Failed to complete endorsement");
        } finally {
            setActionLoading(false);
        }
    };

    // Schedule Structural Site Inspection
    const handleScheduleInspection = async () => {
        if (!inspectionDate || !inspectionTime || !inspectorName.trim()) {
            toast.error("Please fill in the inspection date, time, and inspector name.");
            return;
        }
        setActionLoading(true);
        try {
            const res = await scheduleEngineerFencingInspection(id, {
                date: inspectionDate,
                time: inspectionTime,
                inspectorName: inspectorName.trim(),
                notes: inspectionNotes
            });
            if (res.success) {
                toast.success("Site inspection scheduled successfully!");
                setScheduleModalOpen(false);
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to schedule inspection");
            }
        } catch {
            toast.error("An error occurred while scheduling inspection");
        } finally {
            setActionLoading(false);
        }
    };

    // Execute Send for Document Revision
    const executeSendRevision = async () => {
        if (!revisionRemarks.trim()) {
            toast.error("Please provide clear instructions on what needs revision.");
            return;
        }

        const revisionRequests = Object.keys(selectedRevisionDocs)
            .filter(key => selectedRevisionDocs[key])
            .map(key => {
                const doc = vaultDocs.find(d => d.key === key);
                return {
                    type: "REQUIREMENTS" as const,
                    name: doc?.label || key,
                    key
                };
            });

        setActionLoading(true);
        try {
            const res = await sendEngineerFencingRevision(id, revisionRemarks, revisionRequests);
            if (res.success) {
                toast.success("Revision requested from applicant!");
                setRevisionModalOpen(false);
                setIsConfirmingThirdRevision(false);
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to send revision request");
            }
        } catch {
            toast.error("An error occurred while requesting revision");
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendRevision = async () => {
        if (!revisionRemarks.trim()) {
            toast.error("Please provide clear instructions on what needs revision.");
            return;
        }

        if ((transaction?.revisionCount || 0) === 2) {
            setIsConfirmingThirdRevision(true);
            return;
        }

        await executeSendRevision();
    };

    // Reject Application
    const handleReject = async () => {
        if (!rejectRemarks.trim()) {
            toast.error("Please provide the official reason for rejection.");
            return;
        }
        setActionLoading(true);
        try {
            const res = await rejectEngineerFencingPermit(id, rejectRemarks);
            if (res.success) {
                toast.error("Application officially rejected by Municipal Engineer");
                setRejectModalOpen(false);
                router.push("/admin/engineer");
            } else {
                toast.error(res.error || "Failed to reject application");
            }
        } catch {
            toast.error("An error occurred while rejecting application");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Loading Fencing Evaluation...</p>
            </div>
        );
    }

    if (!transaction) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#0c111d] p-8 flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white">Transaction Not Found</h2>
                <Button className="mt-4" onClick={() => router.push("/admin/engineer")}>
                    Back to Engineer Hub
                </Button>
            </div>
        );
    }

    const currentStatus = transaction.status;
    const isElectrified = additional.fenceSecurityFeature === "ELECTRIFIED" || additional.fenceSecurityFeature === "BOTH";
    const isEndorsedToZoning = additional?.feeAssessment?.engineerEndorsedToZoning === true || currentStatus === "EVALUATED";
    const isFinalAttempt = (transaction?.revisionCount || 0) >= 3;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/admin/engineer")}
                        className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-primary">Municipal Engineering Office</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-xs font-mono font-bold text-slate-500">ID: {transaction.id}</span>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-0.5">
                            Fencing Permit <span className="text-primary italic">Structural Evaluation</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge className={cn(
                        "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-lg border",
                        currentStatus === "FOR_REQUESTING" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
                        currentStatus === "EVALUATED" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
                        currentStatus === "FOR_INSPECTION" && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
                        currentStatus === "FOR_REVISION" && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400",
                        currentStatus === "REJECTED" && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                    )}>
                        Status: {currentStatus?.replace(/_/g, " ")}
                    </Badge>
                    <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg">
                        Revision: {transaction?.revisionCount || 0} / 3
                    </Badge>
                </div>
            </div>

            {/* High-Voltage or Perimeter Security Alert Banner */}
            {isElectrified && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3.5 text-amber-900 dark:text-amber-300">
                    <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                        <h4 className="text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Electrified Security Fencing Notice
                        </h4>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">
                            Applicant has specified an energized electric fence. Verify that the <strong>Electrical Layout & Energizer Specification</strong> is certified by a Professional Electrical Engineer (PEE) and meets non-lethal pulsed DC energizer safety regulations with required warning placards.
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left 2 Cols: Fencing Details Matrix + Document Evaluation Vault */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Fencing Site & Specification Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Ruler className="w-4 h-4 text-primary" />
                                Project Specifications & Site Parameters
                            </h3>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">National Building Code Compliant</span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Perimeter Length</span>
                                <span className="text-base font-black text-slate-800 dark:text-white">
                                    {additional.fenceLength || additional.lengthInMeters || "0"} <span className="text-xs font-bold text-slate-400">meters</span>
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Height from Ground</span>
                                <span className="text-base font-black text-slate-800 dark:text-white">
                                    {additional.fenceHeight || additional.heightInMeters || "0"} <span className="text-xs font-bold text-slate-400">meters</span>
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Est. Construction Cost</span>
                                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                    ₱{Number(additional.estimatedCost || 0).toLocaleString()}
                                </span>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Security Feature</span>
                                <span className="text-xs font-black uppercase text-slate-800 dark:text-white">
                                    {additional.fenceSecurityFeature?.replace(/_/g, " ") || "NONE"}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Fence Structure & Material</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {additional.fenceType || "Standard Reinforced Masonry"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Project Site Location</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                                    {additional.projectAddress || additional.location || `Brgy. ${additional.barangay}, Mapandan, Pangasinan`}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Document Vault Section */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Fencing Permit Document Vault
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Click any document card to inspect in full-resolution Lightbox or PDF viewer.
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                                {vaultDocs.filter(d => !!d.url).length} / {vaultDocs.length} Attached
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {vaultDocs.map((doc, idx) => {
                                const hasFile = !!doc.url;
                                const isPdf = checkIsPdf(doc.url);

                                return (
                                    <div
                                        key={doc.key}
                                        onClick={() => hasFile && handleOpenDoc(idx)}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all text-left group flex flex-col justify-between relative",
                                            hasFile
                                                ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:border-primary cursor-pointer hover:shadow-md"
                                                : "bg-slate-50/30 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 opacity-60"
                                        )}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between gap-2 mb-2">
                                                <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 rounded border-slate-200 dark:border-slate-700">
                                                    {doc.agency}
                                                </Badge>
                                                {doc.isMandatory ? (
                                                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-500">Required</span>
                                                ) : (
                                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Conditional</span>
                                                )}
                                            </div>

                                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-2">
                                                {doc.label}
                                            </h4>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                                            {hasFile ? (
                                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    {isPdf ? "PDF Document" : "Image File"}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium text-slate-400 italic">Not Uploaded</span>
                                            )}

                                            {hasFile && (
                                                <span className="text-[10px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 uppercase">
                                                    Inspect <Eye className="w-3 h-3 ml-0.5" />
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Col: Applicant Context + Engineer Actions Drawer */}
                <div className="space-y-6">
                    {/* Applicant Profile Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <User className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Applicant Information
                            </h3>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400">Full Name</span>
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                    {resident.firstName ? `${resident.firstName} ${resident.lastName}` : transaction.user?.name || "Applicant"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400">Contact Number</span>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {resident.contactNumber || transaction.user?.phone || "N/A"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400">Registered Residence</span>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {resident.barangay ? `Brgy. ${resident.barangay}, Mapandan, Pangasinan` : "Mapandan Resident"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase text-slate-400">Submission Date</span>
                                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                    {new Date(transaction.createdAt).toLocaleDateString("en-PH", {
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric"
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Engineer Action Matrix Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <Building2 className="w-4 h-4 text-primary" />
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Engineering Action Matrix
                            </h3>
                        </div>

                        <div className="space-y-2.5">
                            {/* Primary Action: Approve & Endorse to MPDC Zoning */}
                            <Button
                                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm"
                                onClick={() => setEndorseModalOpen(true)}
                                disabled={actionLoading || isEndorsedToZoning}
                            >
                                <BadgeCheck className="w-4 h-4 mr-2" />
                                {isEndorsedToZoning ? "Endorsed to MPDC Zoning" : "Approve & Endorse to Zoning"}
                            </Button>

                            {/* Secondary Action: Schedule Structural Site Inspection */}
                            <Button
                                variant="outline"
                                className="w-full h-11 border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 font-bold text-xs uppercase tracking-wider rounded-xl"
                                onClick={() => setScheduleModalOpen(true)}
                                disabled={actionLoading}
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Site Inspection
                            </Button>

                            {/* Action: Request Document Revision */}
                            <Button
                                variant="outline"
                                className="w-full h-11 border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-bold text-xs uppercase tracking-wider rounded-xl"
                                onClick={() => {
                                    setRevisionModalOpen(true);
                                    setIsConfirmingThirdRevision(false);
                                }}
                                disabled={actionLoading || isFinalAttempt}
                            >
                                <RotateCw className="w-4 h-4 mr-2" />
                                Request Document Revision
                            </Button>

                            {/* Danger Action: Formal Rejection */}
                            <Button
                                variant="ghost"
                                className="w-full h-11 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold text-xs uppercase tracking-wider rounded-xl"
                                onClick={() => setRejectModalOpen(true)}
                                disabled={actionLoading}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject Application
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal: Endorse to MPDC Zoning */}
            <Dialog open={endorseModalOpen} onOpenChange={setEndorseModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                            <BadgeCheck className="w-5 h-5 text-emerald-600" />
                            Endorse to MPDC Zoning
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Confirm that the architectural plans, structural dimensions, and site specifications comply with engineering standards.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Engineering Evaluation Notes (Optional)
                            </Label>
                            <Textarea
                                placeholder="Add notes for the MPDC Zoning Officer regarding setbacks, height, or structural notes..."
                                value={endorseNotes}
                                onChange={(e) => setEndorseNotes(e.target.value)}
                                className="min-h-[90px] rounded-xl text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setEndorseModalOpen(false)} disabled={actionLoading}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase"
                            onClick={handleEndorseToZoning}
                            disabled={actionLoading}
                        >
                            {actionLoading ? "Endorsing..." : "Confirm & Endorse"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Schedule Site Inspection */}
            <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-purple-600" />
                            Schedule Site Inspection
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Assign an engineering inspector to inspect the fencing perimeter and property boundaries.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Inspection Date *</Label>
                            <Input
                                type="date"
                                min={new Date().toISOString().split("T")[0]}
                                value={inspectionDate}
                                onChange={(e) => setInspectionDate(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Inspection Time *</Label>
                            <Input
                                type="time"
                                value={inspectionTime}
                                onChange={(e) => setInspectionTime(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Inspector Name *</Label>
                            <Input
                                placeholder="Engr. Juan Dela Cruz"
                                value={inspectorName}
                                onChange={(e) => setInspectorName(e.target.value)}
                                className="h-10 text-xs rounded-xl"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-bold">Inspection Notes (Optional)</Label>
                            <Textarea
                                placeholder="Instructions for site assessment..."
                                value={inspectionNotes}
                                onChange={(e) => setInspectionNotes(e.target.value)}
                                className="min-h-[70px] text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setScheduleModalOpen(false)} disabled={actionLoading}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase"
                            onClick={handleScheduleInspection}
                            disabled={actionLoading}
                        >
                            {actionLoading ? "Scheduling..." : "Confirm Schedule"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal: Request Document Revision */}
            <Dialog open={revisionModalOpen} onOpenChange={setRevisionModalOpen}>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                            <RotateCw className="w-5 h-5 text-amber-500" />
                            {isConfirmingThirdRevision ? "Confirm Final Revision" : "Request Document Revision"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            {isConfirmingThirdRevision
                                ? "This is the applicant's 3rd and final attempt. Make sure your instructions are clear."
                                : "Specify which fencing requirements or plans must be re-submitted."}
                        </DialogDescription>
                    </DialogHeader>

                    {isConfirmingThirdRevision ? (
                        <div className="space-y-4 py-3">
                            <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-wider text-amber-600">
                                        3rd & Final Revision Warning
                                    </p>
                                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        You are about to send this application for revision for the 3rd time. If still invalid after this attempt, the submission will be permanently locked. Proceed?
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="flex-1" onClick={() => setIsConfirmingThirdRevision(false)} disabled={actionLoading}>
                                    Back
                                </Button>
                                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase" onClick={executeSendRevision} disabled={actionLoading}>
                                    {actionLoading ? "Sending..." : "Proceed with 3rd Revision"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Revision Instructions / Deficiencies *
                                </Label>
                                <Textarea
                                    placeholder="Explain why the fencing structural plans or documents are incomplete or need modification..."
                                    value={revisionRemarks}
                                    onChange={(e) => setRevisionRemarks(e.target.value)}
                                    className="min-h-[90px] rounded-xl text-xs"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Select Documents Requiring Re-upload
                                </Label>
                                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                                    {vaultDocs.map((doc) => (
                                        <div
                                            key={doc.key}
                                            onClick={() => setSelectedRevisionDocs(prev => ({ ...prev, [doc.key]: !prev[doc.key] }))}
                                            className={cn(
                                                "p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer transition-colors",
                                                selectedRevisionDocs[doc.key]
                                                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                                                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                                            )}
                                        >
                                            <span className="truncate pr-2">{doc.label}</span>
                                            <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                                                {selectedRevisionDocs[doc.key] ? "Revise" : "Keep"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0 pt-2">
                                <Button variant="ghost" onClick={() => setRevisionModalOpen(false)} disabled={actionLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase"
                                    onClick={handleSendRevision}
                                    disabled={actionLoading || !revisionRemarks.trim()}
                                >
                                    {actionLoading ? "Sending..." : "Submit Revision Request"}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal: Reject Application */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase text-rose-600 flex items-center gap-2">
                            <XCircle className="w-5 h-5 text-rose-600" />
                            Reject Fencing Application
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Provide the formal legal or technical justification for declining this fencing permit application.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Reason for Rejection *
                            </Label>
                            <Textarea
                                placeholder="Explain legal violations (e.g. encroachment on public right-of-way, lack of ownership proof, hazardous wiring)..."
                                value={rejectRemarks}
                                onChange={(e) => setRejectRemarks(e.target.value)}
                                className="min-h-[100px] rounded-xl text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setRejectModalOpen(false)} disabled={actionLoading}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase"
                            onClick={handleReject}
                            disabled={actionLoading || !rejectRemarks.trim()}
                        >
                            {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Modal */}
            {activeDoc && (
                <Dialog open={activeDocIndex !== null} onOpenChange={(open) => !open && setActiveDocIndex(null)}>
                    <DialogContent className="max-w-4xl bg-black/95 border-none p-4 rounded-3xl text-white">
                        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-white/10">
                            <div>
                                <DialogTitle className="text-sm font-black uppercase tracking-wider text-white">
                                    {activeDoc.label}
                                </DialogTitle>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Agency: {activeDoc.agency}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => setLightboxScale(s => Math.min(s + 0.25, 3))}
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => setLightboxScale(s => Math.max(s - 0.25, 0.5))}
                                >
                                    <ZoomOut className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => setLightboxRotate(r => (r + 90) % 360)}
                                >
                                    <RotateCw className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-white hover:bg-white/10 rounded-lg"
                                    onClick={() => { setLightboxScale(1); setLightboxRotate(0); }}
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="relative h-[65vh] w-full flex items-center justify-center overflow-hidden my-2">
                            <img
                                src={activeDoc.url || ""}
                                alt={activeDoc.label}
                                style={{
                                    transform: `scale(${lightboxScale}) rotate(${lightboxRotate}deg)`,
                                    transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                                }}
                                className="max-h-full max-w-full object-contain rounded-xl select-none"
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={activeDocIndex === null || activeDocIndex === 0}
                                onClick={() => setActiveDocIndex(prev => (prev !== null && prev > 0 ? prev - 1 : 0))}
                                className="text-white hover:bg-white/10 gap-1 rounded-xl"
                            >
                                <ChevronLeft className="w-4 h-4" /> Previous
                            </Button>
                            <span className="text-slate-400 font-mono text-[11px]">
                                {(activeDocIndex ?? 0) + 1} of {vaultDocs.length}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={activeDocIndex === null || activeDocIndex === vaultDocs.length - 1}
                                onClick={() => setActiveDocIndex(prev => (prev !== null && prev < vaultDocs.length - 1 ? prev + 1 : prev))}
                                className="text-white hover:bg-white/10 gap-1 rounded-xl"
                            >
                                Next <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* PDF Viewer Modal */}
            <DocumentViewerModal
                isOpen={pdfViewerOpen}
                onClose={() => setPdfViewerOpen(false)}
                fileUrl={pdfViewerUrl}
                title={pdfViewerTitle}
            />
        </div>
    );
}
