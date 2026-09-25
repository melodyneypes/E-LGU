/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, use, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { isValidUrl } from "@/utils/image";
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
    MessageSquareQuote,
    AlertTriangle,
    Coins,
    Trash2,
    Plus,
    Upload,
    Check,
    FileCheck,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import { getTransactionById, uploadECopyAction } from "@/app/admin/transactions/actions";
import {
    scheduleZoningFencingInspection,
    sendZoningFencingRevision,
    rejectZoningFencingPermit,
    endorseFencingPermitByZoning
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

export default function FencingZoningEvaluationPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();

    const [transaction, setTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Lightbox & PDF Viewer State
    const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);
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

    // Zoning Fee Assessment State
    const [zoningFeeItems, setZoningFeeItems] = useState<{ name: string; amount: string }[]>([
        { name: "", amount: "" }
    ]);

    // Zoning Clearance Certificate File Upload State
    const [zoningClearanceUrl, setZoningClearanceUrl] = useState<string>("");
    const [isUploadingClearance, setIsUploadingClearance] = useState<boolean>(false);
    const clearanceInputRef = React.useRef<HTMLInputElement | null>(null);

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                setTransaction(res.data);
                const feeData = res.data.additionalData?.feeAssessment?.zoningFees;
                if (Array.isArray(feeData) && feeData.length > 0) {
                    setZoningFeeItems(feeData.map((f: any) => ({ name: f.name, amount: String(f.amount) })));
                }
                if (res.data.additionalData?.zoningClearanceUrl) {
                    setZoningClearanceUrl(res.data.additionalData.zoningClearanceUrl);
                }
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

    const totalZoningFeeAmount = useMemo(() => {
        return zoningFeeItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    }, [zoningFeeItems]);

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

    const handleOpenDoc = (index: number) => {
        const doc = vaultDocs[index];
        if (!doc?.url) return;
        setActiveDocIndex(index);
        setPdfViewerUrl(doc.url);
        setPdfViewerTitle(doc.label);
        setPdfViewerOpen(true);
    };

    // Handle Zoning Clearance Certificate Upload
    const handleClearanceFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File size exceeds 10MB limit.");
            return;
        }

        setIsUploadingClearance(true);
        const toastId = toast.loading("Uploading Zoning Clearance Certificate...");
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await uploadECopyAction(formData);
            if (res.success && res.data) {
                setZoningClearanceUrl(res.data);
                toast.success("Zoning Clearance Certificate uploaded successfully!", { id: toastId });
            } else {
                toast.error(res.error || "Failed to upload certificate", { id: toastId });
            }
        } catch (err: any) {
            console.error("Certificate upload error:", err);
            toast.error("Failed to upload file. Please try again.", { id: toastId });
        } finally {
            setIsUploadingClearance(false);
            if (clearanceInputRef.current) {
                clearanceInputRef.current.value = "";
            }
        }
    };

    // Endorse Fencing Application by MPDC Zoning
    const handleEndorse = async () => {
        if (!zoningClearanceUrl) {
            toast.error("Zoning Clearance Certificate document is required before endorsing.");
            return;
        }

        setActionLoading(true);
        try {
            const formattedFees = zoningFeeItems
                .filter(f => f.name.trim() !== "" && Number(f.amount) > 0)
                .map(f => ({ name: f.name.trim(), amount: Number(f.amount) }));

            const res = await endorseFencingPermitByZoning(id, endorseNotes, formattedFees, zoningClearanceUrl);
            if (res.success) {
                toast.success("Locational Clearance approved and endorsed by MPDC Zoning!");
                setEndorseModalOpen(false);
                router.push("/admin/zoning");
            } else {
                toast.error(res.error || "Failed to endorse fencing permit");
            }
        } catch {
            toast.error("Failed to complete endorsement");
        } finally {
            setActionLoading(false);
        }
    };

    // Schedule Ocular Inspection
    const handleScheduleInspection = async () => {
        if (!inspectionDate || !inspectionTime || !inspectorName.trim()) {
            toast.error("Please fill in the inspection date, time, and inspector name.");
            return;
        }
        setActionLoading(true);
        try {
            const res = await scheduleZoningFencingInspection(id, {
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
            const res = await sendZoningFencingRevision(id, revisionRemarks, revisionRequests);
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
            const res = await rejectZoningFencingPermit(id, rejectRemarks);
            if (res.success) {
                toast.error("Application officially rejected by Zoning Office");
                setRejectModalOpen(false);
                router.push("/admin/zoning");
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
                <Button className="mt-4" onClick={() => router.push("/admin/zoning")}>
                    Back to Zoning Hub
                </Button>
            </div>
        );
    }

    const currentStatus = transaction.status;
    const zoningStatus = additional.zoningStatus || currentStatus;
    const isElectrified = additional.fenceSecurityFeature === "ELECTRIFIED" || additional.fenceSecurityFeature === "BOTH";
    const isZoningEndorsed = zoningStatus === "ENDORSED" || additional.feeAssessment?.zoningApproved === true;
    const isFinalAttempt = (transaction?.revisionCount || 0) >= 3;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-5">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/admin/zoning")}
                        className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-wider text-primary">MPDC Zoning Office</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-xs font-mono font-bold text-slate-500">ID: {transaction.id}</span>
                        </div>
                        <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-0.5">
                            Fencing Permit <span className="text-primary italic">Locational Clearance Evaluation</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge className={cn(
                        "px-3 py-1 text-xs font-black uppercase tracking-widest rounded-lg border",
                        (zoningStatus === "EVALUATED" || currentStatus === "EVALUATED") && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
                        zoningStatus === "FOR_REQUESTING" && "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400",
                        zoningStatus === "ENDORSED" && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
                        zoningStatus === "FOR_INSPECTION" && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400",
                        zoningStatus === "FOR_REVISION" && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
                        zoningStatus === "REJECTED" && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                    )}>
                        Status: {zoningStatus?.replace(/_/g, " ")}
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
                {/* Left 2 Cols: Applicant Information + Engineering Endorsement Note + Fencing Details Matrix + Document Evaluation Vault */}
                <div className="xl:col-span-2 space-y-6">
                    {/* Engineering Evaluation Endorsement Notes Card (Shown if endorsed by Engineering Office) */}
                    {additional.engineerEndorsementNotes && (
                        <div className="p-5 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 flex items-start gap-4 text-slate-800 dark:text-slate-100 animate-in fade-in duration-300">
                            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-md shadow-emerald-600/20">
                                <MessageSquareQuote className="w-5 h-5" />
                            </div>
                            <div className="space-y-1 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-1.5">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                        Municipal Engineering Endorsement Notes
                                    </h4>
                                    <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                                        {additional.engineerEndorsedBy ? `By: ${additional.engineerEndorsedBy}` : "Engineering Office"}
                                        {additional.engineerEndorsedAt ? ` • ${new Date(additional.engineerEndorsedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                                    </span>
                                </div>
                                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 pt-1 italic font-medium">
                                    &ldquo;{additional.engineerEndorsementNotes}&rdquo;
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Applicant Information Profile Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <User className="w-4 h-4 text-primary" />
                                Applicant Information
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                                Filed: {new Date(transaction.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Full Name</span>
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase">
                                    {resident.firstName ? `${resident.firstName} ${resident.lastName}` : transaction.user?.name || "Applicant"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Contact Number</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {resident.contactNumber || transaction.user?.phone || "N/A"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Email Address</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                    {transaction.user?.email || "N/A"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Registered Barangay</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {resident.barangay ? `Brgy. ${resident.barangay}` : "Mapandan Resident"}
                                </p>
                            </div>
                        </div>
                    </div>

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

                    {/* Locational & Zoning Fee Assessment Card */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Coins className="w-4 h-4 text-emerald-600" />
                                    Locational & Zoning Fee Assessment
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Itemize municipal clearance charges to be paid by applicant at Treasury.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-3.5 py-1.5 rounded-xl">
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Total Assessed:</span>
                                <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                                    ₱{Number(totalZoningFeeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Fee Items Table / List */}
                        <div className="space-y-3">
                            {zoningFeeItems.map((item, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <div className="flex-1 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block sm:hidden">Fee Description</Label>
                                        <Input
                                            type="text"
                                            placeholder="Enter fee description (e.g. Locational Clearance Fee)"
                                            value={item.name}
                                            disabled={isZoningEndorsed}
                                            onChange={(e) => {
                                                const updated = [...zoningFeeItems];
                                                updated[idx].name = e.target.value;
                                                setZoningFeeItems(updated);
                                            }}
                                            className="h-10 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                        />
                                    </div>

                                    <div className="w-full sm:w-44 space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block sm:hidden">Amount (₱)</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₱</span>
                                            <Input
                                                type="number"
                                                step="any"
                                                min="0"
                                                placeholder="0.00"
                                                value={item.amount}
                                                disabled={isZoningEndorsed}
                                                onChange={(e) => {
                                                    const updated = [...zoningFeeItems];
                                                    updated[idx].amount = e.target.value;
                                                    setZoningFeeItems(updated);
                                                }}
                                                className="h-10 pl-7 text-xs font-black rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                                            />
                                        </div>
                                    </div>

                                    {!isZoningEndorsed && zoningFeeItems.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setZoningFeeItems(zoningFeeItems.filter((_, i) => i !== idx))}
                                            className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg shrink-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {!isZoningEndorsed && (
                            <div className="pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setZoningFeeItems([...zoningFeeItems, { name: "", amount: "" }])}
                                    className="rounded-xl border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 text-xs font-bold flex items-center gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Fee Item
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Document Vault Section */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Submitted Requirements & Plans
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Click any document card to inspect in full-screen document viewer with zoom & pan tools.
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-500">
                                {vaultDocs.filter(d => !!d.url).length} / {vaultDocs.length} Attached
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {vaultDocs.map((doc, idx) => {
                                const hasFile = !!doc.url;
                                const isPdf = checkIsPdf(doc.url);

                                return (
                                    <div
                                        key={doc.key}
                                        onClick={() => hasFile && handleOpenDoc(idx)}
                                        className={cn(
                                            "group relative aspect-video rounded-2xl overflow-hidden border flex items-center justify-center transition-all",
                                            hasFile
                                                ? "bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/10 cursor-zoom-in hover:shadow-lg hover:border-primary/50"
                                                : "bg-slate-50/40 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-60"
                                        )}
                                    >
                                        {hasFile ? (
                                             isPdf ? (
                                                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
                                                    <FileText className="w-8 h-8 mb-1" />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">PDF Document</span>
                                                </div>
                                            ) : (
                                                <img
                                                    src={isValidUrl(doc.url) ? doc.url : "/placeholder.png"}
                                                    alt={doc.label}
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform animate-in fade-in duration-300"
                                                />
                                            )
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-4 text-center">
                                                <FileText className="w-6 h-6 text-slate-300 dark:text-slate-600 mb-1.5" />
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Not Uploaded</span>
                                            </div>
                                        )}

                                        {/* Hover Overlay */}
                                        {hasFile && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                    <ZoomIn className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Document Label Badge at Bottom */}
                                        <div className="absolute bottom-2 left-2 right-2 z-10">
                                            <span className="text-[8px] font-black uppercase tracking-wider text-white bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md truncate block max-w-full text-center italic shadow-sm">
                                                {doc.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Col: Filing Summary + Zoning Actions Drawer */}
                <div className="space-y-6">
                    {/* Exact Workflow Tracking Card matching Design System */}
                    <div className="bg-[#151b28] rounded-[2rem] p-8 border border-white/5 space-y-6 shadow-xl">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">
                            WORKFLOW TRACKING
                        </h3>

                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                            {[
                                {
                                    id: "ENGINEERING",
                                    label: "ENGINEERING EVALUATION",
                                    isDone: true, // If reached Zoning, Engineering is completed
                                    isActive: false,
                                    isRejected: false
                                },
                                {
                                    id: "ZONING",
                                    label: "ZONING & BFP REVIEWS",
                                    isDone: isZoningEndorsed,
                                    isActive: !isZoningEndorsed && zoningStatus !== "REJECTED",
                                    isRejected: zoningStatus === "REJECTED"
                                },
                                {
                                    id: "PAYMENT",
                                    label: "TREASURY PAYMENT",
                                    isDone: ["PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(currentStatus),
                                    isActive: ["UNPAID", "PAYMENT_SUBMITTED"].includes(currentStatus),
                                    isRejected: false
                                },
                                {
                                    id: "ISSUANCE",
                                    label: "PERMIT ISSUANCE",
                                    isDone: currentStatus === "RELEASED",
                                    isActive: ["FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING"].includes(currentStatus),
                                    isRejected: false
                                }
                            ].map((step, idx) => {
                                return (
                                    <div key={step.id} className="relative flex items-center gap-4">
                                        <div
                                            className={cn(
                                                "absolute left-[-29px] w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                                step.isRejected && "bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20 scale-110",
                                                step.isDone && !step.isRejected && "bg-[#006A2E] border-[#006A2E] text-white shadow-lg shadow-green-500/20",
                                                step.isActive && !step.isRejected && "bg-[#f43f5e] border-[#f43f5e] text-white shadow-lg shadow-rose-500/30 scale-110",
                                                !step.isDone && !step.isActive && !step.isRejected && "bg-slate-900 border-white/10 text-slate-500"
                                            )}
                                        >
                                            {step.isRejected ? (
                                                <XCircle className="w-3.5 h-3.5" />
                                            ) : step.isDone ? (
                                                <BadgeCheck className="w-3.5 h-3.5" />
                                            ) : (
                                                <span className="text-[10px] font-black">{idx + 1}</span>
                                            )}
                                        </div>

                                        <div>
                                            <p
                                                className={cn(
                                                    "text-xs font-black uppercase tracking-widest italic transition-colors",
                                                    step.isRejected && "text-red-400 font-bold",
                                                    step.isDone && !step.isRejected && "text-[#006A2E] dark:text-emerald-400",
                                                    step.isActive && !step.isRejected && "text-white font-bold",
                                                    !step.isDone && !step.isActive && !step.isRejected && "text-slate-500"
                                                )}
                                            >
                                                {step.label} {step.isRejected ? "(REJECTED)" : ""}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Exact Executive Action Buttons */}
                    <div className="space-y-4">
                        {/* Zoning Clearance Certificate Document Upload Section */}
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                        <FileCheck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            Zoning Clearance Certificate
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            {isZoningEndorsed ? "Official copy on record" : "Required document before endorsement"}
                                        </p>
                                    </div>
                                </div>
                                {zoningClearanceUrl ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                        <Check className="w-3 h-3" /> Attached
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                                        Required
                                    </span>
                                )}
                            </div>

                            {/* Hidden File Input */}
                            <input
                                ref={clearanceInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                disabled={isZoningEndorsed || isUploadingClearance}
                                onChange={handleClearanceFileUpload}
                            />

                            {/* Upload Area / Current Attached File */}
                            {zoningClearanceUrl ? (
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-emerald-500/30">
                                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                            <FileText className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                                Zoning_Clearance_Certificate.{checkIsPdf(zoningClearanceUrl) ? "pdf" : "jpg"}
                                            </p>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                                Ready for endorsement
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setPdfViewerUrl(zoningClearanceUrl);
                                                setPdfViewerTitle("Zoning Clearance Certificate");
                                                setPdfViewerOpen(true);
                                            }}
                                            className="h-8 px-2.5 text-xs font-bold rounded-lg text-primary hover:bg-primary/10"
                                        >
                                            <Eye className="w-3.5 h-3.5 mr-1" />
                                            View
                                        </Button>
                                        {!isZoningEndorsed && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={isUploadingClearance}
                                                onClick={() => clearanceInputRef.current?.click()}
                                                className="h-8 px-2.5 text-xs font-bold rounded-lg border-slate-200 dark:border-slate-700"
                                            >
                                                Replace
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    disabled={isZoningEndorsed || isUploadingClearance}
                                    onClick={() => clearanceInputRef.current?.click()}
                                    className={cn(
                                        "w-full p-4 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center group",
                                        isUploadingClearance
                                            ? "border-slate-300 bg-slate-50 dark:bg-slate-800/40 cursor-wait"
                                            : "border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/10 cursor-pointer"
                                    )}
                                >
                                    {isUploadingClearance ? (
                                        <div className="flex flex-col items-center gap-1.5 py-1">
                                            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                Uploading certificate to cloud storage...
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-1.5 py-1">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-emerald-600 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 flex items-center justify-center transition-colors">
                                                <Upload className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                    Upload Zoning Clearance Certificate
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Click to browse (PDF, PNG, JPG up to 10MB)
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </button>
                            )}

                            {!zoningClearanceUrl && !isZoningEndorsed && (
                                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold px-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Please upload the signed clearance certificate before clicking endorse.</span>
                                </div>
                            )}
                        </div>

                        {/* Primary Button: ENDORSE FENCING CLEARANCE */}
                        <Button
                            className={cn(
                                "w-full h-14 rounded-2xl font-black italic uppercase tracking-widest text-xs transition-all shadow-xl flex items-center justify-center active:scale-95",
                                isZoningEndorsed
                                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 cursor-not-allowed shadow-none"
                                    : !zoningClearanceUrl
                                        ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-slate-700 shadow-none"
                                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20"
                            )}
                            onClick={() => {
                                if (!zoningClearanceUrl) {
                                    toast.error("Please upload the Zoning Clearance Certificate first.");
                                    return;
                                }
                                setEndorseModalOpen(true);
                            }}
                            disabled={actionLoading || isZoningEndorsed || zoningStatus === "REJECTED" || !zoningClearanceUrl}
                        >
                            {isZoningEndorsed ? "CLEARANCE ENDORSED" : "ENDORSE FENCING CLEARANCE"}
                        </Button>

                        {/* Temporarily hidden: Schedule Ocular Inspection, Request Revision, Decline */}
                        {/*
                        <Button
                            className="w-full h-16 rounded-2xl bg-[#006A2E] hover:bg-[#005224] text-white font-black italic uppercase tracking-widest text-xs transition-all shadow-xl shadow-green-900/20 active:scale-95"
                            onClick={() => setScheduleModalOpen(true)}
                            disabled={actionLoading || zoningStatus === "REJECTED"}
                        >
                            SCHEDULE OCULAR INSPECTION
                        </Button>

                        <div className="flex gap-2.5 w-full">
                            <Button
                                className="flex-1 h-14 rounded-2xl bg-[#ff9800] hover:bg-[#f57c00] text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                                onClick={() => {
                                    setRevisionModalOpen(true);
                                    setIsConfirmingThirdRevision(false);
                                }}
                                disabled={actionLoading || isFinalAttempt || isZoningEndorsed}
                            >
                                REQUEST REVISION
                            </Button>

                            <Button
                                className="flex-1 h-14 rounded-2xl bg-[#e50914] hover:bg-[#b20710] text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                onClick={() => setRejectModalOpen(true)}
                                disabled={actionLoading}
                            >
                                DECLINE
                            </Button>
                        </div>
                        */}
                    </div>
                </div>
            </div>

            {/* Modal: Endorse Fencing Clearance */}
            <Dialog open={endorseModalOpen} onOpenChange={setEndorseModalOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                            <BadgeCheck className="w-5 h-5 text-emerald-600" />
                            Endorse Fencing Clearance
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Certify that the proposed boundary setbacks, easements, and road right-of-way strictly comply with the Comprehensive Land Use Plan (CLUP).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Summary of Assessed Fees */}
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Assessed Zoning Fee:</span>
                                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                                    ₱{Number(totalZoningFeeAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                                {totalZoningFeeAmount > 0 
                                    ? "This fee will be billed to the applicant and forwarded to Treasury." 
                                    : "No fees assessed. Clearance will proceed without fee requirement."}
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Zoning Clearance Remarks / Conditions (Optional)
                            </Label>
                            <Textarea
                                placeholder="Add specific setback conditions, easement restrictions, or inspection notes..."
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
                            onClick={handleEndorse}
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
                            Schedule Ocular Inspection
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Dispatch a zoning officer or field inspector to verify ground boundaries, easements, and lot corner monuments (mohon).
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Date *
                                </Label>
                                <Input
                                    type="date"
                                    value={inspectionDate}
                                    onChange={(e) => setInspectionDate(e.target.value)}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="rounded-xl text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Time *
                                </Label>
                                <Input
                                    type="time"
                                    value={inspectionTime}
                                    onChange={(e) => setInspectionTime(e.target.value)}
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Assigned Inspector *
                            </Label>
                            <Input
                                placeholder="E.g., Zoning Inspector / MPDC Staff"
                                value={inspectorName}
                                onChange={(e) => setInspectorName(e.target.value)}
                                className="rounded-xl text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Inspection Instructions for Citizen (Optional)
                            </Label>
                            <Textarea
                                placeholder="E.g., Ensure site boundary corner monuments are uncovered and lot corners are visible..."
                                value={inspectionNotes}
                                onChange={(e) => setInspectionNotes(e.target.value)}
                                className="min-h-[70px] rounded-xl text-xs"
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

            {/* Modal: Request Revision */}
            <Dialog open={revisionModalOpen} onOpenChange={setRevisionModalOpen}>
                <DialogContent className="max-w-lg bg-white dark:bg-slate-900 rounded-2xl border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase text-amber-600 flex items-center gap-2">
                            <RotateCw className="w-5 h-5 text-amber-600" />
                            Request Document Revision
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Notify the citizen to re-upload erroneous documents or revise site plans. Attempt { (transaction?.revisionCount || 0) + 1 } of 3.
                        </DialogDescription>
                    </DialogHeader>

                    {!isConfirmingThirdRevision ? (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Select Documents Requiring Re-upload:
                                </Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                                    {vaultDocs.filter(d => !!d.url).map((doc) => (
                                        <label
                                            key={doc.key}
                                            className={cn(
                                                "flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all",
                                                selectedRevisionDocs[doc.key]
                                                    ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200 font-bold"
                                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={!!selectedRevisionDocs[doc.key]}
                                                onChange={(e) => setSelectedRevisionDocs(prev => ({
                                                    ...prev,
                                                    [doc.key]: e.target.checked
                                                }))}
                                                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                                            />
                                            <span className="truncate">{doc.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Revision Instructions for Applicant *
                                </Label>
                                <Textarea
                                    placeholder="Detail exactly what needs to be changed (e.g., setback violations, geodetic signature missing, unclear tax declaration)..."
                                    value={revisionRemarks}
                                    onChange={(e) => setRevisionRemarks(e.target.value)}
                                    className="min-h-[90px] rounded-xl text-xs"
                                />
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" onClick={() => setRevisionModalOpen(false)} disabled={actionLoading}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase"
                                    onClick={handleSendRevision}
                                    disabled={actionLoading || !revisionRemarks.trim()}
                                >
                                    {actionLoading ? "Sending..." : "Send Revision Request"}
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <div className="space-y-4 py-2">
                            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-900 dark:text-rose-300">
                                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                        Warning: 3rd & Final Revision Attempt
                                    </h4>
                                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                                        You are about to send this application for revision for the 3rd time. If still invalid after this attempt, the submission will be permanently locked. Proceed?
                                    </p>
                                </div>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="ghost" onClick={() => setIsConfirmingThirdRevision(false)} disabled={actionLoading}>
                                    Back to Editing
                                </Button>
                                <Button
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase"
                                    onClick={executeSendRevision}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? "Sending..." : "Proceed with 3rd Revision"}
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
                            Provide the formal legal or zoning ground for rejecting this fencing permit application.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Reason for Rejection *
                            </Label>
                            <Textarea
                                placeholder="Explain legal violations (e.g. encroachment on public road right-of-way, active land dispute, non-conforming land use)..."
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

            {/* Dedicated Document Viewer Modal with Zoom, Pan, Rotation, & Navigation */}
            <DocumentViewerModal
                isOpen={pdfViewerOpen}
                onClose={() => {
                    setPdfViewerOpen(false);
                    setActiveDocIndex(null);
                }}
                fileUrl={pdfViewerUrl}
                title={pdfViewerTitle}
                documents={vaultDocs.filter(d => !!d.url).map(d => ({ url: d.url, label: d.label }))}
                initialIndex={
                    activeDocIndex !== null
                        ? vaultDocs.filter(d => !!d.url).findIndex(d => d.key === vaultDocs[activeDocIndex]?.key)
                        : 0
                }
            />
        </div>
    );
}
