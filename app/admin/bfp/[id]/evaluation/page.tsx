/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, use, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { isValidUrl } from "@/utils/image";
import {
    ArrowLeft,
    ZoomIn,
    ZoomOut,
    RotateCw,
    RefreshCcw,
    Camera,
    BadgeCheck,
    FileText,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import {
    getTransactionById,
    approveBFPTransaction,
    getSystemSettingAction,
    uploadECopyAction,
    saveBfpClearanceProofAction,
} from "@/app/admin/transactions/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

interface PageProps {
    params: Promise<{ id: string }>;
}

function LightboxView({ 
    src, 
    alt, 
    label,
    onPrev,
    onNext,
    currentIndex,
    totalDocs
}: { 
    src: string; 
    alt: string; 
    label: string;
    onPrev?: () => void;
    onNext?: () => void;
    currentIndex?: number;
    totalDocs?: number;
}) {
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

    // Bind Keyboard Navigation (ArrowLeft, ArrowRight)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "ArrowLeft" && onPrev) {
                e.preventDefault();
                onPrev();
                reset();
            } else if (e.key === "ArrowRight" && onNext) {
                e.preventDefault();
                onNext();
                reset();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onPrev, onNext]);

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
                {/* Directional Controls: Left Chevron */}
                {onPrev && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPrev();
                            reset();
                        }}
                        className="absolute left-6 z-50 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md flex items-center justify-center border border-white/20 hover:scale-110 transition-all shadow-2xl active:scale-95 group"
                        title="Previous Document (Left Arrow)"
                    >
                        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                )}

                {/* Directional Controls: Right Chevron */}
                {onNext && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onNext();
                            reset();
                        }}
                        className="absolute right-6 z-50 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md flex items-center justify-center border border-white/20 hover:scale-110 transition-all shadow-2xl active:scale-95 group"
                        title="Next Document (Right Arrow)"
                    >
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                )}

                <div
                    className="relative w-full h-full flex items-center justify-center"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotate}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                    }}
                >
                    {src?.toLowerCase().includes('.pdf') ? (
                        <iframe
                            src={src}
                            title={alt}
                            className="w-full h-full bg-white rounded-xl"
                        />
                    ) : (
                        <Image
                            src={isValidUrl(src) ? src : "/placeholder.png"}
                            alt={alt}
                            fill
                            className="object-contain"
                            priority
                            draggable={false}
                        />
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-4">
                {typeof currentIndex === "number" && typeof totalDocs === "number" && totalDocs > 0 && (
                    <div className="flex items-center gap-1.5 pr-4 border-r border-white/15">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 italic whitespace-nowrap">
                            Document {currentIndex + 1} of {totalDocs}
                        </span>
                    </div>
                )}
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
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] italic">Scroll to Zoom • Drag to Pan Active • Arrow Keys to Navigate</p>
        </DialogContent>
    );
}

