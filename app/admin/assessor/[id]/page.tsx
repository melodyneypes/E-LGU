"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { getAssessorTransactionById, evaluateAssessorTransaction } from "@/app/admin/transactions/rpt-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import ResidentIdentityProfile from "@/app/admin/treasury/[id]/components/ResidentIdentityProfile";
import { 
    ArrowLeft, 
    Building2, 
    CheckCircle2, 
    Calendar, 
    FileText, 
    Eye, 
    Info, 
    Clock, 
    DollarSign,
    UserCheck,
    MapPin,
    ShieldAlert,
    ChevronUp,
    ChevronDown,
    BadgeCheck,
    Receipt
} from "lucide-react";

const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];
const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"];

function getFileExtension(value: string) {
    try {
        const cleanPath = new URL(value).pathname;
        return cleanPath.split(".").pop()?.toLowerCase() || "";
    } catch {
        return value.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
    }
}

function isImageFile(url?: string | null) {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.startsWith("data:image/") || lower.startsWith("blob:")) return true;
    const ext = getFileExtension(lower);
    if (imageExtensions.includes(ext)) return true;
    if (documentExtensions.includes(ext)) return false;
    return true;
}

export default function AssessorTransactionDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [tx, setTx] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [rejectionRemarks, _setRejectionRemarks] = useState<string>("");
    const [actionPending, setActionPending] = useState<boolean>(false);

    const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState<boolean>(false);
    const [inspectionDate, setInspectionDate] = useState<string>("");
    const [inspectionTime, setInspectionTime] = useState<string>("09:00");
    const [inspectionError, setInspectionError] = useState<string>("");

    const [isProfileOpen, setIsProfileOpen] = useState<boolean>(true);
    // Document Viewer Modal State
    const [viewerOpen, setViewerOpen] = useState<boolean>(false);
    const [activeDocUrl, setActiveDocUrl] = useState<string | null>(null);
    const [activeDocTitle, setActiveDocTitle] = useState<string>("");
    const [activeDocIndex, setActiveDocIndex] = useState<number>(0);
    const [isRequirementsExpanded, setIsRequirementsExpanded] = useState<boolean>(true);

    const todayStr = new Date().toISOString().split("T")[0];

    const loadTransaction = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        const res = await getAssessorTransactionById(id);
        if (res.success && res.data) {
            setTx(res.data);
        } else {
            toast.error(res.error || "Failed to load transaction details.");
        }
        setLoading(false);
    }, [id]);

    useEffect(() => {
        loadTransaction();
    }, [loadTransaction]);

    const handleScheduleInspectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inspectionDate) {
            setInspectionError("Please select an inspection date.");
            return;
        }
        if (inspectionDate < todayStr) {
            setInspectionError("Past dates are not allowed. Please choose today or a future date.");
            return;
        }
        if (!inspectionTime) {
            setInspectionError("Please select an inspection time slot.");
            return;
        }

        setInspectionError("");
        setActionPending(true);
        const res = await evaluateAssessorTransaction(
            tx.id,
            "SCHEDULE_INSPECTION",
            rejectionRemarks,
            { date: inspectionDate, time: inspectionTime }
        );
        setActionPending(false);

        if (res.success) {
            toast.success(`Ocular field inspection scheduled for ${inspectionDate} at ${inspectionTime}!`);
            setIsInspectionDialogOpen(false);
            loadTransaction();
        } else {
            toast.error(res.error || "Failed to schedule inspection.");
        }
    };

    const _handleAction = async (action: "APPROVE" | "REJECT" | "SCHEDULE_INSPECTION") => {
        if (!tx) return;
        if (action === "REJECT" && !rejectionRemarks.trim()) {
            toast.error("Please enter a reason for rejection.");
            return;
        }

        setActionPending(true);
        const res = await evaluateAssessorTransaction(tx.id, action, rejectionRemarks);
        setActionPending(false);

        if (res.success) {
            toast.success(`Application updated successfully (${action})!`);
            loadTransaction();
        } else {
            toast.error(res.error || "Action failed.");
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
                <div className="h-8 w-40 bg-slate-900 animate-pulse rounded-lg" />
                <div className="h-64 bg-slate-900/60 animate-pulse rounded-3xl" />
                <div className="h-96 bg-slate-900/60 animate-pulse rounded-3xl" />
            </div>
        );
    }

    if (!tx) {
        return (
            <div className="p-8 max-w-3xl mx-auto text-center space-y-4">
                <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
                <h2 className="text-2xl font-black uppercase text-white italic">Application Not Found</h2>
                <p className="text-slate-400 text-sm">The requested transaction record could not be loaded.</p>
                <Button asChild className="rounded-xl bg-rose-600 hover:bg-rose-700">
                    <Link href="/admin/assessor"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessor Hub</Link>
                </Button>
            </div>
        );
    }

    const rpt = tx.realPropertyTax || {};
    const catCode = rpt.rptCategory || tx.type?.code || "";
    const _isCategory1 = catCode === "RPT_CAT1";

    const addData = (typeof tx.additionalData === "string" ? JSON.parse(tx.additionalData || "{}") : tx.additionalData) || {};
    const rawSnapshot = typeof tx.residentSnapshot === "string"
        ? (() => { try { return JSON.parse(tx.residentSnapshot); } catch { return {}; } })()
        : (tx.residentSnapshot || {});
    const baseResident = tx.user?.residentProfile || rawSnapshot || {};

    // Prioritize name from snapshot (e.g. {"name": "JHON EMIL NILO"}) or user object
    const applicantFullName = (
        rawSnapshot.name ||
        baseResident.fullName ||
        `${baseResident.firstName || ""} ${baseResident.lastName || ""}`.trim() ||
        tx.user?.name ||
        "Transacting Citizen"
    ).trim();

    const nameParts = applicantFullName.split(" ").filter(Boolean);
    const parsedFirstName = baseResident.firstName || (nameParts.length > 1 ? nameParts.slice(0, -1).join(" ") : nameParts[0] || "");
    const parsedLastName = baseResident.lastName || (nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");

    const normalizedResident = {
        ...baseResident,
        ...rawSnapshot,
        firstName: parsedFirstName,
        lastName: parsedLastName,
        fullName: applicantFullName,
        name: applicantFullName,
        email: rawSnapshot.email || baseResident.email || tx.user?.email || ""
    };

    const resident = normalizedResident;
    const applicantName = applicantFullName;
    const ownerName = rpt.ownerName || addData.ownerName || "PROPERTY OWNER";
    const isApplicantTheOwner = applicantName.toLowerCase().replace(/\s+/g, "") === ownerName.toLowerCase().replace(/\s+/g, "");
    const tdn = rpt.tdn || addData.tdn || "N/A";
    const pin = rpt.pin || addData.pin || "N/A";
    const barangay = rpt.barangay || addData.barangay || "Mapandan";

    const totalTaxDue = Number(rpt.totalTaxDue || addData.totalTaxDue || tx.totalAmount || 0);
    const basicTax = Number(rpt.basicTax || addData.basicTax || (totalTaxDue > 0 ? totalTaxDue / 2 : 0));
    const sefTax = Number(rpt.sefTax || addData.sefTax || (totalTaxDue > 0 ? totalTaxDue / 2 : 0));
    const assessedValue = Number(rpt.assessedValue || addData.assessedValue || (basicTax > 0 ? basicTax / 0.01 : 0));
    const taxYear = rpt.taxYear || addData.taxYear || new Date().getFullYear().toString();

    const validIdUrl = rpt.validIdUrl || addData.validIdUrl;

    const attachments = [
        { label: "Previous O.R. / SOA", url: rpt.previousOrUrl || addData.previousOrUrl },
        { label: "Building / Occupancy Permit", url: rpt.buildingPermitUrl || addData.buildingPermitUrl },
        { label: "Deed of Sale", url: rpt.deedOfSaleUrl || addData.deedOfSaleUrl },
        { label: "Land Title (TCT)", url: rpt.titleUrl || addData.titleUrl },
        { label: "BIR eCAR Certificate", url: rpt.birEcarUrl || addData.birEcarUrl },
    ].filter(d => Boolean(d.url));

    // Combine all docs for seamless multi-document modal navigation
    const allViewableDocs = [
        ...(validIdUrl ? [{ label: "Valid Government ID", url: validIdUrl }] : []),
        ...attachments
    ];

    const safeFormatDate = (dateStr: any) => {
        try {
            if (!dateStr) return "N/A";
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return String(dateStr);
            return format(d, "MMM dd, yyyy");
        } catch {
            return String(dateStr);
        }
    };

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-slate-100 animate-in fade-in duration-500">
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <Link
                    href="/admin/assessor"
                    className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider italic"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessor Hub
                </Link>

                <div className="flex items-center gap-3">
                    <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 font-mono font-black text-xs tracking-wider">
                        TICKET: {tx.queueNumber || "N/A"}
                    </Badge>
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest italic">
                        TYPE OF REQUEST: {rpt.assessorStatus === "APPROVED" ? "APPROVED" : tx.status === "FOR_REQUESTING" ? "SUBMITTED" : tx.status}
                    </Badge>
                </div>
            </div>

            {/* Main Header Banner */}
            <div className="bg-[#0c1017] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
                <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest italic">
                            <Info className="w-3.5 h-3.5" /> Transaction Information
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter text-white">
                            {tx.type?.name || "Real Property Tax Application"}
                        </h1>
                        <p className="text-slate-400 text-xs font-semibold italic">
                            Municipal Assessor Property Declaration & Tax Assessment Evaluation Gateway
                        </p>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-rose-400" />
                    </div>
                </div>
            </div>

            {/* Grid Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Applicant & Property Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Property Assessment Profile & Tax Computation (Matching Treasury layout) */}
                    <Card className="rounded-3xl border border-white/5 bg-[#0f1420] shadow-2xl text-white py-0 gap-0">
                        <CardContent className="px-6 md:px-8 py-4 space-y-4">
                            <div
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="flex items-center justify-between cursor-pointer select-none border-b border-white/5 pb-3"
                            >
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400 italic block">
                                        Property Assessment & Tax Record
                                    </span>
                                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">
                                        {applicantName}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:text-white">
                                    {isProfileOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                </Button>
                            </div>

                            {isProfileOpen && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Flattened Property Specs Grid (No Nested Cards) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5 text-xs">
                                        <div className="space-y-1 col-span-2">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px] block">
                                                Registered Property Owner
                                            </span>
                                            <p className="font-black text-sm tracking-wide text-white uppercase break-words">
                                                {ownerName}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tax Declaration No. (TDN)</span>
                                            <p className="font-mono font-black text-sm tracking-wide text-white truncate">
                                                {tdn}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Property Index No. (PIN)</span>
                                            <p className="font-mono font-black text-sm tracking-wide text-white truncate">
                                                {pin}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Property Classification</span>
                                            <p className="font-black uppercase text-slate-200 truncate">
                                                {addData.propertyType || rpt.propertyType || "RESIDENTIAL"}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Tax Assessment Year</span>
                                            <p className="font-mono font-black text-amber-400">
                                                {taxYear}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Barangay Location</span>
                                            <p className="font-black uppercase text-slate-200 truncate">
                                                {barangay}
                                            </p>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Assessed Value (AV)</span>
                                            <p className="font-mono font-black text-rose-400 text-sm">
                                                ₱{assessedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>

                                        <div className="space-y-1 col-span-2">
                                            <span className="text-slate-400 font-bold uppercase tracking-widest text-[9px]">Complete Property Address</span>
                                            <p className="font-bold text-slate-200">
                                                {addData.propertyAddress || rpt.propertyAddress || `${barangay}, Mapandan, Pangasinan`}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Flattened Tax Computation Breakdown (No Nested Card) */}
                                    <div className="pt-4 border-t border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 italic">
                                                Tax Computation Breakdown
                                            </h3>
                                        </div>

                                        <div className="space-y-2.5 pt-1 text-xs font-semibold">
                                            <div className="flex justify-between items-center text-slate-400">
                                                <span>Basic Real Property Tax (1% of Assessed Value)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{basicTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="flex justify-between items-center text-slate-400">
                                                <span>Special Education Fund / SEF Tax (1% of Assessed Value)</span>
                                                <span className="font-mono font-bold text-slate-200">
                                                    ₱{sefTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>

                                            <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                                                <span className="text-sm font-black uppercase italic tracking-wider text-white">Total Amount Due</span>
                                                <span className="text-2xl font-black italic tracking-tighter text-rose-500 font-mono">
                                                    ₱{totalTaxDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* RESIDENT IDENTITY PROFILE (Applicant / Transacting Citizen) */}
                    <ResidentIdentityProfile
                        resident={resident}
                        safeFormatDate={safeFormatDate}
                        themeColor="#e11d48"
                        titleColorText="Applicant"
                        titleWhiteText="Profile"
                        subtitleText={isApplicantTheOwner ? "Applicant is the Registered Property Owner" : `Transacting Citizen • Representative of ${ownerName}`}
                        relationship={isApplicantTheOwner ? "Registered Owner" : "Authorized Representative / Applicant"}
                        relationshipLabel="Applicant Role"
                        transactionId={tx.id}
                        canEdit={false}
                        onProfileUpdated={loadTransaction}
                    />

                    {/* ALL THE REQUIREMENTS — Accordion & Image Preview (Matching BPLO design) */}
                    <Card className="rounded-[2.5rem] bg-[#0c1017] border border-white/5 shadow-2xl overflow-hidden text-slate-100 p-8 space-y-6">
                        <button
                            type="button"
                            onClick={() => setIsRequirementsExpanded(!isRequirementsExpanded)}
                            className="flex items-center justify-between w-full text-left focus:outline-none group cursor-pointer"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-500 shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">
                                        All the Requirements
                                    </h3>
                                    <span className="text-[10px] text-slate-400 italic font-semibold block mt-0.5">
                                        {allViewableDocs.length} document{allViewableDocs.length !== 1 ? 's' : ''} submitted
                                    </span>
                                </div>
                            </div>
                            <div className="text-slate-400 group-hover:text-white transition-colors">
                                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-white/30 transition-all bg-white/[0.02]">
                                    {isRequirementsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>
                        </button>

                        {isRequirementsExpanded && (
                            <div className="pt-6 border-t border-white/5 animate-in fade-in duration-300">
                                {allViewableDocs.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500 text-xs italic">
                                        No requirements or documents submitted for this application.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {allViewableDocs.map((doc, idx) => {
                                            const isImg = isImageFile(doc.url);
                                            const ext = getFileExtension(doc.url).toUpperCase();

                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveDocUrl(doc.url);
                                                        setActiveDocTitle(doc.label);
                                                        setActiveDocIndex(idx);
                                                        setViewerOpen(true);
                                                    }}
                                                    className="group relative rounded-[1.75rem] overflow-hidden aspect-video border border-white/10 bg-black/40 hover:border-rose-500/50 transition-all select-none text-left w-full block cursor-pointer shadow-xl"
                                                >
                                                    {isImg ? (
                                                        <>
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={doc.url}
                                                                alt={doc.label}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                                                            />
                                                            {/* Exact Floating Bottom Pill Badge */}
                                                            <div className="absolute bottom-3 left-3 right-3 sm:right-auto max-w-[90%] bg-black/75 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[10px] truncate shadow-lg">
                                                                {doc.label}
                                                            </div>
                                                            {/* Center Hover Action */}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                <div className="px-5 py-2.5 rounded-full bg-rose-600 text-white font-black italic uppercase tracking-widest text-[10px] shadow-2xl border border-white/20 group-hover:scale-105 transition-transform flex items-center gap-1.5">
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    <span>View</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="relative h-full w-full flex flex-col items-center justify-center gap-3 p-6 bg-gradient-to-br from-slate-900 to-[#0c1017]">
                                                            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                                <FileText className="w-7 h-7 text-rose-500" />
                                                            </div>
                                                            <div className="text-center min-w-0">
                                                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                                                    {ext || "DOC"} Document
                                                                </p>
                                                                <p className="mt-1 text-sm font-black italic uppercase tracking-tight text-white truncate max-w-[220px]">
                                                                    {doc.label}
                                                                </p>
                                                            </div>
                                                            <div className="absolute bottom-3 left-3 right-3 sm:right-auto max-w-[90%] bg-black/75 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[10px] truncate">
                                                                {doc.label}
                                                            </div>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right Column: Status Timeline & Action Controls */}
                <div className="space-y-6">
                    {/* Status Tracking Card */}
                    <Card className="bg-[#0c1017] border-white/5 rounded-3xl shadow-xl overflow-hidden text-slate-100">
                        <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-rose-400 italic">
                                <Clock className="w-4 h-4 text-rose-400" /> Evaluation Workflow Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 text-xs">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 uppercase italic">1. Application Submitted</div>
                                        <div className="text-[10px] text-slate-500">{format(new Date(tx.createdAt), "MMM dd, yyyy hh:mm a")}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                                        tx.status === "FOR_INSPECTION" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" :
                                        tx.status === "FOR_REQUESTING" || rpt.assessorStatus === "APPROVED" || tx.status === "PAID" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                                        "bg-white/5 border-white/10 text-slate-500"
                                    }`}>
                                        <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 uppercase italic">2. Assessor Field Inspection / Evaluation</div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            {rpt.assessorStatus === "APPROVED" ? "Approved by Assessor" :
                                             (tx.additionalData as any)?.inspectionDate ? `Scheduled: ${format(new Date((tx.additionalData as any).inspectionDate), "MMM dd, yyyy")} @ ${(tx.additionalData as any).inspectionTime || ""}` :
                                             rpt.assessorStatus || "Pending Assessor Review"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                                        rpt.assessorStatus === "APPROVED" || tx.status === "PAID" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                                        "bg-white/5 border-white/10 text-slate-500"
                                    }`}>
                                        <DollarSign className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 uppercase italic">3. Treasury Billing & Collection</div>
                                        <div className="text-[10px] text-slate-500">
                                            {tx.status === "PAID" ? "Paid & Cleared" : "Awaiting Treasury Billing"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Category 1 Notice Card - Standalone */}
                    <div className="p-6 rounded-3xl bg-rose-500/[0.06] border border-rose-500/20 text-rose-300 space-y-2.5 shadow-xl backdrop-blur-sm">
                        <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-rose-400">
                            <Info className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>FOR VIEWING ONLY (CATEGORY 1)</span>
                        </div>
                        <p className="text-xs leading-relaxed font-medium text-rose-200/90">
                            Category 1 (Routine Annual Tax Payment & Tax Clearance) is for viewing only under the Municipal Assessor Office. Billing and collection are processed directly by the Treasury Department.
                        </p>
                    </div>
                </div>
            </div>

            {/* Schedule Inspection Modal */}
            <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
                <DialogContent className="max-w-md bg-[#0c1017] border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2 text-rose-400">
                            <Calendar className="w-5 h-5 text-rose-400" /> Schedule Field Inspection
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 italic">
                            Set the official date and time slot for the Municipal Assessor ocular field assessment.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleScheduleInspectionSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 italic block">
                                Inspection Date <span className="text-rose-400">*</span>
                            </label>
                            <Input
                                type="date"
                                min={todayStr}
                                value={inspectionDate}
                                onChange={(e) => {
                                    setInspectionDate(e.target.value);
                                    if (e.target.value < todayStr) {
                                        setInspectionError("Past dates are not allowed. Please choose today or a future date.");
                                    } else {
                                        setInspectionError("");
                                    }
                                }}
                                className={`h-11 rounded-xl bg-white/[0.03] border-white/10 text-xs font-bold text-slate-100 ${inspectionError && inspectionDate < todayStr ? "border-red-500 ring-1 ring-red-500" : ""}`}
                                required
                            />
                            {inspectionError && inspectionDate < todayStr && (
                                <p className="text-[10px] text-red-500 font-medium">Past dates are not allowed. Please choose today or a future date.</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 italic block">
                                Time Slot <span className="text-rose-400">*</span>
                            </label>
                            <Input
                                type="time"
                                value={inspectionTime}
                                onChange={(e) => setInspectionTime(e.target.value)}
                                className="h-11 rounded-xl bg-white/[0.03] border-white/10 text-xs font-bold text-slate-100"
                                required
                            />
                        </div>

                        {inspectionError && inspectionDate >= todayStr && (
                            <p className="text-[10px] text-red-500 font-medium">{inspectionError}</p>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-white/5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInspectionDialogOpen(false)}
                                className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 text-xs font-bold uppercase"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={actionPending || (!!inspectionDate && inspectionDate < todayStr)}
                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider italic"
                            >
                                {actionPending ? "Scheduling..." : "Confirm & Schedule Inspection"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* In-App Document Viewer Modal */}
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                fileUrl={activeDocUrl}
                title={activeDocTitle || "Document Viewer"}
                themeColor="#e11d48"
                documents={allViewableDocs}
                initialIndex={activeDocIndex}
            />
        </div>
    );
}
