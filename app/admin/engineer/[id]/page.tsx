"use client";

import React, { useState, useRef, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { isValidUrl } from "@/utils/image";
import { format, differenceInYears } from "date-fns";
import {
    FileText,
    Camera,
    BadgeCheck, ArrowLeft,
    Upload,
    Check,
    RotateCw,
    RefreshCcw,
    ZoomIn,
    ZoomOut,
    ExternalLink,
    AlertCircle,
    Ban,
    Hash,
    Trash2,
    Plus
} from "lucide-react";
import { toast } from "sonner";
import {
    getTransactionById,
    evaluateCedulaTransaction,
    rejectTransaction,
    sendForRevision,
    uploadECopyAction,
    getSystemSettingAction,
    getDeliveryFeeByBarangay,
    resolveDispute,
    scheduleBuildingInspection,
    markForReinspection
} from "@/app/admin/transactions/actions";
import {
    confirmTransactionPayment,
    releaseCedula
} from "@/app/admin/transactions/cedula-actions";
import { cn } from "@/lib/utils";
import { calculateCedula } from "@/lib/cedula";
import { calculateBusinessPermit } from "@/lib/business-permit";
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

/**
 * High-Fidelity Lightbox View with Transform Controls
 */
function LightboxView({ src, alt, label }: { src: string; alt: string; label: string }) {
    const [scale, setScale] = useState(1);
    const [rotate, setRotate] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleWheel = (e: React.WheelEvent) => {
        // Smooth zoom using scroll wheel
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

    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        setIsDragging(true);
        const touch = e.touches[0];
        setDragStart({
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setPosition({
            x: touch.clientX - dragStart.x,
            y: touch.clientY - dragStart.y
        });
    };

    const handleTouchEnd = () => {
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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
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

            {/* Premium Control Bar */}
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

export default function EngineerDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { data: session } = useSession();
    const rawUserRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department;
    // Map BPLO Admin to behave exactly like ADMIN_AIDE for Treasury pages
    const isBPLOAdmin = rawUserRole === "ADMIN" && userDepartment === "BPLO";
    const userRole = isBPLOAdmin ? "ADMIN_AIDE" : rawUserRole;
    const backUrl = userRole === "ENGINEER" ? "/admin/engineer" : "/admin/treasury";
    const [transaction, setTransaction] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [remarks, setRemarks] = useState("");
    const remarksRef = useRef<HTMLTextAreaElement>(null);
    const [ctcNumber, setCtcNumber] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [eCopyFile, setECopyFile] = useState<File | null>(null);
    const [eCopyPreview, setECopyPreview] = useState<string | null>(null);
    const [orFile, setOrFile] = useState<File | null>(null);
    const [orPreview, setOrPreview] = useState<string | null>(null);
    const [themeColor, setThemeColor] = useState<string>("#2563eb");
    const [branding, setBranding] = useState({
        word1: "Mapandan",
        word2: "Express",
        logo: ""
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_showAdditionalDebug, _setShowAdditionalDebug] = useState(false);
    const [isResolvingDispute, setIsResolvingDispute] = useState(false);
    const [disputeModalOpen, setDisputeModalOpen] = useState(false);
    const [disputeAction, setDisputeAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [showPreviousPhases, setShowPreviousPhases] = useState(false);
    const [isReinspecting, setIsReinspecting] = useState(false);
    const [reinspectReason, setReinspectReason] = useState("");
    const [reinspectDate, setReinspectDate] = useState("");
    const [reinspectTime, setReinspectTime] = useState("");
    const [reinspectInspector, setReinspectInspector] = useState("");
    const [reinspectType, setReinspectType] = useState("Structural Inspection");

    // Schedule Inspection Form State
    const [isSchedulingInspection, setIsSchedulingInspection] = useState(false);
    const [inspectionType, setInspectionType] = useState("Structural Inspection");
    const [inspectionDate, setInspectionDate] = useState("");
    const [inspectionTime, setInspectionTime] = useState("");
    const [inspectorName, setInspectorName] = useState("");
    const [inspectionNotes, setInspectionNotes] = useState("");

    const handleScheduleInspection = async () => {
        if (!inspectionDate || !inspectionTime || !inspectorName) {
            toast.error("Please fill in all required fields (Date, Time, Inspector Name)");
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
            setTransaction((prev: any) => ({ ...prev, ...res.data }));
            setIsSchedulingInspection(false);
        } else {
            toast.error(res.error || "Failed to schedule inspection");
        }
        setActionLoading(false);
    };

    const [feeLineItems, setFeeLineItems] = useState<{ label: string; amount: string }[]>([
        { label: "Mayor's Permit Fee", amount: "" }
    ]);

    const addFeeLineItem = () => {
        setFeeLineItems([...feeLineItems, { label: "", amount: "" }]);
    };

    const removeFeeLineItem = (index: number) => {
        const updated = [...feeLineItems];
        updated.splice(index, 1);
        setFeeLineItems(updated);
    };

    const updateFeeLineItem = (index: number, field: 'label' | 'amount', value: string) => {
        const updated = [...feeLineItems];
        updated[index][field] = value;
        setFeeLineItems(updated);
    };

    const isBusinessPermit = transaction?.type?.code?.startsWith("BUSINESS_PERMIT") ?? false;
    const isBuildingPermit = transaction?.type?.code?.startsWith("BUILDING_PERMIT") ?? false;
    const isLCR = (transaction?.type?.code?.startsWith("LCR_") ?? false) || (transaction?.type?.code?.startsWith("CIVIL_REGISTRY") ?? false);
    const typeCode = (transaction?.type?.code || "").toUpperCase();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _isBirth = typeCode.includes("BIRTH");
    const isDeath = typeCode.includes("DEATH");
    const isMarriage = typeCode.includes("MARRIAGE") || typeCode.includes("LICENSE");
    const safeFormatDate = (dateStr: any) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "N/A";
        return format(d, "MMM d, yyyy");
    };
    const isReadOnlyAide = userRole === "ADMIN_AIDE" && isBusinessPermit && transaction?.status !== "FOR_INSPECTION";

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                const tx = res.data;
                setTransaction(tx);

                // Smart Delivery Fee Pre-fill Logic
                if (tx && tx.fulfillmentType === "DELIVERY") {
                    const fiscal = tx.fiscalSnapshot as any;
                    // 1. If already evaluated or has a snapshot, use the stored fee
                    if (fiscal && fiscal.deliveryFee !== undefined) {
                        setDeliveryFee(fiscal.deliveryFee);
                    } else if (tx.totalAmount > 0) {
                        setDeliveryFee(tx.type.deliveryFee);
                    } else {
                        // 2. If new evaluation, look up the Barangay-specific fee
                        const addr = (typeof tx.deliveryAddress === 'string'
                            ? JSON.parse(tx.deliveryAddress || '{}')
                            : tx.deliveryAddress) || tx.user?.residentProfile || tx.residentSnapshot;

                        if (addr?.barangay) {
                            getDeliveryFeeByBarangay(addr.barangay).then(brgyRes => {
                                if (brgyRes.success && brgyRes.data) {
                                    setDeliveryFee(brgyRes.data.fee);
                                } else {
                                    setDeliveryFee(tx.type.deliveryFee);
                                }
                            });
                        } else {
                            setDeliveryFee(tx.type.deliveryFee);
                        }
                    }
                }
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

        // Fetch theme color
        getSystemSettingAction("theme_color", "#2563eb").then(res => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });

        // Fetch branding settings
        Promise.all([
            getSystemSettingAction("brand_word_1", "Mapandan"),
            getSystemSettingAction("brand_word_2", "Express"),
            getSystemSettingAction("site_logo", "")
        ]).then(([w1, w2, logo]) => {
            setBranding({
                word1: w1.data || "Mapandan",
                word2: w2.data || "Express",
                logo: logo.data || ""
            });
        });
    }, [fetchTransaction]);

    useEffect(() => {
        if (transaction) {
            const isBuildingPermit = transaction.type?.code?.startsWith("BUILDING_PERMIT") ?? false;
            if (isBuildingPermit) {
                if (transaction.status === "FOR_REQUESTING" || transaction.status === "FOR_REVISION" || transaction.status === "REJECTED") {
                    router.replace(`/admin/engineer/${id}/evaluation`);
                } else if (transaction.status === "FOR_INSPECTION") {
                    router.replace(`/admin/engineer/${id}/inspection`);
                } else if (transaction.status === "FOR_REINSPECTION") {
                    router.replace(`/admin/engineer/${id}/reinspection`);
                } else if (["EVALUATED", "UNPAID", "PAYMENT_SUBMITTED", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(transaction.status)) {
                    router.replace(`/admin/engineer/${id}/fees`);
                }
            }
        }
    }, [transaction, router, id]);

    useEffect(() => {
        if (!eCopyFile) {
            setECopyPreview(null);
            return;
        }
        const url = URL.createObjectURL(eCopyFile);
        setECopyPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [eCopyFile]);

    useEffect(() => {
        if (!orFile) {
            setOrPreview(null);
            return;
        }
        const url = URL.createObjectURL(orFile);
        setOrPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [orFile]);

    const handleReject = async () => {
        if (!remarks) { toast.error("Remarks required"); return; }
        setActionLoading(true);
        try {
            const res = await rejectTransaction(transaction.id, remarks);
            if (res.success) {
                toast.success("Rejected");
                router.push(backUrl);
            }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    };

    const handleRequestRevision = async () => {
        if (!remarks) { toast.error("Remarks required"); return; }
        setActionLoading(true);
        try {
            const res = await sendForRevision(transaction.id, remarks);
            if (res.success) {
                toast.success("Sent back for revision");
                router.push(backUrl);
            }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    };

    const handleReinspect = async () => {
        if (!reinspectReason) { toast.error("Reason required"); return; }
        if (!reinspectDate || !reinspectTime || !reinspectInspector) { toast.error("Please fill in Date, Time, and Inspector"); return; }
        setActionLoading(true);
        try {
            const res = await markForReinspection(transaction.id, reinspectReason, {
                date: reinspectDate,
                time: reinspectTime,
                inspectorName: reinspectInspector,
                type: reinspectType
            });
            if (res.success) {
                toast.success("Marked for re-inspection");
                setIsReinspecting(false);
                setReinspectReason("");
                router.push(backUrl);
            }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    };

    const handleRelease = useCallback(async () => {

        // CTC or Permit Number required for all initial processing phases (Only for non-Business Permits)
        const ctcRequired = !isBusinessPermit && !["FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(transaction?.status);
        if (ctcRequired && !ctcNumber && !transaction?.cedula?.ctcNumber) {
            toast.error("CTC Number Required");
            return;
        }
        setActionLoading(true);
        try {
            // Strict Validation: E-Copy is REQUIRED for initial processing
            const eCopyRequired = transaction?.status === "FOR_PROCESSING" ||
                (transaction?.status === "PAID" && (transaction?.fulfillmentType === "E_COPY" || transaction?.fulfillmentType === "DELIVERY"));

            if (eCopyRequired && !eCopyFile && !transaction.eCopyUrl) {
                toast.error("Digital E-Copy is required before proceeding.");
                setActionLoading(false);
                return;
            }

            // Strict Validation for Business Permit: OR attachment is also required!
            if (isBusinessPermit && eCopyRequired && !orFile && !transaction.orUrl) {
                toast.error("Official Receipt (OR) copy is required for Business Permits before proceeding.");
                setActionLoading(false);
                return;
            }

            let eCopyUrl = "";
            if (eCopyFile) {
                const formData = new FormData();
                formData.append("file", eCopyFile);
                const uploadRes = await uploadECopyAction(formData);
                if (uploadRes.success) eCopyUrl = uploadRes.data as string;
                else { toast.error("E-Copy upload failed"); setActionLoading(false); return; }
            }

            let orUrl = "";
            if (orFile) {
                const formData = new FormData();
                formData.append("file", orFile);
                const uploadRes = await uploadECopyAction(formData);
                if (uploadRes.success) orUrl = uploadRes.data as string;
                else { toast.error("Official Receipt upload failed"); setActionLoading(false); return; }
            }

            const res = await releaseCedula(transaction.id, ctcNumber, eCopyUrl, orUrl);
            if (res.success) {
                const status = res.data?.status;
                const message = status === "FOR_PICKING"
                    ? "Ready for Picking"
                    : status === "FOR_CLAIM"
                        ? "Marked as Ready for Claiming"
                        : "Document Released";
                toast.success(message);
                setECopyFile(null);
                setOrFile(null);
                router.push(backUrl);
            }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    }, [transaction, ctcNumber, eCopyFile, orFile, router, isBusinessPermit, backUrl]);

    const handleResolveDispute = async () => {
        if (!remarks) { toast.error("Remarks required for resolution"); return; }
        setIsResolvingDispute(true);
        try {
            const res = await resolveDispute(transaction.id, disputeAction, remarks);
            if (res.success) {
                toast.success(`Dispute ${disputeAction === 'APPROVE' ? 'Approved' : 'Rejected'}`);
                setDisputeModalOpen(false);
                router.push(backUrl);
            } else {
                toast.error(res.error || "Resolution failed");
            }
        } finally {
            setIsResolvingDispute(false);
        }
    };

    useEffect(() => {
        if (isRejecting || isRequestingRevision) {
            remarksRef.current?.focus();
        }
    }, [isRejecting, isRequestingRevision]);

    // Handle QR Scan Landing: Auto-focus or Auto-release
    useEffect(() => {
        if (!transaction || loading) return; // Wait for data to be fully loaded

        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("scan") === "true") {
            const timer = setTimeout(() => {
                if (transaction.status === "FOR_CLAIM") {
                    // AUTO-RELEASE for Claiming phase
                    toast.info("QR Pass Detected: Auto-releasing Document...");
                    handleRelease();
                } else {
                    // AUTO-FOCUS for Processing/Paid phase
                    const ctcInput = document.querySelector('input[placeholder="ENTER SERIAL..."]') as HTMLInputElement;
                    if (ctcInput) {
                        ctcInput.focus();
                        toast.success("Ready for Serial Entry");
                    }
                }
            }, 1500); // Slightly longer delay to ensure all components are ready
            return () => clearTimeout(timer);
        }
    }, [transaction, loading, handleRelease]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!transaction) return <div className="p-20 text-center dark:text-white">Protocol Error: Transaction Inaccessible</div>;

    if (isBuildingPermit && !transaction.isCancelled) {
        return (
            <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (transaction.isCancelled) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0c111d] flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-red-500/20 blur-[80px] rounded-full animate-pulse" />
                    <div className="p-8 rounded-[3rem] bg-white dark:bg-slate-900 shadow-2xl relative z-10 border border-red-500/20">
                        <span className="text-8xl">🚫</span>
                    </div>
                </div>
                <div className="space-y-3">
                    <h1 className="text-6xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Request Cancelled</h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-red-500 italic">User Retracted This Protocol</p>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-md">
                    This service request has been officially cancelled by the citizen. No further processing or evaluation is required for this record.
                </p>
                <Link href={backUrl} prefetch={false}>
                    <Button variant="outline" className="h-14 px-8 rounded-2xl border-2 font-black italic uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95">
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        );
    }

    const additional = transaction.additionalData || {};
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const income = Number(additional.income || 0);
    const propertyValue = Number(additional.propertyValue || 0);

    const fiscal = (transaction.fiscalSnapshot as any) || null;
    const deliveryAddr = transaction.deliveryAddress
        ? (typeof transaction.deliveryAddress === 'string' ? JSON.parse(transaction.deliveryAddress) : transaction.deliveryAddress)
        : null;

    const calcResult = (() => {
        if (fiscal && !(isBusinessPermit && transaction.status === "FOR_REQUESTING")) {
            return {
                basicTax: fiscal.basicTax,
                additionalTax: fiscal.additionalTax,
                penalty: fiscal.penaltyCharge,
                deliveryFee: fiscal.deliveryFee || 0,
                totalAmount: fiscal.totalAmount,
                lineItems: fiscal.lineItems
            };
        }

        if (isBusinessPermit) {
            if (transaction.status === "FOR_REQUESTING") {
                const itemsSum = feeLineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                const dFee = transaction.fulfillmentType === "DELIVERY" ? deliveryFee : 0;
                return {
                    basicTax: itemsSum,
                    additionalTax: 0,
                    penalty: 0,
                    deliveryFee: dFee,
                    totalAmount: itemsSum + dFee,
                    lineItems: feeLineItems
                };
            }
            const cap = Number(additional.capitalInvestment || 0);
            const sales = Number(additional.grossSales || 0);
            const res = calculateBusinessPermit({
                type: additional.businessType === "NEW" ? "NEW" : "RENEWAL",
                capitalization: cap,
                grossSales: sales,
                fulfillmentType: transaction.fulfillmentType,
                deliveryFee
            });
            return {
                basicTax: res.baseFee,
                additionalTax: res.taxAmount,
                penalty: 0,
                deliveryFee: res.deliveryFee,
                totalAmount: res.totalAmount
            };
        }

        if (isLCR) {
            // For Civil Registry (LCR) services, prefer persisted transaction.totalAmount
            // (set at submission time) or fall back to type baseFee + delivery fee.
            const isLate = (additional.registrationType || "").toUpperCase() === "LATE";
            const isMarriageReg = typeCode === "LCR_MARRIAGE_REG";
            const baseFee = (isMarriageReg && !isLate)
                ? 0
                : Number(transaction.type?.baseFee || additional.totalAmount || transaction.totalAmount || 0);
            const typeDelivery = Number(transaction.type?.deliveryFee || 0);
            const deliveryFeeUsed = transaction.fulfillmentType === "DELIVERY"
                ? (fiscal?.deliveryFee ?? deliveryFee ?? typeDelivery)
                : 0;
            // Miscellaneous fee: Late registration = ₱300, Standard = ₱0
            const miscFee = isLate ? 300 : 0;
            const total = (transaction.totalAmount && Number(transaction.totalAmount) > 0)
                ? Number(transaction.totalAmount)
                : baseFee + deliveryFeeUsed + miscFee;
            return {
                basicTax: baseFee,
                additionalTax: 0,
                penalty: 0,
                deliveryFee: deliveryFeeUsed,
                miscFee,
                totalAmount: total
            };
        }

        return calculateCedula({
            type: additional.applicantType || "INDIVIDUAL",
            income,
            propertyValue,
            fulfillmentType: transaction.fulfillmentType,
            deliveryFee,
            baseFee: transaction.type?.baseFee
        });
    })();

    // Prefer persisted `transaction.totalAmount` when available (greater than 0); otherwise use calculated result
    const displayTotal = Number((transaction.totalAmount && transaction.totalAmount > 0 && !(isBusinessPermit && transaction.status === "FOR_REQUESTING")) ? transaction.totalAmount : (calcResult.totalAmount ?? 0));

    const declaredValue = isBusinessPermit
        ? (additional.businessType === "NEW" ? Number(additional.capitalInvestment || 0) : Number(additional.grossSales || 0))
        : income;

    const declaredLabel = isBusinessPermit
        ? (additional.businessType === "NEW" ? "Capital Investment" : "Declared Gross Sales")
        : "Declared Gross";

    const baseSteps = [
        { id: "FOR_REQUESTING", label: "EVALUATION" },
        { id: "FOR_INSPECTION", label: "INSPECTION" },
        { id: "PAID", label: "PAID" },
        { id: "FOR_PROCESSING", label: "PROCESSING" },
        {
            id: transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "FOR_CLAIM",
            label: transaction.fulfillmentType === "DELIVERY" ? "FOR PICKING" : "CLAIMING"
        },
        {
            id: transaction.fulfillmentType === "DELIVERY" ? "DELIVERED" : "RELEASED",
            label: transaction.fulfillmentType === "DELIVERY" ? "DELIVERED" : "RELEASED"
        },
    ];

    // Logic to add terminal or dispute steps
    let steps = [...baseSteps];
    const status = transaction.status as string;

    if (status === "REJECTED") {
        steps = [
            { id: "FOR_REQUESTING", label: "EVALUATION" },
            { id: "REJECTED", label: "REJECTED" }
        ];
    } else if (status === "FOR_REVISION") {
        const evalIdx = steps.findIndex(s => s.id === "FOR_REQUESTING" || s.id === "FOR_INSPECTION");
        if (evalIdx >= 0) {
            steps.splice(evalIdx + 1, 0, { id: "FOR_REVISION", label: "REVISION REQ." });
        } else {
            steps.splice(1, 0, { id: "FOR_REVISION", label: "REVISION REQ." });
        }
    } else if (status === "FOR_REINSPECTION") {
        const inspectionIdx = steps.findIndex(s => s.id === "FOR_INSPECTION");
        if (inspectionIdx !== -1) {
            steps.splice(inspectionIdx + 1, 0, { id: "FOR_REINSPECTION", label: "RE-INSPECTION" });
        }
    } else if (status.includes("RETURN") || status.includes("REFUND") || status === "DISPUTE_REJECTED") {
        const disputeLabel = status === "DISPUTE_REJECTED" ? "RETURN REJECTED" : status.replace(/_/g, " ");
        steps.push({ id: status, label: disputeLabel });
    }

    steps = steps.filter(step => {
        // Fast-track: Remove PROCESSING step for Digital Delivery (PAID phase skip)
        if (step.id === "FOR_PROCESSING" &&
            transaction.fulfillmentType === "DELIVERY" &&
            ["E_PAYMENT", "BANK_TRANSFER"].includes(transaction.paymentType)) {
            return false;
        }
        // Over-the-counter Cash on Pick Up: Remove PAID step from middle tracking
        if (step.id === "PAID" &&
            transaction.fulfillmentType === "PICK_UP" &&
            transaction.paymentType === "CASH") {
            return false;
        }
        return true;
    });

    const getEffectiveStatus = (s: string) => {
        return s;
    };
    const currentStepIdx = steps.findIndex(s => s.id === getEffectiveStatus(transaction.status));

    // Build evidence documents list for the Evidence Vault UI
    const evidenceDocs: { url?: string | null; label: string }[] = (() => {
        if (isBusinessPermit) {
            const docs = [
                { url: additional.ownerIdUrl, label: "Owner's Valid ID" },
                { url: additional.ctcUrl, label: "Cedula (CTC) Copy" },
                { url: additional.dtiSecUrl, label: "DTI / SEC Registry" },
                { url: additional.brgyClearanceUrl, label: "Barangay Clearance" },
                { url: additional.locationPhotoUrl, label: "Location Photo" },
                { url: additional.sanitaryPermitUrl, label: "Sanitary Permit" },
                { url: additional.fireSafetyUrl, label: "Fire Safety Certificate" },
                { url: additional.birCorUrl, label: "BIR Certificate (COR)" },
            ];

            // For renewal requests, include the previous business permit document
            if (additional.businessType === "RENEWAL" || additional.previousPermitUrl) {
                docs.push({ url: additional.previousPermitUrl, label: "Previous Business Permit" });
            }

            return docs;
        }

        if (isLCR) {
            const regType = (additional.registrationType || "").toUpperCase();
            const typeCode = (transaction?.type?.code || "").toUpperCase();

            const docs: { url?: string | null; label: string }[] = [];

            // --- Birth Registration ---
            if (typeCode === "LCR_BIRTH_REG" || typeCode === "LCR_BIRTH") {
                if (regType === "LATE") {
                    docs.push({ url: additional.negativePSA, label: "Negative Certification from PSA" });
                    docs.push({ url: additional.colb, label: "Certificate of Live Birth (COLB)" });
                    docs.push({ url: additional.affidavitDelayed, label: "Affidavit of Delayed Registration" });
                    docs.push({ url: additional.supportingEvidence1, label: "Supporting Evidence 1" });
                    docs.push({ url: additional.supportingEvidence2, label: "Supporting Evidence 2" });
                } else {
                    const parentsMarried = additional.parentsMarried === true || additional.parentsMarried === "true";
                    if (parentsMarried) {
                        docs.push({ url: additional.marriageCertificate, label: "Marriage Certificate of Parents" });
                        docs.push({ url: additional.municipalForm102, label: "Municipal Form 102" });
                    } else {
                        docs.push({ url: additional.communityTaxCertificate, label: "Community Tax Certificate" });
                    }
                }
            }

            // --- Death Registration ---
            if (typeCode === "LCR_DEATH_REG" || typeCode === "LCR_DEATH") {
                if (regType === "LATE") {
                    docs.push({ url: additional.psaNegative, label: "PSA Negative Certification" });
                    docs.push({ url: additional.affidavitOfDelay, label: "Affidavit of Delayed Registration" });
                } else {
                    docs.push({ url: additional.municipalForm103, label: "Municipal Form No. 103" });
                }
            }

            // --- Marriage Registration ---
            if (typeCode === "LCR_MARRIAGE_REG" || typeCode === "LCR_MARRIAGE") {
                if (regType === "LATE") {
                    docs.push({ url: additional.psaNeg, label: "Negative Certificate from PSA" });
                    docs.push({ url: additional.affidavitDelay, label: "Affidavit of Delayed Registration" });
                    docs.push({ url: additional.marriageLicense, label: "Certified Copy of Marriage License" });
                } else {
                    docs.push({ url: additional.marriageCert, label: "Accomplished Certificate of Marriage" });
                }
            }

            // --- Marriage License Application ---
            if (typeCode === "LCR_MARRIAGE_LICENSE") {
                const licenseDocs = [
                    "Municipal Form No. 90",
                    "Community Tax Certificate",
                    "Parental Consent of the father/mother",
                    "Certificate of Family Planning",
                    "Certificate of Pre-Marriage Counseling",
                    "Birth Certificate of Applicant 1",
                    "Birth Certificate of Applicant 2",
                    "Government ID of Applicant 1",
                    "Government ID of Applicant 2",
                    "Seminar Attendance Proof",
                    "Legal Capacity (if one party is a foreigner)"
                ];
                for (const key of licenseDocs) {
                    if (additional[key]) {
                        docs.push({ url: additional[key], label: key });
                    }
                }
            }

            // Fallback: add commonly named LCR document keys
            const fallbackKeys = [
                { key: 'marriageCertificate', label: 'Marriage Certificate of Parents' },
                { key: 'municipalForm102', label: 'Municipal Form 102' },
                { key: 'communityTaxCertificate', label: 'Community Tax Certificate' },
                { key: 'negativePSA', label: 'Negative Certification from PSA' },
                { key: 'colb', label: 'Certificate of Live Birth (COLB)' },
                { key: 'affidavitDelayed', label: 'Affidavit of Delayed Registration' },
                { key: 'supportingEvidence1', label: 'Supporting Evidence 1' },
                { key: 'supportingEvidence2', label: 'Supporting Evidence 2' },
                { key: 'municipalForm103', label: 'Municipal Form No. 103' },
                { key: 'psaNegative', label: 'PSA Negative Certification' },
                { key: 'affidavitOfDelay', label: 'Affidavit of Delayed Registration' },
                { key: 'marriageCert', label: 'Accomplished Certificate of Marriage' },
                { key: 'psaNeg', label: 'Negative Certificate from PSA' },
                { key: 'affidavitDelay', label: 'Affidavit of Delayed Registration' },
                { key: 'marriageLicense', label: 'Certified Copy of Marriage License' }
            ];
            for (const fk of fallbackKeys) {
                if (additional[fk.key] && !docs.find(d => d.label === fk.label)) {
                    docs.push({ url: additional[fk.key], label: fk.label });
                }
            }
            // --- NEW: include any uploaded files whose keys match the transaction type's requiredDocs labels ---
            try {
                let reqDocs: string[] = [];
                if (Array.isArray(transaction.type?.requiredDocs)) reqDocs = transaction.type.requiredDocs as string[];
                else if (typeof transaction.type?.requiredDocs === 'string' && transaction.type.requiredDocs.length > 0) {
                    try { reqDocs = JSON.parse(transaction.type.requiredDocs as string); } catch { reqDocs = [] }
                }
                const normalize = (s?: any) => (s || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
                const additionalKeys = Object.keys(additional || {});
                for (const label of reqDocs) {
                    if (!label) continue;
                    let val = (additional as any)[label];
                    if (!val) {
                        // try to find a matching additionalData key by normalized comparison
                        const target = normalize(label);
                        for (const k of additionalKeys) {
                            if (!k) continue;
                            const v = (additional as any)[k];
                            if (!v || typeof v !== 'string') continue;
                            const nk = normalize(k);
                            if (!nk) continue;
                            if (nk === target || nk.includes(target) || target.includes(nk)) {
                                val = v;
                                break;
                            }
                        }
                    }
                    if (val && typeof val === 'string' && !docs.find(d => d.label === label)) {
                        docs.push({ url: val, label });
                    }
                }
            } catch {
                // ignore parsing errors
            }

            // --- ID & Document Uploads for Civil Registry Request/Registration ---
            const idFront = additional.validIdFront || additional.idFrontUrl || resident.idFrontUrl;
            const idBack = additional.validIdBack || additional.idBackUrl || resident.idBackUrl;

            if (idFront && !docs.find(d => d.url === idFront)) {
                docs.push({ url: idFront, label: "Government ID (Front)" });
            }
            if (idBack && !docs.find(d => d.url === idBack)) {
                docs.push({ url: idBack, label: "Government ID (Back)" });
            }

            // Also check for any other uploaded files in additionalData that are valid URLs
            Object.entries(additional).forEach(([key, val]) => {
                if (typeof val === 'string' && val.startsWith('http') && !docs.find(d => d.url === val)) {
                    // Avoid duplicating paymentReference, eCopyUrl, or orUrl in requirements vault
                    if (key !== 'paymentReference' && key !== 'eCopyUrl' && key !== 'orUrl') {
                        // Humanize the key for the label
                        const label = key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .trim();
                        docs.push({ url: val, label });
                    }
                }
            });

            return docs;
        }

        // Default: generic user documents
        return [
            { url: additional.validIdUrl, label: "Valid ID Evidence" },
            { url: additional.proofOfIncomeUrl, label: "Income Verification" }
        ];
    })();

    const handleEvaluate = async () => {
        setActionLoading(true);
        try {
            let itemsToSend: { label: string; amount: number }[] | undefined = undefined;
            if (isBusinessPermit && userRole !== "ADMIN_AIDE") {
                const validItems = feeLineItems.filter(item => item.label.trim() !== "" && item.amount.trim() !== "");
                if (validItems.length === 0) {
                    toast.error("Please add at least one valid fee line item.");
                    setActionLoading(false);
                    return;
                }
                itemsToSend = validItems.map(item => ({
                    label: item.label.trim(),
                    amount: parseFloat(item.amount) || 0
                }));
            }

            const res = await evaluateCedulaTransaction(transaction.id, deliveryFee, remarks, itemsToSend);
            if (res.success) {
                toast.success("Evaluated Successfully");
                router.push(backUrl);
            }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    };

    const handleConfirmPayment = async () => {
        setActionLoading(true);
        try {
            const res = await confirmTransactionPayment(transaction.id);
            if (res.success) { toast.success("Payment Confirmed"); router.push(backUrl); }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    };

    const handlePrintWaybill = () => {
        window.print();
    };

    const hasVerification = !!((transaction?.paymentType === "E_PAYMENT" || transaction?.paymentType === "BANK_TRANSFER") || (transaction?.status === "DELIVERED" && transaction?.podUrl));
    const hasDispute = !!(transaction?.status?.includes("RETURN") || transaction?.status?.includes("REFUND") || transaction?.status === "DISPUTE_REJECTED");
    const isRequirementsAlone = !hasVerification && !hasDispute;

    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            {/* Minimal Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <Link href={backUrl} prefetch={false}>
                    <Button variant="ghost" className="gap-2 text-slate-400 dark:text-slate-500 font-bold hover:text-primary">
                        <ArrowLeft className="w-4 h-4" /> BACK TO DASHBOARD
                    </Button>
                </Link>
                <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-primary/20 text-primary bg-primary/5 px-4 py-1">
                    Type Of Request: {transaction.fulfillmentType?.replace("_", " ") || "Processing"}
                </Badge>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">

                {/* LEFT COLUMN: Assessment & Identity */}
                <div className="col-span-12 lg:col-span-8 space-y-8">

                    {/* MAIN ASSESSMENT CARD */}
                    {!isBuildingPermit && !(userRole === "ADMIN_AIDE" && isBusinessPermit) && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-12">

                            {/* IDENTIFIER */}
                            {!(userRole === "ADMIN_AIDE" && isBusinessPermit) && (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary italic">
                                                {transaction.type.requiresBusinessName
                                                    ? "Registered Business Name"
                                                    : "Primary Applicant Profile"}
                                            </span>
                                            {transaction.revisionCount > 0 ? (
                                                <Badge className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 border border-orange-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-0.5 rounded-full">
                                                    Revision Count: {transaction.revisionCount}
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] font-black italic uppercase tracking-widest px-3 py-0.5 rounded-full">
                                                    First Submission
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between gap-4">
                                            <h1 className="text-5xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                                {transaction.type.requiresBusinessName
                                                    ? (transaction.businessName || additional.businessName || "UNNAMED ENTITY")
                                                    : `${resident.firstName} ${resident.lastName}`}
                                            </h1>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TOP METRICS GRID */}
                            {!(userRole === "ADMIN_AIDE" && isBusinessPermit) && (
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="bg-[#f8fafd] dark:bg-white/5 p-8 rounded-3xl space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{declaredLabel}</span>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-2xl font-black italic tracking-tighter dark:text-slate-200">₱{declaredValue.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="bg-[#f8fafd] dark:bg-white/5 p-8 rounded-3xl space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment Mode</span>
                                        <p className={cn(
                                            "font-black italic tracking-tighter dark:text-slate-200 leading-none",
                                            (transaction.paymentType?.length || 0) > 12 ? "text-xl" : "text-2xl"
                                        )}>
                                            {transaction.paymentType?.replace(/_/g, " ") || "--"}
                                        </p>
                                    </div>
                                    <div className="bg-[#f8fafd] dark:bg-white/5 p-8 rounded-3xl space-y-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Total Amount</span>
                                        <p className="text-2xl font-black italic tracking-tighter text-primary">₱{calcResult.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            )}

                            {/* INCOME SOURCE */}
                            {!(userRole === "ADMIN_AIDE" && isBusinessPermit) && additional.incomeSource && (
                                <div className="border-t border-dashed border-slate-100 dark:border-white/5 pt-6 space-y-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        Primary Source of Income
                                    </span>
                                    <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-2xl flex items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black italic text-base select-none">
                                                {additional.incomeSource.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-base font-black italic uppercase tracking-tight text-slate-800 dark:text-white leading-tight">
                                                    {(() => {
                                                        if (additional.incomeSource === "PROFESSION") return "Profession";
                                                        if (additional.incomeSource === "BUSINESS") return "Business";
                                                        if (additional.incomeSource === "PROPERTY") return "Real Property";
                                                        return additional.incomeSource;
                                                    })()}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                                                    Declared for Tax Computation
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* COMPUTATION BREAKDOWN */}
                            {!(userRole === "ADMIN_AIDE" && isBusinessPermit) && (
                                <div className={cn("space-y-6", additional.incomeSource ? "pt-0 !mt-6" : "pt-6")}>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                        {isBusinessPermit ? "Fee Assessment Breakdown" : "Tax Computation Breakdown"}
                                    </h3>
                                    <div className="space-y-4">
                                        {isBusinessPermit ? (
                                            (transaction.status === "FOR_REQUESTING" && (userRole === "TREASURY_STAFF" || userRole === "ADMIN")) ? (
                                                <div className="bg-slate-50 dark:bg-white/[0.01] border border-slate-100 dark:border-white/5 rounded-2xl p-4 space-y-3">
                                                    {feeLineItems.map((item, idx) => (
                                                        <div key={idx} className="flex gap-3 items-center group bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 px-3 py-1.5 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                                            <span className="text-[9px] font-mono font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 w-6 h-6 flex items-center justify-center rounded-lg select-none shrink-0">
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            <input
                                                                type="text"
                                                                placeholder="Fee Description"
                                                                value={item.label}
                                                                onChange={(e) => updateFeeLineItem(idx, 'label', e.target.value)}
                                                                className="flex-1 h-9 bg-transparent text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none border-none p-0 focus:ring-0"
                                                            />
                                                            <div className="relative w-28 shrink-0 flex items-center border-l border-slate-100 dark:border-white/5 pl-3">
                                                                <span className="text-xs font-black text-slate-400 mr-1 select-none">₱</span>
                                                                <input
                                                                    type="number"
                                                                    placeholder="0.00"
                                                                    value={item.amount}
                                                                    onChange={(e) => updateFeeLineItem(idx, 'amount', e.target.value)}
                                                                    className="w-full bg-transparent text-sm font-black text-right text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none border-none p-0 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                            </div>
                                                            {feeLineItems.length > 1 ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removeFeeLineItem(idx)}
                                                                    className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all shrink-0 md:opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            ) : (
                                                                <div className="w-8 h-8 shrink-0" />
                                                            )}
                                                        </div>
                                                    ))}
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        onClick={addFeeLineItem}
                                                        className="h-10 px-4 rounded-xl border border-dashed border-slate-200 dark:border-white/10 font-black italic text-[10px] tracking-widest gap-2 text-slate-400 hover:text-primary hover:border-primary/50 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-all w-full mt-1"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" /> ADD FEE LINE ITEM
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {(calcResult as any).lineItems && (calcResult as any).lineItems.length > 0 ? (
                                                        (calcResult as any).lineItems.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                                <span>{item.label}</span>
                                                                <span className="dark:text-slate-200">₱{(Number(item.amount) || 0).toFixed(2)}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                            <span>Base Mayors Permit Fee</span>
                                                            <span className="dark:text-slate-200">₱{calcResult.basicTax.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            <>
                                                {!isLCR && (
                                                    <>
                                                        <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                            <span>Basic Community Tax</span>
                                                            <span className="dark:text-slate-200">₱{calcResult.basicTax.toFixed(2)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                            <span>Additional Tax (₱1.00 per ₱1,000 gross)</span>
                                                            <span className="dark:text-slate-200">₱{calcResult.additionalTax.toFixed(2)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                        {calcResult.penalty > 0 && (
                                            <div className="flex justify-between items-center text-sm font-bold text-orange-500 italic">
                                                <span>Penalty Charge</span>
                                                <span>₱{calcResult.penalty.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {transaction.fulfillmentType === "DELIVERY" && (
                                            <div className="flex justify-between items-center pt-2 gap-4">
                                                <span className="text-sm font-bold text-slate-600 dark:text-slate-400 italic">Delivery Fee</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-primary">₱</span>
                                                    <span className="text-xs font-black dark:text-white italic">
                                                        {deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                        {isLCR && (
                                            <div className="flex justify-between items-center pt-2 gap-4">
                                                <div>
                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 italic">Miscellaneous Fee</span>
                                                    <p className="text-[10px] text-slate-400 italic">
                                                        {(additional.registrationType || "").toUpperCase() === "LATE"
                                                            ? "Late registration surcharge"
                                                            : "Standard registration — no surcharge"}
                                                    </p>
                                                </div>
                                                {(additional.registrationType || "").toUpperCase() === "LATE" ? (
                                                    <span className="text-sm font-black text-amber-600 italic">₱300.00</span>
                                                ) : (
                                                    <span className="text-sm font-black text-emerald-600 italic">FREE</span>
                                                )}
                                            </div>
                                        )}

                                        <div className="border-t border-dotted border-slate-300 dark:border-white/10 pt-8 mt-8 flex justify-between items-center">
                                            <span className="text-lg font-black uppercase italic tracking-widest text-slate-900 dark:text-white leading-none">Total Amount</span>
                                            <span className="text-4xl font-black italic tracking-tighter text-primary leading-none">
                                                ₱{displayTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LCR SPECIFIC DETAILS */}
                            {isLCR && (
                                <div className="space-y-8 pt-8 border-t border-dotted border-slate-300 dark:border-white/10">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-500 rounded-xl text-white shadow-lg shadow-blue-500/20">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 italic">
                                            {isDeath ? "Death Registry Record Data" : isMarriage ? "Marriage Registry Record Data" : "Birth Registry Record Data"}
                                        </h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        {/* Column 1: Primary Subject details */}
                                        <div className="space-y-6">
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-500 italic">
                                                {isDeath ? "Deceased / Event Info" : isMarriage ? "Contracting Parties / Marriage Info" : "Subject / Document Info"}
                                            </h4>
                                            <div className="bg-[#f8fafd] dark:bg-white/5 p-8 rounded-3xl space-y-5">
                                                {/* Deceased/Subject Name */}
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                        {isMarriage ? "Contracting Couple" : isDeath ? "Deceased Full Name" : "Subject Name"}
                                                    </span>
                                                    <p className="text-lg font-black italic uppercase text-slate-600 dark:text-slate-200">
                                                        {isDeath
                                                            ? (transaction.deathRegistration?.subjectName || additional.fullName || additional.subjectName || "N/A")
                                                            : isMarriage
                                                                ? (transaction.marriageRegistration?.businessName ||
                                                                    (transaction.marriageLicenseApplication
                                                                        ? `${transaction.marriageLicenseApplication.app1FullName} & ${transaction.marriageLicenseApplication.app2FullName}`
                                                                        : additional.subjectName || "N/A"))
                                                                : (transaction.birthCertificateRegistry?.subjectName || transaction.birthCertificateRequest?.subjectName || additional.subjectName || "N/A")}
                                                    </p>
                                                </div>

                                                {/* Event Date & Registry No */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                            {isDeath ? "Date of Death" : isMarriage ? "Date of Marriage" : "Event Date"}
                                                        </span>
                                                        <p className="text-md font-black italic text-slate-600 dark:text-slate-200">
                                                            {isDeath
                                                                ? safeFormatDate(transaction.deathRegistration?.dateOfEvent || additional.dateOfDeath || additional.dateOfEvent)
                                                                : isMarriage
                                                                    ? safeFormatDate(additional.dateOfMarriage || additional.dateOfEvent || transaction.marriageLicenseApplication?.dateIssued)
                                                                    : safeFormatDate(transaction.birthCertificateRegistry?.dateOfEvent || transaction.birthCertificateRequest?.dateOfEvent || additional.dateOfEvent)}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Registry No.</span>
                                                        <p className="text-md font-black italic text-slate-600 dark:text-slate-200">
                                                            {isDeath
                                                                ? (transaction.deathRegistration?.registryNumber || "PENDING")
                                                                : isMarriage
                                                                    ? (transaction.marriageRegistration?.ctcNumber || transaction.marriageLicenseApplication?.registryNumber || "PENDING")
                                                                    : (transaction.birthCertificateRegistry?.registryNumber || transaction.birthCertificateRequest?.registryNumber || "PENDING")}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Extra Fields specifically for Death */}
                                                {isDeath && (
                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-white/5">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cause of Death</span>
                                                            <p className="text-sm font-black italic uppercase text-slate-600 dark:text-slate-200">
                                                                {additional.causeOfDeath || "N/A"}
                                                            </p>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Place of Death</span>
                                                            <p className="text-sm font-black italic uppercase text-slate-600 dark:text-slate-200">
                                                                {transaction.deathRegistration?.placeOfEvent || additional.placeOfEvent || additional.placeOfDeath || "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Extra Fields specifically for Marriage */}
                                                {isMarriage && (
                                                    <div className="space-y-1 pt-4 border-t border-slate-100 dark:border-white/5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Place of Marriage</span>
                                                        <p className="text-sm font-black italic uppercase text-slate-600 dark:text-slate-200">
                                                            {additional.placeOfMarriage || "N/A"}
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Issued By info */}
                                                {(transaction.deathRegistration?.issuedBy ||
                                                    transaction.birthCertificateRegistry?.issuedBy ||
                                                    transaction.birthCertificateRequest?.issuedBy ||
                                                    transaction.marriageRegistration?.issuedBy ||
                                                    transaction.marriageLicenseApplication?.issuedBy ||
                                                    additional.issuedBy) && (
                                                        <div className="space-y-1 border-t border-slate-100 dark:border-white/5 pt-4">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Issued By</span>
                                                            <p className="text-md font-black italic uppercase text-slate-600 dark:text-slate-200">
                                                                {isDeath
                                                                    ? (transaction.deathRegistration?.issuedBy || additional.issuedBy)
                                                                    : isMarriage
                                                                        ? (transaction.marriageRegistration?.issuedBy || transaction.marriageLicenseApplication?.issuedBy || additional.issuedBy)
                                                                        : (transaction.birthCertificateRegistry?.issuedBy || transaction.birthCertificateRequest?.issuedBy || additional.issuedBy)}
                                                            </p>
                                                        </div>
                                                    )}
                                            </div>
                                        </div>

                                        {/* Column 2: Secondary parties details */}
                                        <div className="space-y-6">
                                            {isDeath ? (
                                                <>
                                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-500 italic">Parental Dossier</h4>
                                                    <div className="space-y-4">
                                                        {/* Parents */}
                                                        <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-3xl space-y-3">
                                                            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic block">Parental Matrix</span>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div>
                                                                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block mb-1">Father</span>
                                                                    <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-200">
                                                                        {additional.fathersName || additional.fatherName || "N/A"}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <span className="text-[8px] uppercase tracking-wider text-slate-400 block mb-1">Mother</span>
                                                                    <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-200">
                                                                        {additional.mothersName || additional.motherName || "N/A"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : isMarriage ? (
                                                <>
                                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-500 italic">Applicants Dossier</h4>
                                                    <div className="space-y-4">
                                                        {/* Applicant 1 */}
                                                        {(additional.applicant1 || transaction.marriageLicenseApplication) && (
                                                            <div className="bg-[#f8fafd] dark:bg-white/5 p-5 rounded-3xl space-y-2">
                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic block">Applicant 1 (Groom/Spouse)</span>
                                                                <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-200 leading-none">
                                                                    {additional.applicant1?.fullName || transaction.marriageLicenseApplication?.app1FullName}
                                                                </p>
                                                                <div className="grid grid-cols-2 gap-2 text-[9px] font-medium text-slate-400 italic pt-1">
                                                                    <span>DOB: {safeFormatDate(additional.applicant1?.birthDate || transaction.marriageLicenseApplication?.app1BirthDate)}</span>
                                                                    <span>Citizenship: {additional.applicant1?.citizenship || transaction.marriageLicenseApplication?.app1Citizenship || "N/A"}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Applicant 2 */}
                                                        {(additional.applicant2 || transaction.marriageLicenseApplication) && (
                                                            <div className="bg-[#f8fafd] dark:bg-white/5 p-5 rounded-3xl space-y-2">
                                                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic block">Applicant 2 (Bride/Spouse)</span>
                                                                <p className="text-xs font-black uppercase text-slate-600 dark:text-slate-200 leading-none">
                                                                    {additional.applicant2?.fullName || transaction.marriageLicenseApplication?.app2FullName}
                                                                </p>
                                                                <div className="grid grid-cols-2 gap-2 text-[9px] font-medium text-slate-400 italic pt-1">
                                                                    <span>DOB: {safeFormatDate(additional.applicant2?.birthDate || transaction.marriageLicenseApplication?.app2BirthDate)}</span>
                                                                    <span>Citizenship: {additional.applicant2?.citizenship || transaction.marriageLicenseApplication?.app2Citizenship || "N/A"}</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Birth Details */}
                                                    {(additional.fatherName || additional.motherName || transaction.birthCertificateRegistry?.fatherName || transaction.birthCertificateRegistry?.motherName) && (
                                                        <div className="space-y-6">
                                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-blue-500 italic">Parental Matrix</h4>
                                                            <div className="space-y-4">
                                                                {(additional.fatherName || transaction.birthCertificateRegistry?.fatherName) && (
                                                                    <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-3xl">
                                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic mb-2 block">Father</span>
                                                                        <p className="text-sm font-black italic uppercase text-slate-600 dark:text-slate-200">
                                                                            {transaction.birthCertificateRegistry?.fatherName || additional.fatherName}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {(additional.motherName || transaction.birthCertificateRegistry?.motherName) && (
                                                                    <div className="bg-[#f8fafd] dark:bg-white/5 p-6 rounded-3xl">
                                                                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary italic mb-2 block">Mother</span>
                                                                        <p className="text-sm font-black italic uppercase text-slate-600 dark:text-slate-200">
                                                                            {transaction.birthCertificateRegistry?.motherName || additional.motherName}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TOGGLE PREVIOUS PHASES FOR INSPECTION */}
                    {transaction.status === "FOR_INSPECTION" && (
                        <div className="flex justify-end mb-4">
                            <Button
                                variant="outline"
                                onClick={() => setShowPreviousPhases(!showPreviousPhases)}
                                className="border-dashed bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-xs uppercase font-bold tracking-widest"
                            >
                                {showPreviousPhases ? "Hide Previous Phase Data" : "View Previous Phase Data (Profile & Forms)"}
                            </Button>
                        </div>
                    )}

                    {/* INLINE IDENTITY DOSSIER */}
                    {(transaction.status !== "FOR_INSPECTION" || showPreviousPhases) && (
                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-12 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-6">
                                <div>
                                    <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                        {isLCR ? "Informant" : "Resident"} <span className="text-primary">{isLCR ? "Profile" : "Identity Profile"}</span>
                                    </h2>
                                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">
                                        {isLCR ? "Verified Requester / Informant Data Dossier" : "Verified Citizen Data Dossier"}
                                    </p>
                                </div>
                            </div>

                            {/* Citizen Profile Grid */}
                            <div className="grid grid-cols-12 gap-x-6 gap-y-6">
                                {/* Row 1: Names */}
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">First Name</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.firstName || "--"}
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Middle Name</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.middleName || "--"}
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Last Name</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.lastName || "--"}
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Suffix</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.suffix || "--"}
                                    </div>
                                </div>

                                {/* Row 2: Details */}
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Birth Date</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.dateOfBirth ? format(new Date(resident.dateOfBirth), "MMM d, yyyy") : "--"}
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-2 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Age</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.age ?? (resident?.dateOfBirth ? differenceInYears(new Date(), new Date(resident.dateOfBirth)) : "--")}
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-3 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Civil Status</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase">
                                        {resident?.civilStatus || "--"}
                                    </div>
                                </div>
                                <div className="col-span-12 md:col-span-4 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Contact Number</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.contactNumber || "--"}
                                    </div>
                                </div>

                                {/* Row 3: Address */}
                                <div className="col-span-12 md:col-span-6 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Occupation</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                        {resident?.occupation || "--"}
                                    </div>
                                </div>
                                {isLCR && additional.relationship && (
                                    <div className="col-span-12 space-y-2 animate-in fade-in duration-300">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Relationship to Subject / Deceased</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                            {additional.relationship || "--"}
                                        </div>
                                    </div>
                                )}
                                <div className="col-span-12 md:col-span-6 space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Barangay & Complete Address</label>
                                    <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                        {resident?.houseNumber || ""} {resident?.street || ""} {resident?.barangay ? `${resident.barangay}, Mapandan, Pangasinan` : "--"}
                                    </div>
                                </div>
                            </div>

                            {/* Business Profile */}
                            {isBusinessPermit && (
                                <div className="border-t border-slate-100 dark:border-white/5 pt-8 space-y-8 animate-in fade-in duration-300">
                                    <div>
                                        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                            Business <span className="text-primary">Record </span>
                                        </h2>
                                        <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">
                                            BPLO Registration Details
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-12 gap-x-6 gap-y-6">
                                        {/* Business Row 1 */}
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Official Business Name</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-sm text-primary uppercase truncate">
                                                {additional?.businessName || "--"}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Trade Signage Name</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                {additional?.tradeName || "Same as Business Name"}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Organization Type</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase truncate">
                                                {additional?.orgType ? additional.orgType.replace(/_/g, " ") : "--"}
                                            </div>
                                        </div>

                                        {/* Business Row 2 */}
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Building / Unit</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                {additional?.building || "--"}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Street Address</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                {additional?.street || "--"}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Business Barangay</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase truncate">
                                                {additional?.businessBarangay || additional?.barangay || resident?.barangay || "--"}
                                            </div>
                                        </div>

                                        {/* Business Row 3 */}
                                        <div className="col-span-12 md:col-span-6 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Line of Business</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                {additional?.lineOfBusiness || "General"}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-6 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                                                {additional?.businessType === "RENEWAL" ? "Existing Permit License" : "Registration / Permit No."}
                                            </label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-primary truncate">
                                                {transaction.businessPermit?.permitNumber || additional?.existingPermitNumber || additional?.permitNumber || additional?.dtiSecNumber || "--"}
                                            </div>
                                        </div>

                                        {/* Business Row 4 */}
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Employee Count</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                                {additional?.employeeCount ?? "0"}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Store Area</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100">
                                                {additional?.businessArea ? `${additional.businessArea} sqm` : "0 sqm"}
                                            </div>
                                        </div>
                                        <div className="col-span-12 md:col-span-4 space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Capital / Declared Gross</label>
                                            <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-sm text-primary">
                                                ₱{Number(additional?.grossSales || additional?.capitalInvestment || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* BUILDING PERMIT SPECIFIC BLOCKS */}
                            {/* Building permit renders on dedicated sub-pages via redirection */}
                        </div>
                    )}


                    {/* IDENTITY & AUTHENTICATION */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                        {/* Evidence Vault */}
                        {!isBuildingPermit && (
                            <div className={cn(
                                "bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border-slate-50 dark:border-white/5 border space-y-6 transition-all duration-500",
                                isRequirementsAlone && "md:col-span-2"
                            )}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg"><FileText className="text-primary w-4 h-4" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">All the Requirements</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {evidenceDocs.filter(doc => doc && doc.url).map((doc, i) => (
                                        <Dialog key={i}>
                                            <DialogTrigger asChild>
                                                <div className={cn(
                                                    "group relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center cursor-zoom-in transition-all duration-500",
                                                    isRequirementsAlone ? "aspect-[4/3]" : "aspect-video"
                                                )}>
                                                    {doc.url ? (
                                                        <>
                                                            {doc.url?.toLowerCase().includes('.pdf') ? (
                                                                <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
                                                                    <FileText className="w-8 h-8 mb-1" />
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">PDF</span>
                                                                </div>
                                                            ) : (
                                                                <Image src={isValidUrl(doc.url) ? doc.url : "/placeholder.png"} alt={doc.label} fill className="object-cover group-hover:scale-105 transition-transform animate-in fade-in duration-300" />
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
                                                        </>
                                                    ) : (
                                                        <Camera className="w-6 h-6 text-slate-200 dark:text-slate-700" />
                                                    )}
                                                </div>
                                            </DialogTrigger>
                                            {doc.url && (
                                                <LightboxView src={doc.url} alt={doc.label} label={doc.label} />
                                            )}
                                        </Dialog>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Verification Vault: Payment & Delivery */}
                        {((transaction.paymentType === "E_PAYMENT" || transaction.paymentType === "BANK_TRANSFER") || (transaction.status === "DELIVERED" && transaction.podUrl)) && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border-slate-50 dark:border-white/5 border space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary/10 rounded-lg"><Camera className="text-primary w-4 h-4" /></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Verification</span>
                                </div>

                                <div className={cn(
                                    "grid gap-4",
                                    ((transaction.paymentType === "E_PAYMENT" || transaction.paymentType === "BANK_TRANSFER") && (transaction.status === "DELIVERED" && transaction.podUrl)) ? "grid-cols-2" : "grid-cols-1"
                                )}>
                                    {/* 1. Payment Proof */}
                                    {(transaction.paymentType === "E_PAYMENT" || transaction.paymentType === "BANK_TRANSFER") && (
                                        <div className="space-y-3">
                                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic ml-1">Payment Proof</p>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className={cn(
                                                        "group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center",
                                                        transaction.paymentReference && "cursor-zoom-in"
                                                    )}>
                                                        {transaction.paymentReference ? (
                                                            <>
                                                                {/* Guarded Image */}
                                                                {transaction.paymentReference?.toLowerCase().includes('.pdf') ? (
                                                                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
                                                                        <FileText className="w-8 h-8 mb-1" />
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">PDF</span>
                                                                    </div>
                                                                ) : (
                                                                    <Image src={isValidUrl(transaction.paymentReference) ? transaction.paymentReference : "/placeholder.png"} alt="Payment" fill className="object-cover group-hover:scale-105 transition-transform" />
                                                                )}
                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                                        <ZoomIn className="w-4 h-4 text-white" />
                                                                    </div>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="text-center opacity-30 italic font-black text-[9px] uppercase tracking-widest dark:text-slate-500">Awaiting Proof</div>
                                                        )}
                                                    </div>
                                                </DialogTrigger>
                                                {transaction.paymentReference && (
                                                    <LightboxView src={transaction.paymentReference} alt="Payment Proof" label="Payment Verification Proof" />
                                                )}
                                            </Dialog>

                                            {/* GCash Reference Number Section - Premium Copyable Badge */}
                                            {((transaction.additionalData as any)?.gcashReferenceNo) && (
                                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2 mt-2 group/ref relative overflow-hidden transition-all hover:border-primary/20 shadow-sm">
                                                    <div className="flex items-center gap-2">
                                                        <Hash className="w-3.5 h-3.5 text-primary" />
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Reference Number</span>
                                                    </div>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <span className="text-xs md:text-sm font-black tracking-tight text-slate-800 dark:text-white select-all font-mono">
                                                            {(transaction.additionalData as any).gcashReferenceNo}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText((transaction.additionalData as any).gcashReferenceNo);
                                                                toast.success("Reference Number Copied!");
                                                            }}
                                                            className="text-[8px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-all flex items-center gap-1.5 bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/10 hover:scale-105 active:scale-95 shrink-0"
                                                        >
                                                            Copy
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 2. Proof of Delivery */}
                                    {transaction.status === "DELIVERED" && transaction.podUrl && (
                                        <div className="space-y-3 animate-in slide-in-from-right-4">
                                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest italic ml-1">Delivery POD</p>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center cursor-zoom-in">
                                                        {/* Guarded Image */}
                                                        {transaction.podUrl?.toLowerCase().includes('.pdf') ? (
                                                            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
                                                                <FileText className="w-8 h-8 mb-1" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">PDF</span>
                                                            </div>
                                                        ) : (
                                                            <Image src={isValidUrl(transaction.podUrl) ? transaction.podUrl : "/placeholder.png"} alt="POD" fill className="object-cover group-hover:scale-105 transition-transform" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                                <ZoomIn className="w-5 h-5 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                <LightboxView src={transaction.podUrl} alt="Proof of Delivery" label="Delivery Confirmation Snapshot" />
                                            </Dialog>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 3. DISPUTE EVIDENCE (Return / Refund) */}
                        {(transaction.status.includes("RETURN") || transaction.status.includes("REFUND") || transaction.status === "DISPUTE_REJECTED") && (
                            <div className="md:col-span-2 bg-orange-500/5 p-8 rounded-[2.5rem] border border-orange-500/20 space-y-6 animate-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-500 rounded-2xl text-white shadow-lg shadow-orange-500/20">
                                            <AlertCircle className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-orange-500 tracking-widest italic">Citizen Dispute Filed</p>
                                            <p className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                                                Request for {transaction.status.includes("REFUND") ? "Financial Refund" : "Document Return"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge className="bg-orange-500 text-white font-black italic uppercase tracking-widest text-[9px] px-4 py-1.5 rounded-full">
                                        PENDING REVIEW
                                    </Badge>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                    <div className="space-y-3">
                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic ml-1">Stated Reason</p>
                                        <div className="p-6 bg-white dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 italic font-medium text-sm text-slate-600 dark:text-slate-300 min-h-[100px]">
                                            {transaction.disputeReason || "No reason provided."}
                                        </div>
                                    </div>

                                    {transaction.disputeProofUrl && (
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest italic ml-1">Evidence Provided</p>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="group relative aspect-video rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center cursor-zoom-in shadow-md hover:shadow-xl transition-all">
                                                        {/* Guarded Image */}
                                                        {transaction.disputeProofUrl?.toLowerCase().includes('.pdf') ? (
                                                            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-colors">
                                                                <FileText className="w-8 h-8 mb-1" />
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">PDF</span>
                                                            </div>
                                                        ) : (
                                                            <Image src={isValidUrl(transaction.disputeProofUrl) ? transaction.disputeProofUrl : "/placeholder.png"} alt="Proof" fill className="object-cover group-hover:scale-105 transition-transform" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                                                                <ZoomIn className="w-6 h-6 text-white" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DialogTrigger>
                                                <LightboxView src={transaction.disputeProofUrl} alt="Evidence" label="Citizen Evidence Proof" />
                                            </Dialog>
                                        </div>
                                    )}
                                </div>

                                {transaction.disputeRemarks && (
                                    <div className="p-6 bg-slate-900 rounded-2xl space-y-2 border border-white/10">
                                        <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest italic">Resolution Remarks</p>
                                        <p className="text-xs font-bold text-white italic italic leading-relaxed">&quot;{transaction.disputeRemarks}&quot;</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Workflow Tracking & Actions */}
                <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-16 self-start">

                    {/* WORKFLOW TRACKING */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-10 shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-50 dark:border-white/5 space-y-10">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic">Workflow Tracking</span>

                        <div className="space-y-12 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-800" />

                            {steps.map((step, idx) => {
                                const isPast = idx < currentStepIdx;
                                const isCurrent = idx === currentStepIdx;
                                return (
                                    <div key={idx} className="flex items-center gap-6 relative z-10">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-black italic text-[11px] transition-all duration-500",
                                            isPast ? "bg-primary text-white shadow-lg shadow-primary/20" :
                                                isCurrent ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] ring-[6px] ring-primary/10" :
                                                    "bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-white/5 text-slate-300 dark:text-slate-600"
                                        )}>
                                            {isPast ? <Check className="w-4 h-4" /> : idx + 1}
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-black uppercase tracking-widest italic transition-colors duration-500",
                                            isCurrent ? "text-[#1e293b] dark:text-white" : "text-slate-300 dark:text-slate-600"
                                        )}>
                                            {step.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* DIGITAL ISSUANCE (E-COPY) - Visible in FOR_PROCESSING, FOR_CLAIM (if not yet recorded), or for PAID digital deliveries */}
                    {(
                        transaction.status === "FOR_PROCESSING" ||
                        (transaction.status === "FOR_CLAIM" &&
                            !(transaction.fulfillmentType === "PICK_UP" && transaction.paymentType === "CASH") &&
                            !transaction.eCopyUrl
                        ) ||
                        (transaction.status === "PAID" && (
                            transaction.fulfillmentType === "E_COPY" ||
                            (transaction.fulfillmentType === "DELIVERY" && ["E_PAYMENT", "BANK_TRANSFER"].includes(transaction.paymentType))
                        ))
                    ) && (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border-slate-50 dark:border-white/5 border space-y-6">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 italic block">
                                    {isBusinessPermit ? "Registry & Official Receipt Protocol" : "Digital Record Protocol"}
                                </span>

                                <div className={cn("grid gap-6", isBusinessPermit ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
                                    {/* E-Copy Upload Block */}
                                    <div className="relative flex flex-col gap-2">
                                        {isBusinessPermit && <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">1. Digital E-Copy Permit</span>}
                                        {transaction.status !== "RELEASED" && !isReadOnlyAide && (
                                            <input type="file" accept=".pdf,image/*" onChange={(e) => setECopyFile(e.target.files?.[0] || null)} className="hidden" id="main-ecopy-upload" />
                                        )}

                                        {transaction.status === "RELEASED" ? (
                                            <a
                                                href={transaction.eCopyUrl || "#"}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex flex-col items-center justify-center rounded-3xl border-2 border-primary/30 bg-primary/5 transition-all h-48 border-solid overflow-hidden group relative"
                                            >
                                                {transaction.eCopyUrl && (transaction.eCopyUrl.toLowerCase().endsWith(".jpg") || transaction.eCopyUrl.toLowerCase().endsWith(".png") || transaction.eCopyUrl.toLowerCase().endsWith(".jpeg") || transaction.eCopyUrl.includes("image")) ? (
                                                    <Image
                                                        src={isValidUrl(transaction.eCopyUrl) ? transaction.eCopyUrl : "/placeholder.png"}
                                                        fill
                                                        className="object-cover opacity-80 hover:opacity-100 transition-opacity"
                                                        alt="Official Registry"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <div className="p-4 rounded-2xl bg-primary text-white shadow-lg">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest italic text-primary text-center">
                                                            View Registry (PDF)
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="absolute top-4 right-4"><ExternalLink className="w-4 h-4 text-primary" /></div>
                                            </a>
                                        ) : (
                                            <label htmlFor={isReadOnlyAide ? undefined : "main-ecopy-upload"} className={cn(
                                                "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition-all h-48 bg-[#f8fafd] dark:bg-white/5 overflow-hidden relative group",
                                                isReadOnlyAide ? "border-slate-100 dark:border-white/5 cursor-not-allowed" : (eCopyFile || transaction.eCopyUrl ? "border-primary/30 bg-primary/5 shadow-inner cursor-pointer" : "border-slate-100 dark:border-white/5 hover:border-primary/30 cursor-pointer")
                                            )}>
                                                {(eCopyPreview || transaction.eCopyUrl) ? (
                                                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center">
                                                        {((eCopyFile && eCopyFile.type.startsWith("image/")) || (!eCopyFile && transaction.eCopyUrl && (transaction.eCopyUrl.toLowerCase().endsWith(".jpg") || transaction.eCopyUrl.toLowerCase().endsWith(".png") || transaction.eCopyUrl.toLowerCase().endsWith(".jpeg")))) ? (
                                                            <Image
                                                                src={isValidUrl(eCopyPreview || transaction.eCopyUrl) ? (eCopyPreview || transaction.eCopyUrl) : "/placeholder.png"}
                                                                fill
                                                                className="object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                                alt="Registry Preview"
                                                                unoptimized
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center text-primary/40 group-hover:text-primary transition-colors">
                                                                <FileText className="w-12 h-12" />
                                                                <span className="text-[9px] font-black uppercase italic tracking-widest mt-2">PDF Document Ready</span>
                                                            </div>
                                                        )}

                                                        {!isReadOnlyAide && (
                                                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                                                                    <Upload className="w-4 h-4" />
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase text-white tracking-widest italic">Update Attachment</span>
                                                            </div>
                                                        )}

                                                        <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-5 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                            <div className="flex items-center gap-3 overflow-hidden">
                                                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                                    <Check className="w-3.5 h-3.5 text-primary" />
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-700 dark:text-slate-300 truncate">
                                                                    {eCopyFile?.name || "Registry-Record-ID-" + transaction.id.slice(-6).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className={cn(
                                                            "p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 shadow-sm transition-all duration-500 scale-110",
                                                            !isReadOnlyAide && "group-hover:bg-primary group-hover:text-white"
                                                        )}>
                                                            <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                        </div>
                                                        <div className="text-center space-y-1">
                                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400 dark:text-slate-500 block">
                                                                {isReadOnlyAide ? "Official Digital Record" : "Attach E-Copy Registry"}
                                                            </span>
                                                            <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase italic tracking-tighter">
                                                                {isReadOnlyAide ? "Pending upload by Treasury Staff" : "PDF or Image up to 5MB"}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </label>
                                        )}
                                    </div>

                                    {/* OR / Official Receipt Upload Block (Only for Business Permits) */}
                                    {isBusinessPermit && (
                                        <div className="relative flex flex-col gap-2 animate-in fade-in-50 duration-500">
                                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">2. Official Receipt (OR)</span>
                                            {transaction.status !== "RELEASED" && !isReadOnlyAide && (
                                                <input type="file" accept=".pdf,image/*" onChange={(e) => setOrFile(e.target.files?.[0] || null)} className="hidden" id="main-or-upload" />
                                            )}

                                            {transaction.status === "RELEASED" || transaction.orUrl ? (
                                                <a
                                                    href={transaction.orUrl || "#"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex flex-col items-center justify-center rounded-3xl border-2 border-emerald-500/30 bg-emerald-500/5 transition-all h-48 border-solid overflow-hidden group relative"
                                                >
                                                    {transaction.orUrl && (transaction.orUrl.toLowerCase().endsWith(".jpg") || transaction.orUrl.toLowerCase().endsWith(".png") || transaction.orUrl.toLowerCase().endsWith(".jpeg") || transaction.orUrl.includes("image")) ? (
                                                        <Image
                                                            src={isValidUrl(transaction.orUrl) ? transaction.orUrl : "/placeholder.png"}
                                                            fill
                                                            className="object-cover opacity-80 hover:opacity-100 transition-opacity"
                                                            alt="Official Receipt"
                                                            unoptimized
                                                        />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg">
                                                                <FileText className="w-6 h-6" />
                                                            </div>
                                                            <span className="text-[10px] font-black uppercase tracking-widest italic text-emerald-600 text-center">
                                                                View Official Receipt (OR)
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="absolute top-4 right-4"><ExternalLink className="w-4 h-4 text-emerald-500" /></div>
                                                </a>
                                            ) : (
                                                <label htmlFor={isReadOnlyAide ? undefined : "main-or-upload"} className={cn(
                                                    "flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition-all h-48 bg-[#f8fafd] dark:bg-white/5 overflow-hidden relative group",
                                                    isReadOnlyAide ? "border-slate-100 dark:border-white/5 cursor-not-allowed" : (orFile || transaction.orUrl ? "border-emerald-500/30 bg-emerald-500/5 shadow-inner cursor-pointer" : "border-slate-100 dark:border-white/5 hover:border-emerald-500/30 cursor-pointer")
                                                )}>
                                                    {(orPreview || transaction.orUrl) ? (
                                                        <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center">
                                                            {((orFile && orFile.type.startsWith("image/")) || (!orFile && transaction.orUrl && (transaction.orUrl.toLowerCase().endsWith(".jpg") || transaction.orUrl.toLowerCase().endsWith(".png") || transaction.orUrl.toLowerCase().endsWith(".jpeg")))) ? (
                                                                <Image
                                                                    src={isValidUrl(orPreview || transaction.orUrl) ? (orPreview || transaction.orUrl) : "/placeholder.png"}
                                                                    fill
                                                                    className="object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                                                    alt="OR Preview"
                                                                    unoptimized
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center text-emerald-500/40 group-hover:text-emerald-500 transition-colors">
                                                                    <FileText className="w-12 h-12" />
                                                                    <span className="text-[9px] font-black uppercase italic tracking-widest mt-2">OR Document Ready</span>
                                                                </div>
                                                            )}

                                                            {!isReadOnlyAide && (
                                                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white border border-white/20">
                                                                        <Upload className="w-4 h-4" />
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase text-white tracking-widest italic">Update Receipt</span>
                                                                </div>
                                                            )}

                                                            <div className="absolute bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-5 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                                                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest italic text-slate-700 dark:text-slate-300 truncate">
                                                                        {orFile?.name || "Official-Receipt-" + transaction.id.slice(-6).toUpperCase()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className={cn(
                                                                "p-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 shadow-sm transition-all duration-500 scale-110",
                                                                !isReadOnlyAide && "group-hover:bg-emerald-500 group-hover:text-white"
                                                            )}>
                                                                <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                                            </div>
                                                            <div className="text-center space-y-1">
                                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-slate-400 dark:text-slate-500 block">
                                                                    {isReadOnlyAide ? "Official Receipt (OR)" : "Attach Official Receipt"}
                                                                </span>
                                                                <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase italic tracking-tighter">
                                                                    {isReadOnlyAide ? "Pending upload by Treasury Staff" : "PDF or Image up to 5MB"}
                                                                </span>
                                                            </div>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    {/* EXECUTIVE ACTIONS */}
                    <div className="space-y-4 pt-4">
                        {transaction.status === "CANCELLED" ? (
                            <div className="bg-white dark:bg-[#151b28] p-8 rounded-[2.5rem] border border-slate-50 dark:border-white/5 text-center space-y-4 animate-in zoom-in-95 shadow-[0_2px_40px_rgba(0,0,0,0.02)]">
                                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                                    <span className="text-2xl animate-pulse">🚫</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-red-500 tracking-widest italic">Transaction Cancelled</p>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tight italic">
                                        This transaction was cancelled by the citizen. No further actions can be taken.
                                    </p>
                                </div>
                            </div>
                        ) : isReadOnlyAide ? (
                            <div className="bg-white dark:bg-[#151b28] p-8 rounded-[2.5rem] border border-slate-50 dark:border-white/5 text-center space-y-4 animate-in zoom-in-95 shadow-[0_2px_40px_rgba(0,0,0,0.02)]">
                                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <span className="text-2xl animate-pulse">🔒</span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest italic">Read-Only Access Protocol</p>
                                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-tight italic">
                                        Hi Admin Aide! You are in <span className="text-primary font-black">Read-Only Mode</span>. Business Permits in the <span className="text-primary font-black">{transaction?.status?.replace(/_/g, " ")}</span> stage must be processed and released by <span className="text-primary font-black">Treasury Staff</span> only.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {((transaction.status === "FOR_REQUESTING" || transaction.status === "FOR_INSPECTION" || transaction.status === "FOR_REINSPECTION")) && (
                                    <div className="space-y-3">
                                        {userRole === "ENGINEER" ? (
                                            transaction.status === "FOR_REQUESTING" ? (
                                                <Dialog open={isSchedulingInspection} onOpenChange={setIsSchedulingInspection}>
                                                    <DialogTrigger asChild>
                                                        <Button disabled={actionLoading} className="w-full h-16 rounded-2xl bg-[#006A2E] text-white font-black italic uppercase tracking-widest text-xs hover:bg-[#005224] transition-all shadow-xl shadow-green-900/20 active:scale-95">
                                                            {actionLoading ? "Processing..." : "Schedule Inspection"}
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl bg-[#f8e7eb] dark:bg-slate-900 border-none rounded-[1.5rem] shadow-2xl p-0 overflow-hidden">
                                                        <DialogTitle className="sr-only">Schedule Site Inspection</DialogTitle>
                                                        <div className="bg-white dark:bg-slate-950 p-6 m-4 rounded-[1.5rem] shadow-sm border border-slate-100 dark:border-white/5 space-y-6">
                                                            {/* Header */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="space-y-1">
                                                                    <h2 className="text-xl font-bold text-[#0c4a6e] dark:text-blue-400 flex items-center gap-2">
                                                                        <AlertCircle className="w-5 h-5" />
                                                                        Pending Inspection Scheduling
                                                                    </h2>
                                                                </div>
                                                                <div className="bg-blue-50 text-blue-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                                                                    1 application pending
                                                                </div>
                                                            </div>

                                                            {/* Applicant Info */}
                                                            <div className="bg-[#f8fafd] dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between">
                                                                <div>
                                                                    <p className="font-black text-slate-800 dark:text-slate-200 text-lg uppercase tracking-wider">
                                                                        {additional?.firstName && additional?.lastName ? `${additional.firstName} ${additional.lastName}` : (transaction.residentSnapshot?.firstName ? `${transaction.residentSnapshot.firstName} ${transaction.residentSnapshot.lastName}` : 'N/A')}
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                                                                        # Ref: {id.slice(-8).toUpperCase()} | 📅 Submitted: {safeFormatDate(transaction.createdAt)}
                                                                    </p>
                                                                </div>
                                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 rounded-md font-bold uppercase text-[9px] px-3 py-1 border-none">
                                                                    Awaiting Inspection
                                                                </Badge>
                                                            </div>

                                                            {/* Form */}
                                                            <div className="space-y-4">
                                                                <h3 className="font-bold text-[#0c4a6e] dark:text-blue-400">Schedule Site Inspection</h3>

                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Inspection Type:</Label>
                                                                    <select
                                                                        className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0c4a6e] dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:focus-visible:ring-blue-500 text-slate-800"
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
                                                                        value={inspectionDate}
                                                                        onChange={(e) => setInspectionDate(e.target.value)}
                                                                        className="h-12 rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 border-none px-4 font-medium"
                                                                    />
                                                                 </div>

                                                                 <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Time <span className="text-red-500">*</span>:</Label>
                                                                    <Input
                                                                        type="time"
                                                                        value={inspectionTime}
                                                                        onChange={(e) => setInspectionTime(e.target.value)}
                                                                        className="h-12 rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 border-none px-4 font-medium"
                                                                    />
                                                                 </div>

                                                                 <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Inspector Name <span className="text-red-500">*</span>:</Label>
                                                                    <Input
                                                                        placeholder="Engr. Santos"
                                                                        value={inspectorName}
                                                                        onChange={(e) => setInspectorName(e.target.value)}
                                                                        className="h-12 rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 border-none px-4 font-medium"
                                                                    />
                                                                 </div>

                                                                <div className="space-y-2">
                                                                    <Label className="text-xs font-bold text-slate-600 dark:text-slate-300">Notes (optional):</Label>
                                                                    <Textarea
                                                                        placeholder="Please ensure all documents are available on-site..."
                                                                        value={inspectionNotes}
                                                                        onChange={(e) => setInspectionNotes(e.target.value)}
                                                                        className="min-h-[80px] rounded-xl text-slate-800 dark:text-white bg-slate-50 dark:bg-white/5 border-none p-4 font-medium"
                                                                    />
                                                                </div>

                                                                <Button
                                                                    onClick={handleScheduleInspection}
                                                                    disabled={actionLoading}
                                                                    className="h-12 bg-[#0c4a6e] hover:bg-[#082f49] text-white rounded-xl px-6 flex items-center gap-2"
                                                                >
                                                                    <AlertCircle className="w-4 h-4" />
                                                                    {actionLoading ? "Scheduling..." : "Schedule Inspection"}
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <div className="py-4 bg-white/50 dark:bg-slate-950/50 flex flex-wrap items-center justify-center gap-6 text-[10px] text-slate-500 font-medium px-6">
                                                            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Based on Mapandan Citizen&apos;s Charter • PD 1096 • RA 11032</span>
                                                            <span className="flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> RA 10173 Data Privacy Act Compliant</span>
                                                            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> LGU Mapandan, Pangasinan</span>
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <Button onClick={handleEvaluate} disabled={actionLoading} className="flex-1 h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                                                        {actionLoading ? "Processing..." : "Evaluate / Issue Record"}
                                                    </Button>
                                                    {(transaction.status === "FOR_INSPECTION" || transaction.status === "FOR_REINSPECTION") && (
                                                        <Dialog open={isReinspecting} onOpenChange={(open) => { setIsReinspecting(open); if (!open) { setReinspectReason(""); setReinspectDate(""); setReinspectTime(""); setReinspectInspector(""); setReinspectType("Structural Inspection"); } }}>
                                                            <DialogTrigger asChild>
                                                                <Button className="flex-1 h-16 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black italic uppercase tracking-widest text-xs transition-all shadow-xl shadow-blue-600/20 active:scale-95">
                                                                    For Re-Inspection
                                                                </Button>
                                                            </DialogTrigger>
                                                            <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                                                <DialogHeader className="space-y-3">
                                                                    <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                                        Mark for <span className="text-blue-600">Re-Inspection</span>
                                                                    </DialogTitle>
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Return to Field for Re-Evaluation</p>
                                                                </DialogHeader>
                                                                <div className="space-y-6 py-6">
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Re-Inspection <span className="text-red-500">*</span></Label>
                                                                        <Textarea
                                                                            placeholder="State reason for re-inspection..."
                                                                            value={reinspectReason}
                                                                            onChange={(e) => setReinspectReason(e.target.value)}
                                                                            className="min-h-[80px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold italic p-6 text-sm"
                                                                            required
                                                                        />
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Inspection Type <span className="text-red-500">*</span></Label>
                                                                        <select
                                                                            className="flex h-12 w-full rounded-2xl border-none bg-slate-50 px-4 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:bg-white/5 dark:focus-visible:ring-blue-500 text-slate-800 dark:text-white"
                                                                            value={reinspectType}
                                                                            onChange={(e) => setReinspectType(e.target.value)}
                                                                        >
                                                                            <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Structural Inspection">Structural Inspection</option>
                                                                            <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Electrical Inspection">Electrical Inspection</option>
                                                                            <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Sanitary/Plumbing Inspection">Sanitary/Plumbing Inspection</option>
                                                                            <option className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white" value="Complete Site Inspection">Complete Site Inspection</option>
                                                                        </select>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 gap-4">
                                                                        <div className="space-y-3">
                                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Date <span className="text-red-500">*</span></Label>
                                                                            <Input
                                                                                type="date"
                                                                                value={reinspectDate}
                                                                                onChange={(e) => setReinspectDate(e.target.value)}
                                                                                className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4"
                                                                            />
                                                                        </div>
                                                                        <div className="space-y-3">
                                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Time <span className="text-red-500">*</span></Label>
                                                                            <Input
                                                                                type="time"
                                                                                value={reinspectTime}
                                                                                onChange={(e) => setReinspectTime(e.target.value)}
                                                                                className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Assigned Inspector <span className="text-red-500">*</span></Label>
                                                                        <Input
                                                                            placeholder="Engr. Santos"
                                                                            value={reinspectInspector}
                                                                            onChange={(e) => setReinspectInspector(e.target.value)}
                                                                            className="h-12 rounded-2xl border-none bg-slate-50 dark:bg-white/5 text-slate-800 dark:text-white font-bold px-4"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <Button onClick={handleReinspect} disabled={actionLoading || !reinspectReason.trim() || !reinspectDate || !reinspectTime || !reinspectInspector} className="w-full h-14 bg-blue-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-all hover:bg-blue-700">
                                                                    {actionLoading ? "Processing..." : "Confirm Re-Inspection"}
                                                                </Button>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            <Button onClick={handleEvaluate} disabled={actionLoading} className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20">
                                                {actionLoading ? "Processing..." : "Evaluate / Issue Record"}
                                            </Button>
                                        )}
                                        <div className="flex gap-2 w-full">
                                            <Dialog open={isRequestingRevision} onOpenChange={(open) => { setIsRequestingRevision(open); if (!open) setRemarks(""); }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                                        className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg shadow-amber-500/20 transition-all active:scale-95"
                                                    >
                                                        Request Revision
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                                    <DialogHeader className="space-y-3">
                                                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                            Request <span className="text-amber-500">Revision</span>
                                                        </DialogTitle>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Return to Citizen for Corrections</p>
                                                    </DialogHeader>
                                                    <div className="space-y-6 py-6">
                                                        <div className="space-y-3">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Missing Documents / Corrections Needed <span className="text-red-500">*</span></Label>
                                                            <Textarea
                                                                ref={remarksRef}
                                                                placeholder="State missing documents or corrections needed..."
                                                                value={remarks}
                                                                onChange={(e) => setRemarks(e.target.value)}
                                                                className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic p-6 text-sm"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button onClick={() => { if (!remarks.trim()) { toast.error("Reason is required"); return; } handleRequestRevision(); }} disabled={actionLoading || !remarks.trim()} className="w-full h-14 bg-amber-500 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-amber-500/20 active:scale-95 transition-all hover:bg-amber-600">
                                                        {actionLoading ? "Processing..." : "Confirm Revision Request"}
                                                    </Button>
                                                </DialogContent>
                                            </Dialog>

                                            <Dialog open={isRejecting} onOpenChange={(open) => { setIsRejecting(open); if (!open) setRemarks(""); }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                                        className="flex-1 h-12 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                                    >
                                                        Decline
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                                    <DialogHeader className="space-y-3">
                                                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                            Decline <span className="text-red-600">Request</span>
                                                        </DialogTitle>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Rejection Protocol</p>
                                                    </DialogHeader>
                                                    <div className="space-y-6 py-6">
                                                        <div className="space-y-3">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Decline <span className="text-red-500">*</span></Label>
                                                            <Textarea
                                                                ref={remarksRef}
                                                                placeholder="Reason for decline..."
                                                                value={remarks}
                                                                onChange={(e) => setRemarks(e.target.value)}
                                                                className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic p-6 text-sm"
                                                                required
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button onClick={() => { if (!remarks.trim()) { toast.error("Reason is required"); return; } handleReject(); }} disabled={actionLoading || !remarks.trim()} className="w-full h-14 bg-red-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all hover:bg-red-700">
                                                        {actionLoading ? "Processing..." : "Confirm Decline"}
                                                    </Button>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                )}
                                {/* 1. EVALUATION PHASE: Strictly Read-Only (Resident is choosing fulfillment/paying) */}
                                {transaction.status === "EVALUATED" && (
                                    <div className="bg-blue-50 dark:bg-blue-500/5 p-8 rounded-[2.5rem] border-2 border-blue-100 dark:border-blue-500/20 text-center space-y-4 animate-in zoom-in-95">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                                            <span className="text-2xl animate-pulse">⏳</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-500 italic">Financial Protocol Active</p>
                                            <p className="text-[11px] font-bold text-blue-900/60 dark:text-blue-400/60 leading-relaxed uppercase tracking-tight">Read-Only Mode: Waiting for Citizen to finalize fulfillment & upload payment proof.</p>
                                        </div>
                                    </div>
                                )}

                                {/* 1.5 REVISION PHASE: Awaiting Citizen Action */}
                                {transaction.status === "FOR_REVISION" && (
                                    <div className="bg-amber-50 dark:bg-amber-500/5 p-8 rounded-[2.5rem] border-2 border-amber-100 dark:border-amber-500/20 text-center space-y-4 animate-in zoom-in-95">
                                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                                            <span className="text-2xl animate-pulse">⚠️</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 italic">Awaiting Citizen Revision</p>
                                            <p className="text-[11px] font-bold text-amber-900/60 dark:text-amber-400/60 leading-relaxed uppercase tracking-tight">Read-Only Mode: Transaction sent back to citizen for correction.</p>
                                        </div>
                                    </div>
                                )}

                                {/* 2. VERIFICATION & RELEASE PHASE: Active Actions enabled here */}
                                {["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING"].includes(transaction.status) && (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-4">
                                        {/* Financial Verification: Show if Online Payment AND not yet confirmed. Bypassed for E-COPY and PICK_UP E-PAYMENT Fast-track */}
                                        {(transaction.paymentType === "E_PAYMENT" || transaction.paymentType === "BANK_TRANSFER") &&
                                            transaction.fulfillmentType !== "E_COPY" &&
                                            !(transaction.fulfillmentType === "PICK_UP" && (transaction.paymentType === "E_PAYMENT" || transaction.paymentType === "BANK_TRANSFER")) &&
                                            !(transaction.status === "PAID" && transaction.fulfillmentType === "DELIVERY") &&
                                            transaction.status !== "FOR_PICKING" && (
                                                <div className="space-y-3 p-1 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                                                    <Button
                                                        onClick={handleConfirmPayment}
                                                        disabled={actionLoading}
                                                        className="w-full h-14 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                                                    >
                                                        {actionLoading ? "Processing Verification..." : "Verify Financial Record"}
                                                    </Button>
                                                </div>
                                            )}

                                        {/* Gated CTC Entry: Locked for processed digital/delivery flows or if already recorded (e.g. after a Return) */}
                                        {((transaction.status === "FOR_CLAIM" || transaction.status === "FOR_PICKING" || transaction.cedula?.ctcNumber || transaction.businessPermit?.permitNumber)) ? (
                                            <div className="bg-emerald-50 dark:bg-emerald-500/5 p-6 rounded-3xl border-2 border-emerald-100 dark:border-emerald-500/20 text-center space-y-2 animate-in zoom-in-95">
                                                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                                                    <BadgeCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 italic">
                                                    {transaction.status === "FOR_PICKING" ? "Ready for Dispatch" : "Document Prepared"}
                                                </p>
                                                <p className="text-[11px] font-bold text-emerald-900/60 dark:text-emerald-500/60 tracking-tight italic leading-relaxed">
                                                    Registry Serial <span className="font-mono text-emerald-600 dark:text-emerald-400">#{transaction.cedula?.ctcNumber || transaction.businessPermit?.permitNumber || "RECORDED"}</span> is locked and ready for release.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-in zoom-in-95">
                                                {/* Digital Copy Warning (Conditional) */}
                                                {(
                                                    transaction.status === "FOR_PROCESSING" ||
                                                    (transaction.status === "PAID" && (
                                                        transaction.fulfillmentType === "E_COPY" ||
                                                        (transaction.fulfillmentType === "DELIVERY" && ["E_PAYMENT", "BANK_TRANSFER"].includes(transaction.paymentType))
                                                    ))
                                                ) && (
                                                        isBusinessPermit
                                                            ? ((!eCopyFile && !transaction.eCopyUrl) || (!orFile && !transaction.orUrl))
                                                            : (!eCopyFile && !transaction.eCopyUrl)
                                                    ) && (
                                                        <div className="p-6 rounded-3xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-center space-y-2">
                                                            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/10 rounded-full flex items-center justify-center mx-auto">
                                                                <Upload className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                                            </div>
                                                            <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 italic">
                                                                {isBusinessPermit ? "E-Copy & OR Required" : "Digital Copy Required"}
                                                            </p>
                                                            <p className="text-[11px] font-bold text-amber-900/60 dark:text-amber-500/60 leading-relaxed">
                                                                {isBusinessPermit
                                                                    ? "Please attach both the Digital Permit and the Official Receipt (OR) to enable document processing."
                                                                    : "Please attach the Digital Record to enable document processing."}
                                                            </p>
                                                        </div>
                                                    )}

                                                {/* Always show CTC Input for these phases (Hidden for Business Permits unless it is a new business permit) */}
                                                {(!isBusinessPermit || transaction.type.code === "BUSINESS_PERMIT_NEW") && (
                                                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border-2 border-primary/20 space-y-3">
                                                        <Label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 italic">
                                                            {isBusinessPermit ? "License Business Permit No." : "Registry Serial Entry (CTC No.)"}
                                                        </Label>
                                                        <Input
                                                            value={ctcNumber}
                                                            onChange={(e) => setCtcNumber(e.target.value)}
                                                            placeholder={isBusinessPermit ? "ENTER BUSINESS PERMIT NO..." : "ENTER CTC NUMBER..."}
                                                            className="h-12 rounded-xl border-slate-100 dark:border-white/5 italic font-black text-sm tracking-[0.2em] focus:ring-primary/10 dark:bg-slate-900 dark:text-white uppercase"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-3 pt-2">
                                            {/* WAYBILL GENERATION: Required for Delivery Dispatch */}
                                            {transaction.fulfillmentType === "DELIVERY" && (transaction.status === "FOR_PROCESSING" || transaction.status === "PAID" || transaction.status === "FOR_PICKING") && (
                                                <Button
                                                    onClick={handlePrintWaybill}
                                                    variant="outline"
                                                    className="w-full h-14 rounded-2xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all mb-2"
                                                >
                                                    Generate & Print Waybill
                                                </Button>
                                            )}

                                            {transaction.status !== "FOR_PICKING" && (
                                                <>
                                                    <Button
                                                        onClick={handleRelease}
                                                        disabled={
                                                            actionLoading ||
                                                            // Requirement: CTC needed for initial processing (only for non-Business Permits)
                                                            (!isBusinessPermit && !["FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(transaction.status) && !ctcNumber && !transaction.cedula?.ctcNumber) ||
                                                            // Requirement: E-Copy needed for FOR_PROCESSING (including Cash Pickups) and specific digital/delivery PAID flows
                                                            ((transaction.status === "FOR_PROCESSING" || (transaction.status === "PAID" && (transaction.fulfillmentType === "E_COPY" || transaction.fulfillmentType === "DELIVERY"))) && !eCopyFile && !transaction.eCopyUrl) ||
                                                            // Requirement: OR copy also needed for Business Permits in initial processing phases
                                                            (isBusinessPermit && (transaction.status === "FOR_PROCESSING" || (transaction.status === "PAID" && (transaction.fulfillmentType === "E_COPY" || transaction.fulfillmentType === "DELIVERY"))) && !orFile && !transaction.orUrl)
                                                        }
                                                        className="w-full h-16 rounded-2xl bg-primary text-white font-black italic uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
                                                    >
                                                        {actionLoading ? "Processing..." : (transaction.status === "FOR_PROCESSING" || transaction.status === "PAID") ? (transaction.fulfillmentType === "DELIVERY" ? "Ready for Picking" : "Mark Ready for Claiming") : "Confirm & Release Document"}
                                                    </Button>

                                                    <Button
                                                        onClick={() => setIsRejecting(true)}
                                                        className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 transition-all active:scale-95"
                                                    >
                                                        Decline Registry Process
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* DISPUTE RESOLUTION ACTIONS */}
                                {(transaction.status === "RETURN_REQUESTED" || transaction.status === "REFUND_REQUESTED") && (
                                    <div className="space-y-3 animate-in slide-in-from-bottom-4">
                                        <div className="p-6 rounded-3xl bg-orange-500/10 border border-orange-500/20 text-center space-y-1 mb-4">
                                            <p className="text-[10px] font-black uppercase text-orange-600 dark:text-orange-500 italic">Review Action Required</p>
                                            <p className="text-[11px] font-bold text-orange-900/60 dark:text-orange-400/60 leading-relaxed uppercase tracking-tight italic">
                                                Assess the citizen&apos;s claim before resolving the dispute.
                                            </p>
                                        </div>

                                        {transaction.status === "RETURN_REQUESTED" && (
                                            <Button
                                                onClick={handlePrintWaybill}
                                                variant="outline"
                                                className="w-full h-14 rounded-2xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all mb-2"
                                            >
                                                Generate & Print Waybill
                                            </Button>
                                        )}

                                        <div className="grid grid-cols-2 gap-3">
                                            <Dialog open={disputeModalOpen && disputeAction === 'APPROVE'} onOpenChange={(open) => { setDisputeModalOpen(open); setDisputeAction('APPROVE'); setRemarks(''); }}>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        style={{ backgroundColor: themeColor }}
                                                        className="h-14 rounded-2xl text-white font-black italic uppercase tracking-widest text-[10px] shadow-lg transition-all active:scale-95 hover:opacity-90"
                                                    >
                                                        <Check className="w-4 h-4 mr-2" /> Approve Request
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                                    <DialogHeader className="space-y-3">
                                                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                            Approve <span style={{ color: themeColor }}>Resolution</span>
                                                        </DialogTitle>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Final Decision Registry</p>
                                                    </DialogHeader>
                                                    <div className="space-y-6 py-6">
                                                        <div className="space-y-3">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Resolution Remarks</Label>
                                                            <Textarea
                                                                placeholder="Reason for approval (e.g., Confirmed damage, Refund processed...)"
                                                                value={remarks}
                                                                onChange={(e) => setRemarks(e.target.value)}
                                                                className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic p-6 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button
                                                        onClick={handleResolveDispute}
                                                        disabled={isResolvingDispute}
                                                        style={{ backgroundColor: themeColor }}
                                                        className="w-full h-14 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl active:scale-95 transition-all hover:opacity-90"
                                                    >
                                                        {isResolvingDispute ? "Processing..." : "Confirm & Resolve Dispute"}
                                                    </Button>
                                                </DialogContent>
                                            </Dialog>

                                            <Dialog open={disputeModalOpen && disputeAction === 'REJECT'} onOpenChange={(open) => { setDisputeModalOpen(open); setDisputeAction('REJECT'); setRemarks(''); }}>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" className="h-14 rounded-2xl border-2 border-red-500/20 text-red-500 font-black italic uppercase tracking-widest text-[10px] hover:bg-red-500/5 transition-all active:scale-95">
                                                        <Ban className="w-4 h-4 mr-2" /> Decline Claim
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-md bg-white dark:bg-slate-950 border-none rounded-[2.5rem] shadow-2xl p-10">
                                                    <DialogHeader className="space-y-3">
                                                        <DialogTitle className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                            Decline <span className="text-red-500">Claim</span>
                                                        </DialogTitle>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Official Rejection Protocol</p>
                                                    </DialogHeader>
                                                    <div className="space-y-6 py-6">
                                                        <div className="space-y-3">
                                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reason for Rejection</Label>
                                                            <Textarea
                                                                placeholder="Why is this claim being declined? (e.g., Invalid evidence, No issues found...)"
                                                                value={remarks}
                                                                onChange={(e) => setRemarks(e.target.value)}
                                                                className="min-h-[120px] rounded-2xl border-none bg-slate-50 dark:bg-white/5 font-bold italic p-6 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <Button onClick={handleResolveDispute} disabled={isResolvingDispute} className="w-full h-14 bg-red-600 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all">
                                                        {isResolvingDispute ? "Processing..." : "Confirm Rejection"}
                                                    </Button>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </div>
                                )}

                                {transaction.status === "RELEASED" && (
                                    <div className="bg-primary p-8 rounded-[2.5rem] text-white text-center space-y-4 shadow-2xl shadow-primary/40 animate-in zoom-in-95">
                                        <BadgeCheck className="w-12 h-12 mx-auto" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase italic opacity-60">Success Registry Locked</p>
                                            <p className="text-3xl font-black italic font-mono tracking-tighter">
                                                {isBusinessPermit ? transaction.businessPermit?.permitNumber : transaction.cedula?.ctcNumber}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* HIGH-FIDELITY MUNICIPAL WAYBILL (PRINT ONLY) */}
            {/* CRITICAL: Print stylesheet MUST be OUTSIDE the hidden container */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    @page { size: 100mm 150mm; margin: 0; }
                    body * { visibility: hidden !important; }
                    .waybill-print-zone, .waybill-print-zone * { visibility: visible !important; }
                    .waybill-print-zone { 
                        position: fixed !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 100% !important; 
                        height: 100% !important; 
                        padding: 5mm !important;
                        z-index: 99999 !important;
                        background: white !important;
                    }
                }
            `}} />
            <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-0 m-0 overflow-visible text-black font-sans leading-tight">
                <div className="waybill-print-zone flex flex-col h-full border-[3px] border-black rounded-sm">
                    {/* Header: Dynamic Branding */}
                    <div className="border-b-[3px] border-black p-3 flex items-center justify-between bg-black text-white">
                        <div className="flex items-center gap-3">
                            {branding.logo ? (
                                <Image src={isValidUrl(branding.logo) ? branding.logo : "/placeholder.png"} alt="Logo" width={40} height={40} className="object-contain" unoptimized />
                            ) : (
                                <div className="w-8 h-8 border-2 border-white rounded-full flex items-center justify-center font-black text-[10px]">A</div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-[14px] font-black italic tracking-tighter uppercase leading-none text-white">
                                    {branding.word1} <span style={{ color: themeColor }} className="italic tracking-normal">{branding.word2}</span>
                                </span>
                                <span className="text-[6px] font-bold uppercase tracking-widest opacity-80 italic">Official Municipal Logistics</span>
                            </div>
                        </div>
                        <div className="text-[10px] font-black uppercase italic tracking-widest border border-white px-2 py-1">Waybill</div>
                    </div>

                    {/* QR Code Segment */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4 border-b-[2px] border-black border-dashed">
                        <div className="relative w-40 h-40 bg-white p-2 border border-slate-100 shadow-sm flex items-center justify-center">
                            {/* Standard img tag used for reliable print rendering */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${transaction.id}`}
                                alt="Tracking QR"
                                className="w-full h-full p-2"
                            />
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-[12px] font-black italic tracking-[0.3em] font-mono leading-none">{transaction.id.slice(-12).toUpperCase()}</span>
                            <span className="text-[6px] font-bold uppercase text-slate-500 mt-1">Transaction Tracking Reference</span>
                        </div>
                    </div>

                    {/* Logistics Data Segment */}
                    <div className="p-4 grid grid-cols-2 gap-4 border-b-[3px] border-black">
                        <div className="space-y-3">
                            <div className="flex flex-col">
                                <span className="text-[6px] font-bold uppercase text-slate-500">Recipient Name</span>
                                <span className="text-[11px] font-black uppercase italic leading-tight">{resident.firstName} {resident.lastName}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[6px] font-bold uppercase text-slate-500">Contact Number</span>
                                <span className="text-[10px] font-bold italic tracking-widest">
                                    {deliveryAddr?.contactNumber || resident.contactNumber || "--"}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[6px] font-bold uppercase text-slate-500">Delivery Address</span>
                            <span className="text-[9px] font-bold uppercase leading-tight italic">
                                {deliveryAddr ? (
                                    <>
                                        {deliveryAddr.houseNumber && `${deliveryAddr.houseNumber}, `}
                                        {deliveryAddr.street && `${deliveryAddr.street} `}
                                        {deliveryAddr.sitio && `Sitio ${deliveryAddr.sitio}, `}
                                        {deliveryAddr.purok && `Purok ${deliveryAddr.purok}, `}
                                        <br />
                                        Barangay {deliveryAddr.barangay},<br />
                                        {deliveryAddr.municipality}, {deliveryAddr.province}
                                    </>
                                ) : (
                                    <>
                                        {resident.houseNumber && `${resident.houseNumber}, `}{resident.street}<br />
                                        Barangay {resident.barangay},<br />
                                        {resident.municipality}, {resident.province}
                                    </>
                                )}
                            </span>
                            {(deliveryAddr?.landmark || transaction.deliveryLandmark) && (
                                <div className="mt-1 p-1 bg-black/5 rounded-sm">
                                    <span className="text-[5px] font-bold uppercase text-slate-400 block leading-none">Landmark</span>
                                    <span className="text-[7px] font-black italic uppercase leading-none">
                                        {deliveryAddr?.landmark || transaction.deliveryLandmark}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Service & Payment Metadata */}
                    <div className="p-3 bg-slate-50 grid grid-cols-3 gap-2 border-b-[3px] border-black">
                        <div className="flex flex-col">
                            <span className="text-[5px] font-bold uppercase">Payment Type</span>
                            <span className="text-[7px] font-black uppercase italic tracking-tighter">{transaction.paymentType?.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[5px] font-bold uppercase">Service</span>
                            <span className="text-[7px] font-black uppercase italic tracking-tighter">{transaction.type.name}</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="text-[5px] font-bold uppercase">Amount Due</span>
                            <span className="text-[9px] font-black italic tracking-tighter text-primary">₱{(fiscal?.totalAmount || transaction.totalAmount || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Instructions & Footnote */}
                    <div className="flex-1 p-3 flex flex-col justify-end italic">
                        <div className="border-t-[2px] border-black border-dotted pt-2">
                            <p className="text-[7px] font-bold uppercase leading-relaxed text-slate-600">
                                * Official document for municipal logistics use only. Handle with extreme care.
                                If document is damaged, please report immediately to the Treasury Office.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
