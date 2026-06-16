/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useRef, useEffect, use, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    BadgeCheck,
    Check,
    ZoomIn,
    ZoomOut,
    RotateCw,
    RefreshCcw
} from "lucide-react";
import Image from "next/image";
import { isValidUrl } from "@/utils/image";
import { toast } from "sonner";
import {
    getTransactionById,
    rejectTransaction,
    sendForRevision,
    evaluateCedulaTransaction,
    markForReinspection,
    getSystemSettingAction
} from "@/app/admin/transactions/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";

interface PageProps {
    params: Promise<{ id: string }>;
}

function LightboxView({ src, alt, label }: { src: string; alt: string; label: string }) {
    const [scale, setScale] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY < 0 ? 0.15 : -0.15;
        setScale(prev => Math.min(Math.max(prev + delta, 0.5), 5));
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const reset = () => {
        setScale(1);
        setRotate(0);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex flex-col items-center justify-center gap-6 outline-none">
            <DialogHeader className="sr-only">
                <DialogTitle>{label}</DialogTitle>
            </DialogHeader>

            <div
                className="relative w-full h-[75vh] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing select-none"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{ 
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotate}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                    }}
                >
                    <Image
                        src={isValidUrl(src) ? src : "/placeholder.png"}
                        alt={alt}
                        fill
                        className="object-contain"
                        priority
                        draggable={false}
                    />
                </div>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-1 pr-4 border-r border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic whitespace-nowrap">{label}</p>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full hover:bg-white/10 text-white transition-all"
                        onClick={() => setScale(s => Math.max(s - 0.2, 0.5))}
                    >
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <div className="w-12 text-center text-[10px] font-black text-white/50 italic">
                        {Math.round(scale * 100)}%
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-full hover:bg-white/10 text-white transition-all"
                        onClick={() => setScale(s => Math.min(s + 0.2, 5))}
                    >
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>

                <div className="w-px h-4 bg-white/10 mx-2" />

                <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full hover:bg-white/10 text-white transition-all"
                    onClick={() => setRotate(r => (r + 90) % 360)}
                    title="Rotate 90°"
                >
                    <RotateCw className="w-4 h-4" />
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full hover:bg-white/10 text-white transition-all"
                    onClick={reset}
                    title="Reset View"
                >
                    <RefreshCcw className="w-4 h-4" />
                </Button>
            </div>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] italic">Scroll to Zoom • Drag to Pan Active</p>
        </DialogContent>
    );
}

export default function BuildingPermitReinspectionPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForcedView = searchParams.get("view") === "true";
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const backUrl = userRole === "ENGINEER" ? "/admin/engineer" : "/admin/treasury";

    const [transaction, setTransaction] = useState<any>(null);
    const isViewOnly = isForcedView || (transaction && transaction.status !== "FOR_REINSPECTION");
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [remarks, setRemarks] = useState("");
    const remarksRef = useRef<HTMLTextAreaElement>(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);
    const [themeColor, setThemeColor] = useState<string>("#2563eb");

    // Re-inspection State
    const [isReinspecting, setIsReinspecting] = useState(false);
    const [reinspectReason, setReinspectReason] = useState("");
    const [reinspectDate, setReinspectDate] = useState("");
    const [reinspectTime, setReinspectTime] = useState("");
    const [reinspectInspector, setReinspectInspector] = useState("");
    const [reinspectType, setReinspectType] = useState("Structural Inspection");

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                setTransaction(res.data);
            } else {
                toast.error(res.error || "Failed to load transaction");
            }
        } catch {
            toast.error("An error occurred while fetching details");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTransaction();
        getSystemSettingAction("theme_color", "#2563eb").then(res => {
            if (res.success && res.data) setThemeColor(res.data);
        });
    }, [fetchTransaction]);

    const handleEvaluate = async () => {
        setActionLoading(true);
        try {
            const res = await evaluateCedulaTransaction(id, 0, remarks);
            if (res.success) {
                toast.success("Inspection Approved Successfully");
                router.push(`/admin/engineer/${id}/fees`);
            } else {
                toast.error(res.error || "Failed");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleReinspect = async () => {
        if (!reinspectReason) { toast.error("Reason required"); return; }
        if (!reinspectDate || !reinspectTime || !reinspectInspector) { toast.error("Please fill in Date, Time, and Inspector"); return; }
        setActionLoading(true);
        try {
            const res = await markForReinspection(id, reinspectReason, {
                date: reinspectDate,
                time: reinspectTime,
                inspectorName: reinspectInspector,
                type: reinspectType
            });
            if (res.success) {
                toast.success("Application marked for Re-Inspection");
                router.push(backUrl);
            } else {
                toast.error(res.error || "Failed");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!remarks) { toast.error("Remarks required"); return; }
        setActionLoading(true);
        try {
            const res = await rejectTransaction(id, remarks);
            if (res.success) {
                toast.success("Rejected successfully");
                router.push(backUrl);
            } else {
                toast.error(res.error || "Failed");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleRequestRevision = async () => {
        if (!remarks) { toast.error("Remarks required"); return; }
        setActionLoading(true);
        try {
            const res = await sendForRevision(id, remarks);
            if (res.success) {
                toast.success("Sent back for revision");
                router.push(backUrl);
            } else {
                toast.error(res.error || "Failed");
            }
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!transaction) return <div className="p-20 text-center dark:text-white">Protocol Error: Transaction Inaccessible</div>;

    const additional = transaction.additionalData || {};
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};

    /*
    const renderRequirementsGrid = () => (
        <div className="grid grid-cols-2 gap-4">
            {[
                { url: additional?.documents?.newIdFile || resident?.idFileUrl, label: "Applicant Valid ID" },
                { url: additional?.documents?.tctFile, label: "TCT / Land Title" },
                ...[
                    "Barangay Clearance/Certification",
                    "Tax Declaration",
                    "Land Title",
                    "Community Tax Certificate",
                    "Latest Tax Receipts",
                    "Electrical & Sanitary Permit",
                    "Adjoining Owners Confirmation",
                    "Locational Clearance",
                    "Affidavit of Consent",
                    "Affidavit of Adjoining Owners",
                    "Signed & Sealed Plans"
                ].map((label, idx) => ({ url: additional?.documents?.[`req_${idx}`], label })),
                ...[
                    "1. Electrical Permit",
                    "2. Plumbing Permit",
                    "3. Sanitary Permit",
                    "4. Excavation & Ground Preparation Permit",
                    "5. Fencing Permit",
                    "6. Scaffolding Permit",
                    "7. Mechanical Permit"
                ].map((label, idx) => ({ url: additional?.documents?.[`permit_${idx}`], label }))
            ].filter(doc => doc.url).map((doc, i) => (
                <Dialog key={i}>
                    <DialogTrigger asChild>
                        <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center cursor-zoom-in">
                            <Image src={isValidUrl(doc.url) ? doc.url : "/placeholder.png"} alt={doc.label} fill className="object-cover group-hover:scale-105 transition-transform animate-in fade-in duration-300" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                    <ZoomIn className="w-5 h-5 text-white" />
                                </div>
                            </div>
                            <div className="absolute bottom-2 left-2 right-2 z-10">
                                <span className="text-[8px] font-black uppercase tracking-wider text-white bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md truncate block max-w-full text-center italic shadow-sm">
                                    {doc.label}
                                </span>
                            </div>
                        </div>
                    </DialogTrigger>
                    <LightboxView src={doc.url} alt={doc.label} label={doc.label} />
                </Dialog>
            ))}
        </div>
    );
    */

    const steps = [
        { id: "FOR_REQUESTING", label: "EVALUATION" },
        { id: "FOR_INSPECTION", label: "INSPECTION" },
        { id: "FOR_REINSPECTION", label: "RE-INSPECTION" },
        { id: "EVALUATED", label: "FEE ASSESSMENT" }
    ];
    const getStepIndex = (status: string) => {
        if (status === "FOR_REQUESTING" || status === "FOR_REVISION") return 0;
        if (status === "FOR_INSPECTION") return 1;
        if (status === "FOR_REINSPECTION") return 2;
        if (status === "EVALUATED" || status === "UNPAID" || status === "PAYMENT_SUBMITTED" || status === "PAID") return 3;
        return 4; // PAID, FOR_PROCESSING, FOR_CLAIM, RELEASED
    };
    const currentStepIdx = getStepIndex(transaction.status);

    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <div className="flex items-center gap-4">
                    <Link href={backUrl} prefetch={false}>
                        <Button variant="ghost" className="gap-2 text-slate-400 dark:text-slate-500 font-bold hover:text-primary">
                            <ArrowLeft className="w-4 h-4" /> BACK TO DASHBOARD
                        </Button>
                    </Link>
                    <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                    <Link href={`/admin/engineer/${id}/evaluation?view=true`} prefetch={false}>
                        <Button variant="outline" className="h-9 gap-2 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/5 font-black text-[10px] uppercase tracking-wider rounded-xl">
                            <ArrowLeft className="w-3.5 h-3.5" /> View Evaluation Phase
                        </Button>
                    </Link>
                    <Link href={`/admin/engineer/${id}/inspection?view=true`} prefetch={false}>
                        <Button variant="outline" className="h-9 gap-2 border-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/5 font-black text-[10px] uppercase tracking-wider rounded-xl">
                            <ArrowLeft className="w-3.5 h-3.5" /> View Site Inspection Phase
                        </Button>
                    </Link>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-2">
                        <Badge className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-1 rounded-xl">
                            Revision Count: {transaction?.revisionCount || 0} / 3
                        </Badge>
                        <Badge className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-1 rounded-xl">
                            Re-inspection Count: {transaction?.additionalData?.reinspectionCount || 0} / 3
                        </Badge>
                    </div>
                    <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-primary/20 text-primary bg-primary/5 px-4 py-1">
                        Re-inspection Portal Active
                    </Badge>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {isViewOnly && (
                    <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">📜 Archival Phase View Mode</p>
                            <p className="text-[11px] font-medium opacity-90">{transaction?.status === "REJECTED" ? "This building permit application has been officially rejected." : "You are reviewing the historical Re-inspection phase record in read-only mode."}</p>
                        </div>
                        {transaction?.status !== "REJECTED" && (
                            <Button onClick={() => router.push(`/admin/engineer/${id}`)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase h-10 px-4 rounded-xl active:scale-95 transition-all border-none">
                                Return to Active Phase
                            </Button>
                        )}
                    </div>
                )}

                {/* Left Column */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 dark:from-blue-500/5 dark:to-cyan-500/5 border border-blue-500/20 dark:border-blue-500/10 rounded-[2rem] p-8 flex items-center justify-between shadow-sm relative overflow-hidden">
                        <div className="space-y-2 relative z-10">
                            <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.2em] italic">Phase 3: Field Re-Verification</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">RE-INSPECTION & HISTORY</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Field Re-inspection in progress. Verify previous defects are resolved. Automatic rejection triggers on the 4th failure.</p>
                        </div>
                        <div className="text-5xl font-black italic text-blue-500/20 select-none hidden md:block">RE-INSPECT</div>
                    </div>

                    {/* Active Re-Inspection Details */}
                    {additional?.inspectionSchedule && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-blue-500/20 dark:border-blue-500/10 space-y-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[100px] pointer-events-none" />
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-blue-600 dark:text-blue-400 leading-none">
                                    Active <span className="text-[#1e293b] dark:text-white">Re-Inspection schedule</span>
                                </h2>
                                <p className="text-[9px] font-black uppercase text-blue-400 dark:text-blue-500 tracking-[0.2em] italic mt-2">Active Scheduled Re-visit</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Inspection Type</label>
                                    <div className="h-12 flex items-center px-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-bold text-sm text-blue-900 dark:text-blue-100">{additional.inspectionSchedule.type || "--"}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Date & Time</label>
                                    <div className="h-12 flex items-center px-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-bold text-sm text-blue-900 dark:text-blue-100">{additional.inspectionSchedule.date} @ {additional.inspectionSchedule.time}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Assigned Inspector</label>
                                    <div className="h-12 flex items-center px-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-bold text-sm text-blue-900 dark:text-blue-100">{additional.inspectionSchedule.inspectorName || "--"}</div>
                                </div>
                                {additional.inspectionSchedule.notes && (
                                    <div className="space-y-2 md:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Engineer&apos;s Instructions</label>
                                        <div className="p-5 bg-blue-50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-xl font-medium italic text-sm text-blue-800 dark:text-blue-200 min-h-[48px]">&quot;{additional.inspectionSchedule.notes}&quot;</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* History Log */}
                    {additional?.reinspectionHistory && additional.reinspectionHistory.length > 0 && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-white/5 space-y-8">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-800 dark:text-white leading-none">
                                    Inspection <span className="text-primary">History Log</span>
                                </h2>
                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] italic mt-2">Previous Schedules & Re-inspections Dossier</p>
                            </div>
                            <div className="space-y-3">
                                {additional.reinspectionHistory.map((h: any, idx: number) => {
                                    const isOrig = h.count === 0 || h.isOriginal === true;
                                    return (
                                        <div key={idx} className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-lg flex items-center justify-center font-black italic text-[10px]",
                                                    isOrig ? "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400" : "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                                                )}>
                                                    {isOrig ? "Orig" : `#${h.count}`}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 dark:text-slate-200">{isOrig ? "Original Inspection" : "Re-inspection Attempt"}</p>
                                                    <p className="text-[10px] text-slate-400">{isOrig ? `${h.date} @ ${h.time}` : (h.date ? new Date(h.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Date Unknown")}</p>
                                                </div>
                                            </div>
                                            <div className="md:text-right max-w-md">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{isOrig ? "Inspector & Type" : "Reason for Re-inspection"}</p>
                                                <p className="font-medium italic text-slate-600 dark:text-slate-300">{isOrig ? `${h.inspectorName || 'N/A'} (${h.type || 'Site Inspection'})` : `"${h.reason}"`}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Profile */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Resident <span className="text-primary">Identity Profile</span>
                            </h2>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] italic mt-2">Verified Citizen Data Dossier</p>
                        </div>
                        <div className="grid grid-cols-12 gap-6">
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">First Name</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.firstName || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Middle Name</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.middleName || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Last Name</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.lastName || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Suffix</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.suffix || "--"}</div>
                            </div>

                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Birth Date</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                    {resident?.dateOfBirth ? new Date(resident.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "--"}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-2 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Age</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                    {resident?.age ?? (resident?.dateOfBirth ? Math.floor((new Date().getTime() - new Date(resident.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : "--")}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Civil Status</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase">{resident?.civilStatus || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-4 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Contact Number</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.contactNumber || "--"}</div>
                            </div>

                            <div className="col-span-12 md:col-span-6 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Occupation</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.occupation || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-6 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Barangay & Complete Address</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                    {resident?.houseNumber || ""} {resident?.street || ""} {resident?.barangay ? `${resident.barangay}, Mapandan, Pangasinan` : "--"}
                                </div>
                            </div>

                            {/* Government ID Section */}
                            {(() => {
                                const newIdFile = additional?.documents?.newIdFile;
                                const newIdFileBack = additional?.documents?.newIdFileBack;
                                if (newIdFile) {
                                    return (
                                        <div className="col-span-12 space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                                            <div className="flex items-center gap-2">
                                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Uploaded Government ID</label>
                                            </div>
                                            <div className="grid grid-cols-2 gap-6 max-w-2xl">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex flex-col cursor-zoom-in">
                                                            <p className="text-[9px] font-black text-center py-1.5 text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">Government ID (Front)</p>
                                                            <div className="relative flex-1 w-full h-full min-h-[120px]">
                                                                <Image src={isValidUrl(newIdFile) ? newIdFile : "/placeholder.png"} alt="Government ID Front" fill className="object-contain p-2 group-hover:scale-105 transition-transform" />
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                                    <ZoomIn className="w-4 h-4 text-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogTrigger>
                                                    <LightboxView src={newIdFile} alt="Government ID Front" label="Government ID Front" />
                                                </Dialog>

                                                {newIdFileBack && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex flex-col cursor-zoom-in">
                                                                <p className="text-[9px] font-black text-center py-1.5 text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">Government ID (Back)</p>
                                                                <div className="relative flex-1 w-full h-full min-h-[120px]">
                                                                    <Image src={isValidUrl(newIdFileBack) ? newIdFileBack : "/placeholder.png"} alt="Government ID Back" fill className="object-contain p-2 group-hover:scale-105 transition-transform" />
                                                                </div>
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                                        <ZoomIn className="w-4 h-4 text-white" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </DialogTrigger>
                                                        <LightboxView src={newIdFileBack} alt="Government ID Back" label="Government ID Back" />
                                                    </Dialog>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                const idFront = additional?.validIdFront || additional?.idFrontUrl || resident?.idFrontUrl || resident?.idFileUrl;
                                const idBack = additional?.validIdBack || additional?.idBackUrl || resident?.idBackUrl;
                                if (!idFront && !idBack) return null;
                                return (
                                    <div className="col-span-12 space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Resident ID Verification Documents</label>
                                            {resident?.idType && (
                                                <Badge variant="outline" className="text-[9px] font-bold uppercase border-primary/20 text-primary py-0 px-2 h-5">
                                                    ID Type: {resident.idType}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 max-w-2xl">
                                            {idFront && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex flex-col cursor-zoom-in">
                                                            <p className="text-[9px] font-black text-center py-1.5 text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">Front ID</p>
                                                            <div className="relative flex-1 w-full h-full min-h-[120px]">
                                                                <Image src={isValidUrl(idFront) ? idFront : "/placeholder.png"} alt="Front ID" fill className="object-contain p-2 group-hover:scale-105 transition-transform" />
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                                    <ZoomIn className="w-4 h-4 text-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogTrigger>
                                                    <LightboxView src={idFront} alt="Front ID" label="Front ID" />
                                                </Dialog>
                                            )}
                                            {idBack && (
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex flex-col cursor-zoom-in">
                                                            <p className="text-[9px] font-black text-center py-1.5 text-slate-400 dark:text-slate-500 uppercase tracking-widest border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">Back ID</p>
                                                            <div className="relative flex-1 w-full h-full min-h-[120px]">
                                                                <Image src={isValidUrl(idBack) ? idBack : "/placeholder.png"} alt="Back ID" fill className="object-contain p-2 group-hover:scale-105 transition-transform" />
                                                            </div>
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                                    <ZoomIn className="w-4 h-4 text-white" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </DialogTrigger>
                                                    <LightboxView src={idBack} alt="Back ID" label="Back ID" />
                                                </Dialog>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Applicant E-Signature Section */}
                            {additional?.signature && (
                                <div className="col-span-12 space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Applicant Digital E-Signature</label>
                                    <div className="max-w-[240px] bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 p-4">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <div className="group relative aspect-video rounded-xl overflow-hidden flex items-center justify-center cursor-zoom-in bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5">
                                                    <img src={additional.signature} alt="E-Signature" className="max-h-20 object-contain p-2 group-hover:scale-105 transition-transform" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                            <ZoomIn className="w-4 h-4 text-white" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <LightboxView src={additional.signature} alt="E-Signature" label="Applicant E-Signature" />
                                        </Dialog>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Application Details */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Application <span className="text-primary">Details</span>
                            </h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Description of Work</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.descriptionOfWork || "--"}</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Occupancy Use</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.occupancyUse || "--"}</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Total Floor(s)</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.totalFloors || "--"}</div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Is applicant lot owner?</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.isLotOwner || "--"}</div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Location of Construction</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.locationOfConstruction || additional?.location || "--"}</div>
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Estimated Cost</label>
                                <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-sm text-primary min-h-[48px]">₱{Number(additional?.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Workflow Tracking & Executive Actions */}
                <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-16 self-start">
                    {/* Workflow Step Tracker */}
                    <div className="bg-[#151b28] rounded-[2rem] p-8 border border-white/5 space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Workflow Tracking</h3>
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                            {(() => {
                                const handleStepClick = (stepId: string) => {
                                    if (stepId === "FOR_REQUESTING") {
                                        router.push(`/admin/engineer/${id}/evaluation?view=true`);
                                    } else if (stepId === "FOR_INSPECTION") {
                                        router.push(`/admin/engineer/${id}/inspection?view=true`);
                                    } else if (stepId === "FOR_REINSPECTION") {
                                        router.push(`/admin/engineer/${id}/reinspection?view=true`);
                                    } else if (stepId === "EVALUATED") {
                                        router.push(`/admin/engineer/${id}/fees?view=true`);
                                    }
                                };
                                return steps.map((step, idx) => {
                                    const isCompleted = idx < currentStepIdx;
                                    const isActive = idx === currentStepIdx;
                                    return (
                                        <div
                                            key={step.id}
                                            onClick={() => { if (isCompleted) handleStepClick(step.id); }}
                                            className={`relative flex items-center justify-between group ${isCompleted ? "cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all" : ""
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`absolute left-[-29px] w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? "bg-[#006A2E] border-[#006A2E] text-white shadow-lg shadow-green-500/20" :
                                                    isActive ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110" :
                                                        "bg-slate-900 border-white/10 text-slate-500"
                                                    }`}>
                                                    {isCompleted ? <BadgeCheck className="w-3.5 h-3.5" /> : <span className="text-[10px] font-black">{idx + 1}</span>}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-black uppercase tracking-widest italic transition-colors ${isActive ? "text-white" : "text-slate-400"}`}>{step.label}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>

                    {/* Executive Actions */}
                    <div className="space-y-4">
                        {!isViewOnly && userRole === "ENGINEER" && (
                            <div className="space-y-3">
                                <Button onClick={handleEvaluate} disabled={actionLoading} className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                                    <Check className="w-4 h-4 mr-2" /> Approve Inspection
                                </Button>

                                <Dialog open={isReinspecting} onOpenChange={setIsReinspecting}>
                                    <DialogTrigger asChild>
                                        <Button className="w-full h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black italic uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                                            For Re-Inspection
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                        <DialogHeader className="space-y-3">
                                            <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                Mark for <span className="text-blue-600">Re-Inspection</span>
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="space-y-6 py-6">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Re-Inspection <span className="text-red-500">*</span></Label>
                                                <Textarea placeholder="State reason..." value={reinspectReason} onChange={(e) => setReinspectReason(e.target.value)} className="min-h-[80px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold p-6 text-sm" required />
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Inspection Type <span className="text-red-500">*</span></Label>
                                                <select className="flex h-12 w-full rounded-2xl border-none bg-slate-50 px-4 py-2 text-sm font-bold dark:bg-white/5 text-slate-800 dark:text-white focus:outline-none" value={reinspectType} onChange={(e) => setReinspectType(e.target.value)}>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Structural Inspection">Structural Inspection</option>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Electrical Inspection">Electrical Inspection</option>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Sanitary/Plumbing Inspection">Sanitary/Plumbing Inspection</option>
                                                    <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Complete Site Inspection">Complete Site Inspection</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date <span className="text-red-500">*</span></Label>
                                                    <Input type="date" value={reinspectDate} onChange={(e) => setReinspectDate(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4" />
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time <span className="text-red-500">*</span></Label>
                                                    <Input type="time" value={reinspectTime} onChange={(e) => setReinspectTime(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Inspector <span className="text-red-500">*</span></Label>
                                                <Input placeholder="Engr. Santos" value={reinspectInspector} onChange={(e) => setReinspectInspector(e.target.value)} className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4" />
                                            </div>
                                        </div>
                                        <Button onClick={handleReinspect} disabled={actionLoading || !reinspectReason.trim() || !reinspectDate || !reinspectTime || !reinspectInspector} className="w-full h-14 bg-blue-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl">
                                            {actionLoading ? "Processing..." : "Confirm Re-Inspection"}
                                        </Button>
                                    </DialogContent>
                                </Dialog>

                                <div className="flex gap-2 w-full">
                                    <Dialog open={isRequestingRevision} onOpenChange={(open) => { setIsRequestingRevision(open); if (!open) setRemarks(""); }}>
                                        <DialogTrigger asChild>
                                            {(transaction.revisionCount || 0) < 3 && (
                                                <Button onClick={() => { setIsRequestingRevision(true); setRemarks(""); }} className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg shadow-amber-500/20 transition-all active:scale-95">
                                                                                                Request Revision
                                                                                            </Button>
                                            )}
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                            <DialogHeader className="space-y-3">
                                                <DialogTitle className="text-3xl font-black italic uppercase text-slate-900 dark:text-white leading-none">Request <span className="text-amber-500">Revision</span></DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-6 py-6">
                                                <Label className="text-[10px] font-black uppercase text-slate-400">Corrections Needed *</Label>
                                                <Textarea ref={remarksRef} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold p-6 text-sm" required />
                                            </div>
                                            <Button onClick={handleRequestRevision} disabled={actionLoading || !remarks.trim()} className="w-full h-14 bg-amber-500 text-white font-black italic uppercase text-[11px] rounded-2xl">
                                                Confirm Revision Request
                                            </Button>
                                        </DialogContent>
                                    </Dialog>

                                    <Dialog open={isRejecting} onOpenChange={(open) => { setIsRejecting(open); if (!open) setRemarks(""); }}>
                                        <DialogTrigger asChild>
                                            <Button onClick={() => { setIsRejecting(true); setRemarks(""); }} className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg shadow-red-600/20 transition-all active:scale-95">
                                                Decline
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                            <DialogHeader className="space-y-3">
                                                <DialogTitle className="text-3xl font-black italic uppercase text-slate-900 dark:text-white leading-none">Decline <span className="text-red-600">Request</span></DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-6 py-6">
                                                <Label className="text-[10px] font-black uppercase text-slate-400">Reason for Decline *</Label>
                                                <Textarea ref={remarksRef} value={remarks} onChange={(e) => setRemarks(e.target.value)} className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold p-6 text-sm" required />
                                            </div>
                                            <Button onClick={handleReject} disabled={actionLoading || !remarks.trim()} className="w-full h-14 bg-red-600 text-white font-black italic uppercase text-[11px] rounded-2xl">
                                                Confirm Decline
                                            </Button>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
