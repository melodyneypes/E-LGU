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
    AlertCircle,
    BadgeCheck,
    FileText,
    ChevronLeft,
    ChevronRight,
    XCircle
} from "lucide-react";
import { toast } from "sonner";
import {
    getTransactionById,
    scheduleZoningInspection as scheduleBuildingInspection,
    getSystemSettingAction
} from "@/app/admin/transactions/actions";
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
    DialogTrigger
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
        <DialogContent aria-describedby={undefined} className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-transparent shadow-none flex flex-col items-center justify-center gap-6 outline-none">
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
                            unoptimized={true}
                        />
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 px-6 py-3 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl animate-in slide-in-from-bottom-4">
                {typeof currentIndex === "number" && typeof totalDocs === "number" && totalDocs > 0 && (
                    <div className="flex items-center gap-1.5 pr-4 border-r border-white/15">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 italic whitespace-nowrap">
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
                        title="Zoom Out"
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
                        title="Zoom In"
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

export default function BuildingPermitEvaluationPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isForcedView = searchParams.get("view") === "true";
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const backUrl = userRole === "MPDC_ZONING" ? "/admin/zoning" : userRole === "ENGINEER" ? "/admin/engineer" : "/admin/treasury";

    const [transaction, setTransaction] = useState<any>(null);
    const addData = (transaction?.additionalData as any) || {};
    const zoningStatus = addData.zoningStatus;
    const isZoningActive = userRole === "MPDC_ZONING" && transaction?.status === "EVALUATED" && (
        transaction?.additionalData?.feeAssessment?.engineerEndorsedToZoning === true ||
        transaction?.additionalData?.feeAssessment?.endorsed === true
    );

    // Zoning is in read-only mode if the transaction is not yet passed to Zoning (i.e. not EVALUATED status)
    const isZoningReadonly = userRole === "MPDC_ZONING" && !isZoningActive;

    const isViewOnly = isForcedView || transaction?.isCancelled ||
        isZoningReadonly ||
        (userRole === "MPDC_ZONING" && isZoningActive && zoningStatus !== "FOR_REQUESTING" && zoningStatus !== "FOR_REVISION") ||
        (userRole !== "MPDC_ZONING" && transaction && transaction.status !== "FOR_REQUESTING" && transaction.status !== "FOR_REVISION");

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [themeColor, setThemeColor] = useState<string>("#2563eb");
    const [activeDocIndex, setActiveDocIndex] = useState<number | null>(null);

    // Schedule Inspection Form State
    const [isSchedulingInspection, setIsSchedulingInspection] = useState(false);
    const [inspectionType, setInspectionType] = useState("Structural Inspection");
    const [inspectionDate, setInspectionDate] = useState("");
    const [inspectionTime, setInspectionTime] = useState("");
    const [inspectorName, setInspectorName] = useState("");
    const [inspectionNotes, setInspectionNotes] = useState("");
    const [scheduleErrors, setScheduleErrors] = useState<{ date?: string; time?: string; inspectorName?: string }>({});
    const canScheduleInspection = userRole === "MPDC_ZONING"
        ? (isZoningActive && zoningStatus === "FOR_REQUESTING")
        : (transaction?.status === "FOR_REQUESTING");

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

    const handleScheduleInspection = async () => {
        const missing: string[] = [];
        const errs: { date?: string; time?: string; inspectorName?: string } = {};

        if (!inspectionDate) {
            missing.push("Date");
            errs.date = "Date is required.";
        }
        if (!inspectionTime) {
            missing.push("Time");
            errs.time = "Time is required.";
        }
        if (!inspectorName.trim()) {
            missing.push("Inspector Name");
            errs.inspectorName = "Inspector Name is required.";
        }

        setScheduleErrors(errs);

        if (missing.length > 0) {
            toast.error(`Please fill in the missing field${missing.length > 1 ? 's' : ''}: ${missing.join(", ")}`);
            return;
        }

        const todayStr = new Date().toISOString().split("T")[0];
        if (inspectionDate < todayStr) {
            setScheduleErrors({ date: "Inspection date cannot be in the past." });
            toast.error("Inspection date cannot be in the past.");
            return;
        }

        setActionLoading(true);
        const res = await scheduleBuildingInspection(id, {
            type: inspectionType,
            date: inspectionDate,
            time: inspectionTime,
            inspectorName: inspectorName,
            notes: inspectionNotes
        });

        if (res.success) {
            toast.success("Inspection scheduled successfully!");
            router.push(backUrl);
        } else {
            toast.error(res.error || "Failed to schedule inspection");
        }
        setActionLoading(false);
    };

    const additional = useMemo(() => transaction?.additionalData || {}, [transaction]);
    const resident = useMemo(() => transaction?.user?.residentProfile || transaction?.residentSnapshot || {}, [transaction]);

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
        ].filter(doc => {
            if (!doc || !doc.url) return false;
            // Filter by docs endorsed by engineer, fallback to true if older transaction without this array
            if (!additional?.zoningVisibleDocs || !Array.isArray(additional.zoningVisibleDocs)) return true;
            return additional.zoningVisibleDocs.includes(doc.key);
        });
    }, [transaction, additional, resident]);

    const renderRequirementsGrid = () => (
        <div className="grid grid-cols-2 gap-4">
                {vaultDocs.map((doc: any, i: number) => (
                    <div 
                        key={i}
                        onClick={() => setActiveDocIndex(i)}
                        className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center cursor-zoom-in"
                    >
                        {doc.url?.toLowerCase().includes('.pdf') ? (
                            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!transaction) return <div className="p-20 text-center dark:text-white">Protocol Error: Transaction Inaccessible</div>;

    const steps = [
        { id: "FOR_REQUESTING", label: "EVALUATION" },
        { id: "FOR_INSPECTION", label: "INSPECTION" },
        { id: "FOR_REINSPECTION", label: "RE-INSPECTION" },
        { id: "EVALUATED", label: "FEE ASSESSMENT" }
    ];
    const isRejected = transaction?.status === "REJECTED" || transaction?.isCancelled === true || zoningStatus === "REJECTED";
    const getStepIndex = (status: string) => {
        if (status === "FOR_REQUESTING" || status === "FOR_REVISION") return 0;
        if (status === "FOR_INSPECTION") return 1;
        if (status === "FOR_REINSPECTION") return 2;
        if (status === "EVALUATED" || status === "UNPAID" || status === "PAYMENT_SUBMITTED" || status === "PAID") return 3;
        return -1;
    };
    const currentStepIdx = isRejected ? -1 : getStepIndex(zoningStatus || transaction.status);

    const getRejectedStepIndex = () => {
        const rejectedPhase = transaction?.additionalData?.rejectedPhase || transaction?.additionalData?.rejectedAtStep;
        if (rejectedPhase === "FOR_INSPECTION") return 1;
        if (rejectedPhase === "FOR_REINSPECTION") return 2;
        if (rejectedPhase === "EVALUATED" || rejectedPhase === "FEE_ASSESSMENT") return 3;
        return 0;
    };
    const rejectedStepIdx = isRejected ? getRejectedStepIndex() : -1;

    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <Link href={backUrl} prefetch={false}>
                    <Button variant="ghost" className="gap-2 text-slate-400 dark:text-slate-500 font-bold hover:text-primary">
                        <ArrowLeft className="w-4 h-4" /> BACK TO DASHBOARD
                    </Button>
                </Link>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 mr-2">
                        <Badge className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-1 rounded-xl">
                            Re-inspection Count: {transaction?.additionalData?.zoningReinspectionCount || 0} / 3
                        </Badge>
                    </div>
                    <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-primary/20 text-primary bg-primary/5 px-4 py-1">
                        Zoning Evaluation Portal Active
                    </Badge>
                </div>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {isZoningReadonly && (
                    <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">⚠️ Awaiting Engineering Endorsement</p>
                            <p className="text-[11px] font-medium opacity-90">This building permit application has not yet been endorsed by the Municipal Engineer. Currently viewing in read-only mode.</p>
                        </div>
                    </div>
                )}

                {isViewOnly && !isZoningReadonly && (
                    <div className="col-span-12 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 p-6 rounded-[1.5rem] flex items-center justify-between shadow-sm animate-in fade-in duration-300">
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest italic flex items-center gap-2">📜 Archival Phase View Mode</p>
                            <p className="text-[11px] font-medium opacity-90">{transaction?.status === "REJECTED" ? "This building permit application has been officially rejected." : "You are reviewing the historical Evaluation phase record in read-only mode."}</p>
                        </div>
                        {transaction?.status !== "REJECTED" && (
                            <Button onClick={() => router.push(`/admin/zoning/${id}`)} size="sm" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase h-10 px-4 rounded-xl active:scale-95 transition-all border-none">
                                Return to Active Phase
                            </Button>
                        )}
                    </div>
                )}

                {/* Left Column: Details */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* Header Banner */}
                    <div className="bg-gradient-to-r from-[#0c4a6e]/10 to-teal-500/10 dark:from-[#0c4a6e]/5 dark:to-teal-500/5 border border-[#0c4a6e]/20 dark:border-[#0c4a6e]/10 rounded-[2rem] p-8 flex items-center justify-between shadow-sm relative overflow-hidden">
                        <div className="space-y-2 relative z-10">
                            <span className="text-[10px] font-black uppercase text-[#0c4a6e] dark:text-blue-400 tracking-[0.2em] italic">Phase 1: Initial Assessment</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">ZONING PERMIT EVALUATION</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verify the applicant&apos;s architectural details and plans, then track the mandatory site inspection.</p>
                        </div>
                        <div className="text-5xl font-black italic text-blue-500/20 select-none hidden md:block">EVALUATION</div>
                    </div>

                    {/* Profile */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-500">
                        <div>
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                Resident <span className="text-primary">Identity Profile</span>
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
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Gender</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 capitalize">{resident?.gender || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Civil Status</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 capitalize">{resident?.civilStatus || "--"}</div>
                            </div>
                            <div className="col-span-12 md:col-span-3 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Occupation</label>
                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{resident?.occupation || "N/A"}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-6 pt-6 border-t border-slate-100 dark:border-white/5">
                            <div className="col-span-12 md:col-span-6 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Address Details</label>
                                <div className="min-h-[3rem] p-4 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 break-words leading-relaxed">
                                    {[
                                        resident?.unitNumber,
                                        resident?.houseNumber,
                                        resident?.streetName,
                                        resident?.subdivision,
                                        resident?.purok,
                                        resident?.barangay,
                                        resident?.municipality,
                                        resident?.province,
                                        resident?.zipCode
                                    ].filter(Boolean).join(", ")}
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-6 space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Contact Information</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">{resident?.contactNumber || "--"}</div>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate" title={resident?.emailAddress}>{resident?.emailAddress || "--"}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Requirements Vault */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-500 delay-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                    Requirements <span className="text-primary">Vault</span>
                                </h2>
                                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">Submitted Documents & Clearances</p>
                            </div>
                            <Badge variant="outline" className="text-xs font-bold bg-primary/5 text-primary border-primary/20 px-4 py-1.5 rounded-xl">
                                {vaultDocs.length} Files Attached
                            </Badge>
                        </div>
                        {renderRequirementsGrid()}
                    </div>
                </div>

                {/* Right Column: Workflow Tracking & Executive Actions */}
                <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-16 self-start">
                    <div className="bg-[#151b28] rounded-[2rem] p-8 border border-white/5 space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Workflow Tracking</h3>
                        <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/10">
                            {(() => {
                                const handleStepClick = (stepId: string) => {
                                    if (stepId === "FOR_REQUESTING") {
                                        router.push(`/admin/zoning/${id}/evaluation?view=true`);
                                    } else if (stepId === "FOR_INSPECTION") {
                                        router.push(`/admin/zoning/${id}/inspection?view=true`);
                                    } else if (stepId === "FOR_REINSPECTION") {
                                        router.push(`/admin/zoning/${id}/reinspection?view=true`);
                                    } else if (stepId === "EVALUATED") {
                                        router.push(`/admin/zoning/${id}/fees?view=true`);
                                    }
                                };
                                return steps.map((step, idx) => {
                                    const isRejectedStep = isRejected && idx === rejectedStepIdx;
                                    const isCompleted = !isRejected ? (idx < currentStepIdx) : (idx < rejectedStepIdx);
                                    const isActive = !isRejected && (idx === currentStepIdx);
                                    return (
                                        <div
                                            key={step.id}
                                            onClick={() => { if (isCompleted) handleStepClick(step.id); }}
                                            className={`relative flex items-center justify-between group ${isCompleted ? "cursor-pointer hover:bg-white/5 p-2 -mx-2 rounded-xl transition-all" : ""
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`absolute left-[-29px] w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                    isRejectedStep
                                                        ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-500/20 scale-110"
                                                        : isCompleted
                                                        ? "bg-[#006A2E] border-[#006A2E] text-white shadow-lg shadow-green-500/20"
                                                        : isActive
                                                        ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110"
                                                        : "bg-slate-900 border-white/10 text-slate-500"
                                                }`}>
                                                    {isRejectedStep ? (
                                                        <XCircle className="w-3.5 h-3.5" />
                                                    ) : isCompleted ? (
                                                        <BadgeCheck className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <span className="text-[10px] font-black">{idx + 1}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`text-xs font-black uppercase tracking-widest italic transition-colors ${
                                                        isRejectedStep
                                                            ? "text-red-400 font-bold"
                                                            : isActive
                                                            ? "text-white"
                                                            : "text-slate-400"
                                                    }`}>
                                                        {step.label} {isRejectedStep ? "(REJECTED)" : ""}
                                                    </p>
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
                        {!isViewOnly && (userRole === "MPDC_ZONING" || userRole === "ENGINEER") && (
                            <div className="space-y-3">
                                <Dialog open={isSchedulingInspection} onOpenChange={setIsSchedulingInspection}>
                                    <DialogTrigger asChild>
                                        <Button disabled={actionLoading || !canScheduleInspection} className="w-full h-16 rounded-2xl bg-[#006A2E] text-white font-black italic uppercase tracking-widest text-xs hover:bg-[#005224] transition-all shadow-xl shadow-green-900/20 active:scale-95">
                                            {actionLoading ? "Processing..." : "Schedule Inspection"}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl bg-[#f8e7eb] dark:bg-slate-900 border-none rounded-[1.5rem] shadow-2xl p-0 overflow-hidden">
                                        <DialogTitle className="sr-only">Schedule Site Inspection</DialogTitle>
                                        <div className="bg-white dark:bg-slate-950 p-6 m-4 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h2 className="text-xl font-bold text-[#0c4a6e] dark:text-blue-400 flex items-center gap-2">
                                                    <AlertCircle className="w-5 h-5" /> Pending Inspection Scheduling
                                                </h2>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Inspection Type:</Label>
                                                    <select
                                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c4a6e] dark:border-slate-800 dark:bg-slate-950 dark:focus-visible:ring-blue-500 text-slate-800 dark:text-white"
                                                        value={inspectionType}
                                                        onChange={(e) => setInspectionType(e.target.value)}
                                                    >
                                                        <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Structural Inspection">Structural Inspection</option>
                                                        <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Electrical Inspection">Electrical Inspection</option>
                                                        <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Sanitary/Plumbing Inspection">Sanitary/Plumbing Inspection</option>
                                                        <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Complete Site Inspection">Complete Site Inspection</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Date <span className="text-red-500">*</span>:</Label>
                                                    <Input 
                                                        type="date" 
                                                        min={new Date().toISOString().split("T")[0]} 
                                                        value={inspectionDate} 
                                                        onChange={(e) => {
                                                            setInspectionDate(e.target.value);
                                                            if (scheduleErrors.date) setScheduleErrors(prev => ({ ...prev, date: undefined }));
                                                        }} 
                                                        className={`h-12 rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 px-4 font-medium ${scheduleErrors.date ? "border border-red-500 focus-visible:ring-red-500" : "border-none"}`} 
                                                    />
                                                    {scheduleErrors.date && <p className="text-[10px] text-red-500 font-medium">{scheduleErrors.date}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Time <span className="text-red-500">*</span>:</Label>
                                                    <Input 
                                                        type="time" 
                                                        value={inspectionTime} 
                                                        onChange={(e) => {
                                                            setInspectionTime(e.target.value);
                                                            if (scheduleErrors.time) setScheduleErrors(prev => ({ ...prev, time: undefined }));
                                                        }} 
                                                        className={`h-12 rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 px-4 font-medium ${scheduleErrors.time ? "border border-red-500 focus-visible:ring-red-500" : "border-none"}`} 
                                                    />
                                                    {scheduleErrors.time && <p className="text-[10px] text-red-500 font-medium">{scheduleErrors.time}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Inspector Name <span className="text-red-500">*</span>:</Label>
                                                    <Input 
                                                        placeholder="Engr. Santos" 
                                                        value={inspectorName} 
                                                        onChange={(e) => {
                                                            setInspectorName(e.target.value);
                                                            if (scheduleErrors.inspectorName) setScheduleErrors(prev => ({ ...prev, inspectorName: undefined }));
                                                        }} 
                                                        className={`h-12 rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 px-4 font-medium ${scheduleErrors.inspectorName ? "border border-red-500 focus-visible:ring-red-500" : "border-none"}`} 
                                                    />
                                                    {scheduleErrors.inspectorName && <p className="text-[10px] text-red-500 font-medium">{scheduleErrors.inspectorName}</p>}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Notes (optional):</Label>
                                                    <Textarea placeholder="Instructions..." value={inspectionNotes} onChange={(e) => setInspectionNotes(e.target.value)} className="min-h-[80px] rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 border-none p-4 font-medium" />
                                                </div>
                                                <Button onClick={handleScheduleInspection} disabled={actionLoading} className="h-12 bg-[#0c4a6e] hover:bg-[#082f49] text-white rounded-xl px-6 flex items-center gap-2">
                                                    {actionLoading ? "Scheduling..." : "Schedule Inspection"}
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>

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