export default function BFPEvaluationPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForcedView = searchParams.get("view") === "true";
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const backUrl = "/admin/bfp";

    const [transaction, setTransaction] = useState<any>(null);
    const addData = (transaction?.additionalData as any) || {};
    const isBfpAcknowledged = addData.bfpStatus === "ACKNOWLEDGED";
    const isBfpCompleted = addData.bfpStatus === "COMPLETED" || Boolean(addData.bfpClearanceUrl);

    // BFP read-only only for non-BFP roles.
    const isBfpReadonly = userRole !== "BFP";
    const isViewOnly = isForcedView || transaction?.isCancelled || isBfpReadonly;

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [bfpClearanceUrl, setBfpClearanceUrl] = useState<string>(addData.bfpClearanceUrl || "");
    const [themeColor, setThemeColor] = useState<string>("#ef4444");
    const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);

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
        getSystemSettingAction("theme_color", "#ef4444").then(res => {
            if (res.success && res.data) setThemeColor(res.data);
        });
    }, [fetchTransaction]);

    useEffect(() => {
        setBfpClearanceUrl(addData.bfpClearanceUrl || "");
    }, [addData.bfpClearanceUrl]);

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            const res = await approveBFPTransaction(id);
            if (res.success) {
                toast.success("BFP acknowledged successfully!");
                router.push(backUrl);
            } else {
                toast.error(res.error || "Failed to acknowledge.");
            }
        } catch {
            toast.error("Error occurred");
        } finally {
            setActionLoading(false);
        }
    };

    const handleClearanceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        setUploading(true);
        const toastId = toast.loading("Uploading BFP Clearance...");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await uploadECopyAction(formData);
            if (res.success && res.data) {
                setBfpClearanceUrl(res.data);
                toast.success("BFP Clearance uploaded successfully!", { id: toastId });
            } else {
                toast.error(res.error || "Failed to upload file", { id: toastId });
            }
        } catch {
            toast.error("Error uploading file", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitClearance = async () => {
        if (!bfpClearanceUrl) {
            toast.error("Please upload the BFP Clearance first.");
            return;
        }
        setActionLoading(true);
        try {
            const res = await saveBfpClearanceProofAction(id, bfpClearanceUrl);
            if (res.success) {
                toast.success("BFP Clearance submitted to Engineer!");
                router.push(backUrl);
            } else {
                toast.error(res.error || "Failed to submit clearance.");
            }
        } catch {
            toast.error("Error occurred");
        } finally {
            setActionLoading(false);
        }
    };
    const additional = useMemo(() => transaction?.additionalData || {}, [transaction]);
    const resident = useMemo(() => transaction?.user?.residentProfile || transaction?.residentSnapshot || {}, [transaction]);
    const bfpVisibleDocKeys = useMemo(() => (additional?.feeAssessment?.bfpVisibleDocs || additional?.bfpVisibleDocs || []) as string[], [additional]);

    const vaultDocs = useMemo(() => {
        if (!transaction) return [];
        return [
            { key: "newIdFile", url: additional?.documents?.newIdFile || resident?.idFileUrl, label: "Applicant Valid ID (Front)" },
            { key: "newIdFileBack", url: additional?.documents?.newIdFileBack, label: "Applicant Valid ID (Back)" },
            { key: "tctFile", url: additional?.documents?.tctFile, label: "TCT / Land Title" },
            ...(transaction?.type?.code === "OCCUPANCY_PERMIT" ? [
                "Duly Notarized Certificate of Completion",
                "Construction Logbook, signed and sealed by Owner's Architect and Civil Engineer",
                "As-Built Plans, signed and sealed by the Owner's Architect and Civil Engineer",
                "Valid Licenses of All Involved Professionals",
                "Captioned Photographs of Site and Completed Building/Structure (Front, Sides, and Rear Areas)",
                "Duly Notarized Affidavit of Undertaking (Optional)"
            ].map((label, idx) => ({ key: `req_${idx}`, url: additional?.documents?.[`req_${idx}`], label, idx })) : [
                "Barangay Clearance/Certification",
                "Tax Declaration",
                "Land Title",
                "Community Tax Certificate",
                "Latest Tax Receipts",
                "Adjoining Owners Confirmation",
                "Locational Clearance",
                "Affidavit of Consent",
                "Affidavit of Adjoining Owners",
                "Signed & Sealed Plans",
                "Notarized Deed of Sale/Lot Locational Plan/ Contract of Lease",
                "Cedula of Lot Owner",
                "ID of Lot Owner",
                "Death Certificate of Lot Owner",
                "Birth Certificate of Heirs of Deceased Owner",
                "Valid Licenses (PRC I.D.) of Involved Professionals",
                "Duly Notarized Estimated Value of Building/Structure",
                "Duly Notarized Technical Specification",
                "Construction Safety and Health Program From DOLE",
                "Construction Logbook duly signed by Civil Engineer/Architect in-charge of Construction",
                "Affidavit of Undertaking",
                "Cedula of Applicant",
                "ID of applicant with 3 signatures",
                "Structural Analysis and Design",
                "Soil Boring Test"
            ]
                .map((label, idx) => ({ key: `req_${idx}`, url: additional?.documents?.[`req_${idx}`], label, idx }))
                .filter(({ idx }) => {
                    const isOwnerDeceased = additional?.isOwnerDeceased === true;
                    const isAffidavitRequired = additional?.isLotOwner === "No" && !isOwnerDeceased;
                    if (!isOwnerDeceased && [13, 14].includes(idx)) return false;
                    if (!isAffidavitRequired && [7, 10, 11, 12].includes(idx)) return false;
                    if (isAffidavitRequired && [21, 22].includes(idx)) return false;
                    const hasMultipleFloors = parseInt(additional?.totalFloors || "0", 10) > 1;
                    if (!hasMultipleFloors && [23, 24].includes(idx)) return false;
                    return true;
                })),
            ...Object.keys(additional?.documents || {})
                .filter(key => key.startsWith("req_"))
                .map(key => {
                    const idx = parseInt(key.replace("req_", ""), 10);
                    const threshold = transaction?.type?.code === "OCCUPANCY_PERMIT" ? 6 : 25;
                    if (idx >= threshold) {
                        const label = additional?.customLabels?.[key] || `Additional Document ${idx - threshold + 1}`;
                        return { key, url: additional.documents[key], label };
                    }
                    return null;
                })
                .filter(Boolean) as { key: string; url: string; label: string }[],
            ...(transaction?.type?.code === "OCCUPANCY_PERMIT" ? [] : [
                "1. Electrical Permit",
                "2. Plumbing Permit",
                "3. Sanitary Permit",
                "4. Excavation & Ground Preparation Permit",
                "5. Fencing Permit",
                "6. Scaffolding Permit",
                "7. Mechanical Permit",
                "8. Architectural Documents",
                "9. Civil/Structural Documents",
                "10. Electronics Documents",
                "11. Geodetic Documents",
                "12. Fire Protection Plan"
            ].map((label, idx) => ({ key: `permit_${idx}`, url: additional?.documents?.[`permit_${idx}`], label }))),
            ...Object.keys(additional?.documents || {})
                .filter(key => key.startsWith("permit_"))
                .map(key => {
                    const idx = parseInt(key.replace("permit_", ""), 10);
                    if (idx >= 12) {
                        const label = additional?.customLabels?.[key] || `Additional Permit ${idx - 11}`;
                        return { key, url: additional.documents[key], label };
                    }
                    return null;
                })
                .filter(Boolean) as { key: string; url: string; label: string }[]
        ].filter(doc => doc.url && (bfpVisibleDocKeys.length === 0 || bfpVisibleDocKeys.includes(doc.key)));
    }, [transaction, additional, resident, bfpVisibleDocKeys]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (!transaction) return <div className="p-20 text-center dark:text-white">Protocol Error: Transaction Inaccessible</div>;

    const renderRequirementsGrid = () => (
        <div className="grid grid-cols-2 gap-4">
            {vaultDocs.map((doc: any, i: number) => (
                <div 
                    key={i}
                    onClick={() => setActiveDocIndex(i)}
                    className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center cursor-zoom-in"
                >
                    {doc.url?.toLowerCase().includes('.pdf') ? (
                        <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-red-500 transition-colors">
                            <FileText className="w-8 h-8 mb-1" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">PDF</span>
                        </div>
                    ) : (
                        <img src={isValidUrl(doc.url) ? doc.url : "/placeholder.png"} alt={doc.label} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform animate-in fade-in duration-300" />
                    )}
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
            ))}
        </div>
    );

    const steps = [
        { id: "EVALUATION", label: "EVALUATION" },
    ];
    const currentStepIdx = 0;

    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <Link href={backUrl} prefetch={false}>
                    <Button variant="ghost" className="gap-2 text-slate-400 dark:text-slate-500 font-bold hover:text-red-500">
                        <ArrowLeft className="w-4 h-4" /> BACK TO BFP HUB
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-red-500/20 text-red-500 bg-red-500/5 px-4 py-1">
                        BFP Evaluation Portal Active
                    </Badge>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {isBfpReadonly && (
                    <div className="col-span-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">✅ Application Acknowledged</p>
                            <p className="text-[11px] font-medium opacity-90">This building permit application has been evaluated and acknowledged by the BFP. Viewing in read-only mode.</p>
                        </div>
                        <Button onClick={() => router.push(backUrl)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase h-10 px-4 rounded-xl active:scale-95 transition-all border-none">
                            Return to Hub
                        </Button>
                    </div>
                )}

                {/* Left Column: Details */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-red-600/10 to-orange-500/10 dark:from-red-600/5 dark:to-orange-500/5 border border-red-600/20 dark:border-red-600/10 rounded-[2rem] p-8 flex items-center justify-between shadow-sm relative overflow-hidden">
                        <div className="space-y-2 relative z-10">
                            <span className="text-[10px] font-black uppercase text-red-600 dark:text-red-400 tracking-[0.2em] italic">Phase 1: Initial Assessment</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">BFP EVALUATION</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verify the applicant&apos;s architectural details and plans for fire safety compliance.</p>
                        </div>
                        <div className="text-5xl font-black italic text-red-500/20 select-none hidden md:block">EVALUATION</div>
                    </div>

                    {/* Profile */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-500">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Resident <span className="text-red-500">Identity Profile</span>
                            </h2>
                            <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">Verified Citizen Data Dossier</p>
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

                            {/* Applicant E-Signature Section */}
                            {additional?.signature && (
                                <div className="col-span-12 space-y-4 pt-6 border-t border-slate-100 dark:border-white/5">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Applicant Digital E-Signature</label>
                                    <div className="max-w-[240px] bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/10 p-4">
                                        <div 
                                            onClick={() => {
                                                const idx = vaultDocs.findIndex((d: any) => d.url === additional.signature);
                                                if (idx !== -1) setActiveDocIndex(idx);
                                            }}
                                            className="group relative aspect-video rounded-xl overflow-hidden flex items-center justify-center cursor-zoom-in bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5"
                                        >
                                            <img src={additional.signature} alt="E-Signature" className="max-h-20 object-contain p-2 group-hover:scale-105 transition-transform" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                    <ZoomIn className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 1: Application Details */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Application <span className="text-red-500">Details</span>
                            </h2>
                            <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">BFP Assessment Information</p>
                        </div>
                        {transaction?.type?.code === "OCCUPANCY_PERMIT" ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Name of Project</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.nameOfProject || "--"}</div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Location of Project</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.locationOfProject || "--"}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Use/Character of Occupancy</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.useCharacterOfOccupancy || "--"}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">No. of Storey/s</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.noOfStoreys || "--"}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">No. of Units</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.noOfUnits || "--"}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Total Gross Floor Area</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.totalGrossFloorArea ? `${additional.totalGrossFloorArea} sqm` : "--"}</div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Date of Completion</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-sm text-red-500 min-h-[48px]">
                                        {additional?.dateOfCompletion ? new Date(additional.dateOfCompletion).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "--"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Description of Work</label>
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 min-h-[48px]">{additional?.descriptionOfWork || "--"}</div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Occupancy Use</label>
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
                                    <div className="p-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-sm text-red-500 min-h-[48px]">₱{Number(additional?.estimatedCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Card 2: Requirements Plans & Submissions */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg"><Camera className="text-red-500 w-4 h-4" /></div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Submitted Requirements</span>
                        </div>
                        {renderRequirementsGrid()}
                    </div>
                </div>

                {/* Right Column: Workflow Tracking & Executive Actions */}
                <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-16 self-start">
                    <div className="bg-[#151b28] rounded-[2rem] p-8 border border-white/5 space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Workflow Tracking</h3>
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                            {steps.map((step, idx) => {
                                const isCompleted = idx < currentStepIdx;
                                const isActive = idx === currentStepIdx;
                                return (
                                    <div key={step.id} className="relative flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className={`absolute left-[-29px] w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? "bg-[#006A2E] border-[#006A2E] text-white shadow-lg shadow-green-500/20" :
                                                isActive ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20 scale-110" :
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
                            })}
                        </div>
                    </div>

                    {/* Executive Actions */}
                    <div className="space-y-4">
                        {!isViewOnly && userRole === "BFP" && !isBfpAcknowledged && !isBfpCompleted && (
                            <Button
                                onClick={handleApprove}
                                disabled={actionLoading}
                                className="w-full h-16 rounded-2xl bg-red-600 text-white font-black italic uppercase tracking-widest text-xs hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 active:scale-95"
                            >
                                {actionLoading ? "Acknowledging..." : "Acknowledge BFP Clearance"}
                            </Button>
                        )}

                        {!isViewOnly && userRole === "BFP" && (isBfpAcknowledged || isBfpCompleted) && (
                            <div className="space-y-4 bg-white dark:bg-[#151b28] rounded-[2rem] p-8 border border-slate-100 dark:border-white/5 shadow-sm">
                                <div>
                                    <h3 className="text-sm font-black italic uppercase text-slate-900 dark:text-white">Upload BFP Clearance</h3>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                                        {isBfpCompleted ? "Submitted clearance ready for review" : "Submit signed clearance to the Engineer"}
                                    </p>
                                </div>

                                {isBfpCompleted || bfpClearanceUrl ? (
                                    <div className="space-y-4">
                                        <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 relative group">
                                            {String(addData.bfpClearanceUrl || bfpClearanceUrl).toLowerCase().includes('.pdf') ? (
                                                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-red-500 transition-colors">
                                                    <FileText className="w-12 h-12 mb-2" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">BFP Clearance PDF</span>
                                                </div>
                                            ) : (
                                                <img src={String(addData.bfpClearanceUrl || bfpClearanceUrl)} alt="BFP Clearance" className="object-cover w-full h-full" />
                                            )}
                                            <div 
                                                onClick={() => {
                                                    const targetUrl = addData.bfpClearanceUrl || bfpClearanceUrl;
                                                    const idx = vaultDocs.findIndex((d: any) => d.url === targetUrl);
                                                    if (idx !== -1) setActiveDocIndex(idx);
                                                }}
                                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                    <ZoomIn className="w-4 h-4 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                                                <BadgeCheck className="w-4 h-4" />
                                                {isBfpCompleted ? "BFP Clearance submitted" : "Ready to submit to Engineer"}
                                            </span>
                                            {!isBfpCompleted && (
                                                <Button variant="ghost" size="sm" onClick={() => setBfpClearanceUrl("")} className="text-red-500 text-xs hover:bg-red-50 dark:hover:bg-red-500/10 h-8">
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-slate-50 dark:bg-white/[0.02] relative">
                                        <div className="w-12 h-12 bg-white dark:bg-white/5 rounded-full flex items-center justify-center shadow-sm">
                                            <Camera className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Click to upload clearance</p>
                                            <p className="text-[9px] font-medium text-slate-400 mt-1 uppercase tracking-wider">JPG, PNG, PDF up to 5MB</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={handleClearanceUpload}
                                            disabled={uploading}
                                        />
                                        {uploading && (
                                            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl z-10">
                                                <div className="w-6 h-6 border-2 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-2" />
                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Uploading...</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isBfpCompleted && (
                                    <Button
                                        onClick={handleSubmitClearance}
                                        disabled={actionLoading || !bfpClearanceUrl}
                                        className="w-full h-16 rounded-2xl bg-emerald-600 text-white font-black italic uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
                                    >
                                        {actionLoading ? "Submitting..." : "Submit to Engineer"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {activeDocIndex !== null && vaultDocs[activeDocIndex] && (
                <Dialog open={true} onOpenChange={(open) => { if (!open) setActiveDocIndex(null); }}>
                    <LightboxView
                        src={vaultDocs[activeDocIndex].url as string}
                        alt={vaultDocs[activeDocIndex].label}
                        label={vaultDocs[activeDocIndex].label}
                        currentIndex={activeDocIndex}
                        totalDocs={vaultDocs.length}
                        onPrev={vaultDocs.length > 1 ? () => setActiveDocIndex(prev => (prev !== null ? (prev - 1 + vaultDocs.length) % vaultDocs.length : 0)) : undefined}
                        onNext={vaultDocs.length > 1 ? () => setActiveDocIndex(prev => (prev !== null ? (prev + 1) % vaultDocs.length : 0)) : undefined}
                    />
                </Dialog>
            )}
        </div>
    );
}
