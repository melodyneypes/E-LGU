/* eslint-disable @typescript-eslint/no-unused-vars */
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
    Plus,
    Coins
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
    // scheduleBuildingInspection,
    addAdditionalBuildingPermitFee,
    removeAdditionalBuildingPermitFee,
    approveAndSendBuildingPermitBilling,
    declinePaymentProofAction
} from "@/app/admin/transactions/actions";
import {
    treasuryReleaseBusinessPermit,
    confirmBusinessPermitPayment
} from "@/app/admin/transactions/business-permit-actions";
import {
    confirmTransactionPayment,
    confirmTransactionPaymentWithReceipt,
    releaseCedula
} from "@/app/admin/transactions/cedula-actions";
import { releaseBirthRegistry } from "@/app/admin/transactions/birth-regis-actions";
import { releaseBirthCertificate } from "@/app/admin/transactions/birth-cert-actions";
import { releaseDeathRegistry } from "@/app/admin/transactions/death-regis-actions";
import { releaseDeathCertificate, evaluateDeathCertificateTransaction } from "@/app/admin/transactions/death-cert-actions";
import { releaseMarriageLicense, evaluateMarriageLicenseTransaction } from "@/app/admin/transactions/marriage-license-actions";
import { evaluateStudentCedulaTransaction } from "@/app/admin/transactions/student-actions";
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
import DocumentViewerModal from "./components/DocumentViewerModal";

const checkIsPdf = (url: string | null) => {
    if (!url) return false;
    return url.toLowerCase().endsWith(".pdf") || url.includes("application/pdf") || url.includes(".pdf?");
};

import BusinessPermitView from "./views/BusinessPermitView";
import BuildingPermitView from "./views/BuildingPermitView";
import BirthRegistrationView from "./views/BirthRegistrationView";
import BirthCertificateView from "./views/BirthCertificateView";
import DeathRegistrationView from "./views/DeathRegistrationView";
import DeathCertificateView from "./views/DeathCertificateView";
import MarriageLicenseView from "./views/MarriageLicenseView";
import GenericServiceView from "./views/GenericServiceView";
import BirthPsaEndorsementView from "./views/BirthPsaEndorsement";
import MarraigeCertificateView from "./views/MarraigeCertificateView";

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

export default function TreasuryDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();
    const { data: session } = useSession();
    const rawUserRole = (session?.user as any)?.role;
    const userDepartment = (session?.user as any)?.department;
    // Map BPLO Admin to behave exactly like ADMIN_AIDE for Treasury pages
    const isBPLOAdmin = rawUserRole === "ADMIN" && userDepartment?.toUpperCase() === "BPLO";
    const userRole = isBPLOAdmin ? "ADMIN_AIDE" : rawUserRole;
    // Treasury Staff can only upload OR; Permit No., Sticker No., and Waybill are BPLO Admin only
    const isTreasuryStaff = rawUserRole === "TREASURY_STAFF";
    const [transaction, setTransaction] = useState<any>(null);
    const typeCodeForBack = (transaction?.type?.code || "").toUpperCase();
    const isLcrTx = typeCodeForBack.startsWith("LCR_") || typeCodeForBack.startsWith("CIVIL_REGISTRY") || (transaction?.type?.name && (transaction.type.name.includes("Certificate") || transaction.type.name.includes("Registration")));
    const backUrl = isLcrTx
        ? "/admin/treasury?category=Civil%20Registry"
        : "/admin/treasury";
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [remarks, setRemarks] = useState("");
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const remarksRef = useRef<HTMLTextAreaElement>(null);
    const [ctcNumber, setCtcNumber] = useState("");
    const [showPaymentHistoryOverride, setShowPaymentHistoryOverride] = useState(false);
    const [stickerNumber, setStickerNumber] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [eCopyFile, setECopyFile] = useState<File | null>(null);
    const [eCopyPreview, setECopyPreview] = useState<string | null>(null);
    const [orFile, setOrFile] = useState<File | null>(null);
    const [orPreview, setOrPreview] = useState<string | null>(null);
    const [themeColor, setThemeColor] = useState<string>("#2563eb");
    const [registryBookVerification, setRegistryBookVerification] = useState<string>("");
    const [birthRegDocFile, setBirthRegDocFile] = useState<File | null>(null);
    const [birthRegDocPreview, setBirthRegDocPreview] = useState<string | null>(null);
    const [orSeriesNumber, setOrSeriesNumber] = useState<string>("");
    const [miscFee, setMiscFee] = useState<string>("0");

    useEffect(() => {
        if (!birthRegDocFile) {
            setBirthRegDocPreview(null);
            return;
        }
        const url = URL.createObjectURL(birthRegDocFile);
        setBirthRegDocPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [birthRegDocFile]);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [viewerDocs, setViewerDocs] = useState<{ url?: string | null; label: string }[]>([]);
    const [viewerIndex, setViewerIndex] = useState(0);

    const handleViewFile = (url: string | null, title: string, docs?: { url?: string | null; label: string }[], index?: number) => {
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerDocs(docs || []);
        setViewerIndex(index || 0);
        setViewerOpen(true);
    };
    const [branding, setBranding] = useState({
        word1: "Mapandan",
        word2: "Express",
        logo: ""
    });
    const [additionalFeeLabel, setAdditionalFeeLabel] = useState("");
    const [additionalFeeAmount, setAdditionalFeeAmount] = useState("");
    const [showAdditionalFeeForm, setShowAdditionalFeeForm] = useState(false);

    const handleAddAdditionalFee = async () => {
        if (!additionalFeeLabel.trim()) {
            toast.error("Please specify a fee type / description.");
            return;
        }
        if (!additionalFeeAmount || Number(additionalFeeAmount) <= 0) {
            toast.error("Please specify a valid fee amount.");
            return;
        }

        setActionLoading(true);
        try {
            const res = await addAdditionalBuildingPermitFee(id, {
                label: additionalFeeLabel.trim(),
                amount: Number(additionalFeeAmount)
            });

            if (res.success) {
                toast.success("Additional fee added successfully!");
                setAdditionalFeeLabel("");
                setAdditionalFeeAmount("");
                setShowAdditionalFeeForm(false);
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to add additional fee");
            }
        } catch {
            toast.error("An error occurred while adding fee");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRemoveAdditionalFee = async (index: number) => {
        setActionLoading(true);
        try {
            const res = await removeAdditionalBuildingPermitFee(id, index);
            if (res.success) {
                toast.success("Additional fee removed successfully!");
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to remove fee");
            }
        } catch {
            toast.error("An error occurred while removing fee");
        } finally {
            setActionLoading(false);
        }
    };
    const handleApproveBilling = async () => {
        setActionLoading(true);
        try {
            const res = await approveAndSendBuildingPermitBilling(id);
            if (res.success) {
                toast.success("Billing approved and sent to citizen successfully!");
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to approve billing");
            }
        } catch {
            toast.error("An error occurred while approving billing");
        } finally {
            setActionLoading(false);
        }
    };
    const [_showAdditionalDebug, _setShowAdditionalDebug] = useState(false);
    const [isResolvingDispute, setIsResolvingDispute] = useState(false);
    const [disputeModalOpen, setDisputeModalOpen] = useState(false);
    const [disputeAction, setDisputeAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
    const [showPreviousPhases, setShowPreviousPhases] = useState(false);

    /*
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
    */

    const [feeLineItems, setFeeLineItems] = useState<{ label: string; amount: string; readonly?: boolean }[]>([]);

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
    const isBusinessPermitRenewal = isBusinessPermit && (
        transaction?.type?.code === "BUSINESS_PERMIT_RENEW" ||
        (transaction?.additionalData as any)?.businessType === "RENEWAL" ||
        (transaction?.additionalData as any)?.businessType === "RENEW"
    );
    const isBuildingPermit = transaction?.type?.code?.startsWith("BUILDING_PERMIT") ?? false;
    const isLCR = (transaction?.type?.code?.startsWith("LCR_") ?? false) || (transaction?.type?.code?.startsWith("CIVIL_REGISTRY") ?? false);
    const isCedula = transaction?.type?.code?.includes("CEDULA") ?? false;
    const typeCode = (transaction?.type?.code || "").toUpperCase();
    const isLcrCertifiedCopy = typeCode === "LCR_BIRTH" || typeCode === "LCR_DEATH" || typeCode === "LCR_MARRIAGE" || typeCode === "LCR_PSA_ENDORSEMENT" || (transaction?.type?.name && (transaction.type.name.includes("Birth Certificate") || transaction.type.name.includes("Death Certificate") || transaction.type.name.includes("Marriage Certificate"))) || false;
    const isLcrBirthCertifiedCopy = typeCode === "LCR_BIRTH" || (transaction?.type?.name && transaction.type.name.includes("Birth Certificate")) || false;
    const _isBirth = typeCode.includes("BIRTH");
    const isDeath = typeCode.includes("DEATH");
    const isMarriage = typeCode.includes("MARRIAGE") || typeCode.includes("LICENSE");
    const safeFormatDate = (dateStr: any) => {
        if (!dateStr) return "N/A";
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return "N/A";
        return format(d, "MMM d, yyyy");
    };
    // RETURN_REQUESTED and REFUND_REQUESTED are also excluded so BPLO Admin can action disputes on Business Permits
    const isReadOnlyAide = userRole === "ADMIN_AIDE" && isBusinessPermit && !["FOR_INSPECTION", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING", "RETURN_REQUESTED", "REFUND_REQUESTED"].includes(transaction?.status || "");

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                const tx = res.data;
                setTransaction(tx);
                if (tx) {
                    const fiscalSnapshot = tx.fiscalSnapshot as any;
                    const addData = tx.additionalData || {};
                    const isLate = (addData.registrationType || "").toUpperCase() === "LATE";
                    const typeCode = (tx.type?.code || "").toUpperCase();
                    const defaultLcrMisc = typeCode === "LCR_BIRTH" ? String(tx.type?.baseFee || tx.totalAmount || "115") : "0";
                    const initialMisc = fiscalSnapshot?.miscFee !== undefined
                        ? String(fiscalSnapshot.miscFee)
                        : (addData.miscFee !== undefined ? String(addData.miscFee) : (isLate ? "300" : defaultLcrMisc));
                    setMiscFee(initialMisc);
                }

                if (tx.additionalData?.orSeriesNumber) {
                    setOrSeriesNumber(tx.additionalData.orSeriesNumber);
                }

                // Pre-populate feeLineItems for building permit if assessed by engineer
                if (tx && tx.type?.code?.startsWith("BUILDING_PERMIT")) {
                    const assessed = tx.additionalData?.feeAssessment;
                    if (assessed && assessed.endorsed) {
                        setFeeLineItems([
                            { label: "Building Permit Fee", amount: String(assessed.buildingPermitFee || 0) },
                            { label: "Electrical Permit Fee", amount: String(assessed.electricalPermitFee || 0) },
                            { label: "Sanitary Permit Fee", amount: String(assessed.sanitaryPermitFee || 0) },
                            { label: "Other Applicable Municipal Charges", amount: String(assessed.municipalCharges || 0) }
                        ]);
                    }
                } else if (tx) {
                    const fiscal = tx.fiscalSnapshot as any;
                    const isLcrTx = (tx.type?.code?.startsWith("LCR_") ?? false) || (tx.type?.code?.startsWith("CIVIL_REGISTRY") ?? false);
                    const isLcrRequesting = isLcrTx && tx.status === "FOR_REQUESTING";

                    if (fiscal && Array.isArray(fiscal.lineItems) && fiscal.lineItems.length > 0) {
                        const mappedFees = fiscal.lineItems.map((item: any) => ({
                            label: item.label,
                            amount: String(item.amount),
                            readonly: isLcrRequesting
                        }));
                        // For LCR FOR_REQUESTING, add one blank editable row for new additional fees
                        if (isLcrRequesting) {
                            mappedFees.push({ label: "", amount: "", readonly: false });
                        }
                        setFeeLineItems(mappedFees);
                    } else {
                        if (tx.isStudent) {
                            setFeeLineItems([{ label: "", amount: "0" }]);
                        } else {
                            const defaultFees = tx.type?.defaultFees;
                            if (Array.isArray(defaultFees) && defaultFees.length > 0 && (!tx.fiscalSnapshot || Object.keys(tx.fiscalSnapshot).length === 0)) {
                                const mappedFees = defaultFees.map((fee: any) => ({
                                    label: fee.label,
                                    amount: "",
                                    readonly: isLcrRequesting
                                }));
                                // For LCR FOR_REQUESTING, also append a blank editable row
                                if (isLcrRequesting) {
                                    mappedFees.push({ label: "", amount: "", readonly: false });
                                }
                                setFeeLineItems(mappedFees);
                            } else {
                                // If LCR FOR_REQUESTING, ensure at least one blank editable row
                                setFeeLineItems(isLcrRequesting ? [{ label: "", amount: "", readonly: false }] : []);
                            }
                        }
                    }
                }

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
        if (!session) return;
        const role = (session?.user as any)?.role;
        const dept = (session?.user as any)?.department;
        if (role === "ADMIN" && dept?.toUpperCase() === "BPLO") {
            router.push(`/admin/bplo/${id}`);
        }
    }, [session, id, router]);

    useEffect(() => {
        if (!transaction || !session) return;
        const isBp = transaction?.type?.code?.startsWith("BUSINESS_PERMIT") ?? false;
        if (isBp && isTreasuryStaff && transaction.status === "FOR_REINSPECTION") {
            toast.error("Access Forbidden: Treasury Staff cannot access this status");
            router.push("/admin/treasury?category=Business%20Permit");
        }
    }, [transaction, session, isTreasuryStaff, router]);

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
                setIsRejecting(false);
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
                setIsRequestingRevision(false);
                router.push(backUrl);
            }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    };

    const handleRelease = useCallback(async () => {

        // CTC or Permit Number required for all initial processing phases (Only for non-Business Permits)
        const ctcRequired = !isBusinessPermit && !isLcrBirthCertifiedCopy && !["PAID", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(transaction?.status);
        if (ctcRequired && !ctcNumber && !transaction?.cedula?.ctcNumber) {
            toast.error("CTC Number Required");
            return;
        }
        // Require E-Copy for LCR releases
        if (isLCR && !eCopyFile && !transaction.eCopyUrl) {
            toast.error("Official Digital E-Copy registry record is required before releasing.");
            return;
        }

        setActionLoading(true);
        try {
            // Strict Validation for Business Permit: OR attachment is also required!
            const isInitialRelease = transaction?.status === "FOR_PROCESSING" ||
                (transaction?.status === "PAID" && (transaction?.fulfillmentType === "E_COPY" || transaction?.fulfillmentType === "DELIVERY"));
            if (isBusinessPermit && isInitialRelease && !orFile && !transaction.orUrl) {
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
                else { toast.error(uploadRes.error || "E-Copy upload failed"); setActionLoading(false); return; }
            }

            let orUrl = "";
            if (orFile) {
                const formData = new FormData();
                formData.append("file", orFile);
                const uploadRes = await uploadECopyAction(formData);
                if (uploadRes.success) orUrl = uploadRes.data as string;
                else { toast.error(uploadRes.error || "Official Receipt upload failed"); setActionLoading(false); return; }
            }

            const res = isBusinessPermit
                ? await treasuryReleaseBusinessPermit(transaction.id, orUrl)
                : typeCode === "LCR_BIRTH"
                    ? await releaseBirthCertificate(transaction.id, ctcNumber || transaction?.cedula?.ctcNumber || "", eCopyUrl, orUrl)
                    : typeCode === "LCR_BIRTH_REG"
                        ? await releaseBirthRegistry(transaction.id, ctcNumber || transaction?.cedula?.ctcNumber || "", eCopyUrl, orUrl)
                        : typeCode === "LCR_MARRIAGE_LICENSE"
                            ? await releaseMarriageLicense(transaction.id, ctcNumber || transaction?.cedula?.ctcNumber || "", eCopyUrl, orUrl)
                            : await releaseCedula(transaction.id, ctcNumber || transaction?.cedula?.ctcNumber || "", eCopyUrl, orUrl);
            if (res.success) {
                const status = res.data?.status;
                const message = status === "FOR_PICKING"
                    ? "Ready for Picking"
                    : status === "FOR_CLAIM"
                        ? "Marked as Ready for Claiming"
                        : status === "FOR_PROCESSING"
                            ? "Transaction Proceeded to Processing"
                            : status === "FOR_REINSPECTION"
                                ? "Successfully sent to BPLO for Re-Inspection"
                                : "Document Released";
                toast.success(message);
                setECopyFile(null);
                setOrFile(null);
                setStickerNumber("");
                router.push(backUrl);
            }
            else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    }, [transaction, ctcNumber, eCopyFile, orFile, router, isBusinessPermit, isLCR, isLcrBirthCertifiedCopy, typeCode, backUrl]);

    const handleResolveDispute = async () => {
        if (!remarks) { toast.error("Remarks required for resolution"); return; }
        setIsResolvingDispute(true);
        try {
            const res = await resolveDispute(transaction.id, disputeAction, remarks);
            if (res.success) {
                toast.success(`Dispute ${disputeAction === 'APPROVE' ? 'Approved' : 'Rejected'}`);
                setDisputeModalOpen(false);
                fetchTransaction();
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
                <Link href={backUrl}>
                    <Button variant="outline" className="h-14 px-8 rounded-2xl border-2 font-black italic uppercase text-xs tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95">
                        Back to Dashboard
                    </Button>
                </Link>
            </div>
        );
    }

    if (typeCode === "LCR_PSA_ENDORSEMENT" && !["PAID", "PENDING_PAYMENT_VERIFICATION"].includes(transaction?.status)) {
        return (
            <div className="min-h-screen bg-white dark:bg-[#0c111d] flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in duration-700">
                <div className="relative">
                    <div className="absolute inset-0 bg-amber-500/20 blur-[80px] rounded-full animate-pulse" />
                    <div className="p-8 rounded-[3rem] bg-white dark:bg-slate-900 shadow-2xl relative z-10 border border-amber-500/20">
                        <span className="text-8xl">🔒</span>
                    </div>
                </div>
                <div className="space-y-3">
                    <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Access Restricted</h1>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-amber-500 italic">Registrar Action / User Payment Required</p>
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-md">
                    This request is currently under Registrar verification, document release, or waiting for User payment. The Treasury department cannot access this request until it is paid and ready for payment verification.
                </p>
                <Link href="/admin/treasury">
                    <Button variant="outline" className="h-12 px-6 rounded-xl border-2 font-black italic uppercase text-xs tracking-wider transition-all active:scale-95">
                        Back to Treasury Dashboard
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
        if (fiscal && !(isBusinessPermit && transaction.status === "FOR_REQUESTING") && !(isBuildingPermit && transaction.status === "EVALUATED") && !(isLCR && transaction.status === "FOR_REQUESTING")) {
            return {
                basicTax: fiscal.basicTax,
                additionalTax: fiscal.additionalTax,
                penalty: fiscal.penaltyCharge,
                deliveryFee: fiscal.deliveryFee || 0,
                totalAmount: fiscal.totalAmount,
                lineItems: fiscal.lineItems
            };
        }

        if (isBusinessPermit || isBuildingPermit) {
            if (transaction.status === "FOR_REQUESTING" || (isBuildingPermit && transaction.status === "EVALUATED" && !fiscal)) {
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
            const isLate = (additional.registrationType || "").toUpperCase() === "LATE";
            const isMarriageReg = typeCode === "LCR_MARRIAGE_REG";
            const isMarriageLicense = typeCode === "LCR_MARRIAGE_LICENSE";

            // Pag FOR_REQUESTING, gamitin ang standard type baseFee (huwag yung transaction.totalAmount para maiwasan ang loop/double mapping)
            const baseFee = (transaction.status === "FOR_REQUESTING")
                ? Number(transaction.type?.baseFee || 0)
                : (((isMarriageReg && !isLate) || isMarriageLicense)
                    ? 0
                    : Number(transaction.type?.baseFee || additional.totalAmount || transaction.totalAmount || 0));

            const typeDelivery = Number(transaction.type?.deliveryFee || 0);
            const deliveryFeeUsed = transaction.fulfillmentType === "DELIVERY"
                ? (fiscal?.deliveryFee ?? deliveryFee ?? typeDelivery)
                : 0;

            const miscFee = (transaction.status === "FOR_REQUESTING")
                ? (additional.miscFee !== undefined ? Number(additional.miscFee) : (isLate ? 300 : 0))
                : (isLate
                    ? (additional.miscFee !== undefined ? Number(additional.miscFee) : 300)
                    : (isMarriageLicense ? (additional.miscFee !== undefined ? Number(additional.miscFee) : Number(transaction.type?.baseFee || 0)) : 0));

            const itemsSum = feeLineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
            const total = (transaction.totalAmount && Number(transaction.totalAmount) > 0 && transaction.status !== "FOR_REQUESTING")
                ? Number(transaction.totalAmount)
                : deliveryFeeUsed + miscFee + itemsSum;

            return {
                basicTax: baseFee,
                additionalTax: 0,
                penalty: 0,
                deliveryFee: deliveryFeeUsed,
                miscFee,
                totalAmount: total,
                lineItems: feeLineItems.filter(item => (parseFloat(item.amount) || 0) > 0)
            };
        }

        if (transaction.isStudent) {
            if (transaction.status === "FOR_REQUESTING") {
                const itemsSum = feeLineItems.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                const dFee = transaction.fulfillmentType === "DELIVERY" ? deliveryFee : 0;
                const baseStudentFee = Number(transaction.type?.studentFee || 0);
                return {
                    basicTax: baseStudentFee,
                    additionalTax: 0,
                    penalty: 0,
                    deliveryFee: dFee,
                    totalAmount: baseStudentFee + itemsSum + dFee,
                    lineItems: feeLineItems.filter(item => (parseFloat(item.amount) || 0) > 0)
                };
            }
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
    const displayTotal = Number((transaction.totalAmount && transaction.totalAmount > 0 && !((isBusinessPermit || isLCR) && transaction.status === "FOR_REQUESTING")) ? transaction.totalAmount : (calcResult.totalAmount ?? 0));

    const declaredValue = isBusinessPermit
        ? (additional.businessType === "NEW" ? Number(additional.capitalInvestment || 0) : Number(additional.grossSales || 0))
        : (transaction.isStudent ? "Student Request" : income);

    const declaredLabel = isBusinessPermit
        ? (additional.businessType === "NEW" ? "Capital Investment" : "Declared Gross Sales")
        : "Declared Gross";

    const baseSteps = (() => {
        if (isBusinessPermit) {
            const stepsList = [
                { id: "FOR_INSPECTION", label: "INSPECTION" },
                { id: "FOR_REQUESTING", label: "EVALUATION" },
                { id: "EVALUATED", label: "ASSESSMENT" },
                { id: "PAID", label: "PAID" },
                { id: "FOR_PROCESSING", label: "PROCESSING" },
                { id: "FOR_REINSPECTION", label: "PROCESS" },
            ];
            if (transaction.fulfillmentType === "DELIVERY") {
                stepsList.push(
                    { id: "FOR_PICKING", label: "FOR PICKING" },
                    { id: "IN_ROUTE", label: "IN ROUTE" },
                    { id: "DELIVERED", label: "DELIVERED" }
                );
            } else {
                stepsList.push(
                    { id: "FOR_CLAIM", label: "CLAIMING" },
                    { id: "RELEASED", label: "RELEASED" }
                );
            }
            return stepsList;
        }
        if (typeCode === "LCR_PSA_ENDORSEMENT") {
            return [
                { id: "VERIFY_BILL", label: "Registrar: Verify & Bill" },
                { id: "USER_PAYMENT", label: "User: Payment" },
                { id: "TREASURY_OR", label: "Treasury: Verify & OR" },
                { id: "REGISTRAR_RELEASE", label: "Registrar: Release" }
            ];
        }
        const stepsList = [
            { id: "FOR_REQUESTING", label: "EVALUATION" },
            { id: "EVALUATED", label: "ASSESSMENT" },
            { id: "PAID", label: "PAID" },
        ];
        if (isLcrBirthCertifiedCopy) {
            stepsList.push({ id: "VERIFY_OR", label: "VERIFY & ISSUE O.R." });
        }
        stepsList.push({ id: "FOR_PROCESSING", label: "PROCESSING" });
        if (transaction.fulfillmentType === "DELIVERY") {
            stepsList.push(
                { id: "FOR_PICKING", label: "FOR PICKING" },
                { id: "IN_ROUTE", label: "IN ROUTE" },
                { id: "DELIVERED", label: "DELIVERED" }
            );
        } else {
            stepsList.push(
                { id: "FOR_CLAIM", label: "CLAIMING" },
                { id: "RELEASED", label: "RELEASED" }
            );
        }
        return stepsList;
    })();

    // Logic to add terminal or dispute steps
    let steps = [...baseSteps];
    const status = transaction.status as string;

    if (typeCode === "LCR_PSA_ENDORSEMENT") {
        // Maintain standard 4 steps
    } else if (status === "REJECTED") {
        steps = [
            { id: "FOR_REQUESTING", label: "EVALUATION" },
            { id: "REJECTED", label: "REJECTED" }
        ];
    } else if (status === "FOR_REVISION") {
        steps = [
            { id: "FOR_REQUESTING", label: "EVALUATION" },
            { id: "FOR_REVISION", label: "REVISION REQ." }
        ];
    } else if (status === "FOR_REINSPECTION" && !isBusinessPermit) {
        steps = [
            { id: "FOR_INSPECTION", label: "INSPECTION" },
            { id: "FOR_REINSPECTION", label: "RE-INSPECTION" }
        ];
    } else if (status.includes("RETURN") || status.includes("REFUND") || status === "DISPUTE_REJECTED") {
        const disputeLabel = status === "DISPUTE_REJECTED" ? "RETURN REJECTED" : status.replace(/_/g, " ");
        steps.push({ id: status, label: disputeLabel });
    }

    steps = steps.filter(step => {
        // Over-the-counter Cash on Pick Up: Remove PAID step from middle tracking
        if (step.id === "PAID" &&
            transaction.fulfillmentType === "PICK_UP" &&
            transaction.paymentType === "CASH") {
            return false;
        }
        return true;
    });

    const getEffectiveStatus = (s: string) => {
        if (typeCode === "LCR_PSA_ENDORSEMENT") {
            if (["FOR_INSPECTION", "FOR_REQUESTING", "UNDER_REVIEW", "FOR_REVISION", "REJECTED"].includes(s)) {
                return "VERIFY_BILL";
            }
            if (["EVALUATED", "UNPAID"].includes(s)) {
                return "USER_PAYMENT";
            }
            if (["PAID", "PENDING_PAYMENT_VERIFICATION"].includes(s)) {
                return "TREASURY_OR";
            }
            return "REGISTRAR_RELEASE";
        }
        if (isLcrBirthCertifiedCopy && (s === "PAID" || s === "PENDING_PAYMENT_VERIFICATION")) {
            return "VERIFY_OR";
        }
        return s;
    };
    let currentStepIdx = steps.findIndex(s => s.id === getEffectiveStatus(transaction.status));

    if (isBuildingPermit) {
        steps = [
            { id: "EVALUATION", label: "EVALUATION" },
            { id: "ASSESSMENT", label: "ASSESSMENT" },
            { id: "PAYMENT_HISTORY", label: "PAYMENT HISTORY" }
        ];
        const getBuildingStepIndex = (status: string) => {
            if (status === "EVALUATED") return 0; // EVALUATION
            if (status === "UNPAID") return 1; // ASSESSMENT
            return 3; // PAYMENT HISTORY and everything else is fully verified/checked
        };
        currentStepIdx = showPaymentHistoryOverride ? 2 : getBuildingStepIndex(transaction.status);
    }

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

            // --- Birth Certificate Request (Certified Copy) ---
            if (typeCode === "LCR_BIRTH") {
                docs.push({ url: additional.validIdFront || additional.idFrontUrl || resident.idFrontUrl || transaction.user?.residentProfile?.idFrontUrl, label: "Government ID (Front)" });
                docs.push({ url: additional.validIdBack || additional.idBackUrl || resident.idBackUrl || transaction.user?.residentProfile?.idBackUrl, label: "Government ID (Back)" });
                return docs;
            }

            // --- Birth Registration ---
            if (typeCode === "LCR_BIRTH_REG") {
                if (regType === "LATE") {
                    docs.push({ url: additional.negativePSA, label: "Negative Certification from PSA" });
                    docs.push({ url: additional.colb, label: "Certificate of Live Birth (COLB)" });
                    docs.push({ url: additional.affidavitDelayed, label: "Affidavit of Delayed Registration" });
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

            // --- Death Certificate Request (Certified Copy) ---
            if (typeCode === "LCR_DEATH") {
                docs.push({ url: additional.validIdFront || additional.idFrontUrl || resident.idFrontUrl || transaction.user?.residentProfile?.idFrontUrl, label: "Government ID (Front)" });
                docs.push({ url: additional.validIdBack || additional.idBackUrl || resident.idBackUrl || transaction.user?.residentProfile?.idBackUrl, label: "Government ID (Back)" });
                return docs;
            }

            // --- Death Registration ---
            if (typeCode === "LCR_DEATH_REG") {
                if (regType === "LATE") {
                    docs.push({ url: additional.psaNegative, label: "PSA Negative Certification" });
                    docs.push({ url: additional.affidavitOfDelay, label: "Affidavit of Delayed Registration" });
                } else {
                    docs.push({ url: additional.municipalForm103, label: "Municipal Form No. 103" });
                }
            }

            // --- Marriage Certificate Request (Certified Copy) ---
            if (typeCode === "LCR_MARRIAGE") {
                docs.push({ url: additional.validIdFront || additional.idFrontUrl || resident.idFrontUrl || transaction.user?.residentProfile?.idFrontUrl, label: "Government ID (Front)" });
                docs.push({ url: additional.validIdBack || additional.idBackUrl || resident.idBackUrl || transaction.user?.residentProfile?.idBackUrl, label: "Government ID (Back)" });
                return docs;
            }

            // --- Marriage Registration ---
            if (typeCode === "LCR_MARRIAGE_REG") {
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



            // Also check for any other uploaded files in additionalData that are valid URLs
            Object.entries(additional).forEach(([key, val]) => {
                if (typeof val === 'string' && val.startsWith('http') && !docs.find(d => d.url === val)) {
                    // Avoid duplicating paymentReference, eCopyUrl, or orUrl in requirements vault
                    if (
                        key !== 'paymentReference' &&
                        key !== 'eCopyUrl' &&
                        key !== 'orUrl' &&
                        key !== 'idFrontUrl' &&
                        key !== 'idBackUrl' &&
                        key !== 'validIdFront' &&
                        key !== 'validIdBack' &&
                        key !== 'validIdFrontUrl' &&
                        key !== 'validIdBackUrl' &&
                        key !== 'validIdUrl' &&
                        key !== 'idTypeOverride'
                    ) {
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
            { url: additional.proofOfIncomeUrl, label: transaction.isStudent ? "Student ID / Enrollment Proof" : "Income Verification" }
        ];
    })();

    const handleEvaluate = async () => {
        setActionLoading(true);
        try {
            let itemsToSend: { label: string; amount: number }[] | undefined = undefined;

            if (isBusinessPermit && !transaction.isStudent && userRole !== "ADMIN_AIDE") {
                // Business Permit: at least one valid fee is required
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
            } else if (isLCR) {
                // LCR: include ALL feeLineItems (readonly pre-existing + new editable) that have valid label & amount
                const validItems = feeLineItems.filter(item => item.label.trim() !== "" && item.amount.trim() !== "" && (parseFloat(item.amount) || 0) > 0);
                if (validItems.length > 0) {
                    itemsToSend = validItems.map(item => ({
                        label: item.label.trim(),
                        amount: parseFloat(item.amount) || 0
                    }));
                }
            } else {
                // Cedula / Generic: additional fees are optional — only send if filled in
                const validItems = feeLineItems.filter(item => item.label.trim() !== "" && item.amount.trim() !== "");
                if (validItems.length > 0) {
                    itemsToSend = validItems.map(item => ({
                        label: item.label.trim(),
                        amount: parseFloat(item.amount) || 0
                    }));
                }
            }

            const uploadedDocUrl = "";


            // For LCR, resolve miscFee from additionalData to pass explicitly to the server
            const lcrMiscFee = isLCR && additional.miscFee !== undefined ? Number(additional.miscFee) : undefined;

            const res = transaction.isStudent
                ? await evaluateStudentCedulaTransaction(transaction.id, deliveryFee, remarks, itemsToSend, registryBookVerification, uploadedDocUrl, orSeriesNumber)
                : typeCode === "LCR_DEATH"
                    ? await evaluateDeathCertificateTransaction(transaction.id, deliveryFee, remarks, itemsToSend, registryBookVerification, uploadedDocUrl, orSeriesNumber, lcrMiscFee)
                    : typeCode === "LCR_MARRIAGE_LICENSE"
                        ? await evaluateMarriageLicenseTransaction(transaction.id, deliveryFee, remarks, itemsToSend, registryBookVerification, uploadedDocUrl, orSeriesNumber, lcrMiscFee)
                        : await evaluateCedulaTransaction(transaction.id, deliveryFee, remarks, itemsToSend, registryBookVerification, uploadedDocUrl, orSeriesNumber, lcrMiscFee);
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
            if (isBusinessPermit) {
                const formData = new FormData();
                formData.append("id", transaction.id);
                if (remarks) formData.append("remarks", remarks);
                if (orSeriesNumber) formData.append("orSeriesNumber", orSeriesNumber);
                if (orFile) formData.append("orFile", orFile);

                const res = await confirmBusinessPermitPayment(formData);
                if (res.success) {
                    toast.success("Payment Received & Sent to BPLO for Re-Inspection");
                    setReceiptFile(null);
                    setReceiptPreview(null);
                    router.push("/admin/treasury?category=Business%20Permit");
                } else {
                    toast.error(res.error || "Failed to confirm payment");
                }
                return;
            }

            // If already PAID and no O.R. document/number/remarks/receipt is provided, proceed directly to processing
            if (transaction.status === "PAID" && !orFile && !orSeriesNumber && !receiptFile && !remarks) {
                if (isBuildingPermit) {
                    router.push(backUrl);
                    return;
                }
                const releaseFn = typeCode === "LCR_BIRTH"
                    ? releaseBirthCertificate
                    : typeCode === "LCR_BIRTH_REG"
                        ? releaseBirthRegistry
                        : typeCode === "LCR_DEATH"
                            ? releaseDeathCertificate
                            : typeCode === "LCR_DEATH_REG"
                                ? releaseDeathRegistry
                                : typeCode === "LCR_MARRIAGE_LICENSE"
                                    ? releaseMarriageLicense
                                    : releaseCedula;
                const rel = await releaseFn(transaction.id, ctcNumber || transaction?.cedula?.ctcNumber || "");
                if (rel.success) {
                    toast.success(isLCR || isBusinessPermit ? "Proceeding to Re-Inspection" : "Proceeding to Processing");
                    router.push(backUrl);
                } else {
                    toast.error(rel.error || (isLCR || isBusinessPermit ? "Failed to proceed to re-inspection" : "Failed to proceed to processing"));
                }
                return;
            }

            // Otherwise, confirm the payment (upload receipt/or if provided) then proceed to processing
            const formData = new FormData();
            formData.append("id", transaction.id);
            if (remarks) formData.append("remarks", remarks);
            if (receiptFile) formData.append("receiptFile", receiptFile);
            if (orSeriesNumber) formData.append("orSeriesNumber", orSeriesNumber);
            if (orFile) formData.append("orFile", orFile);

            const res = await confirmTransactionPaymentWithReceipt(formData);
            if (res.success) {
                setReceiptFile(null);
                setReceiptPreview(null);
                if (isBuildingPermit) {
                    router.push(backUrl);
                    return;
                }
                // Immediately proceed to processing after confirmation
                const releaseFn = typeCode === "LCR_BIRTH"
                    ? releaseBirthCertificate
                    : typeCode === "LCR_BIRTH_REG"
                        ? releaseBirthRegistry
                        : typeCode === "LCR_DEATH"
                            ? releaseDeathCertificate
                            : typeCode === "LCR_DEATH_REG"
                                ? releaseDeathRegistry
                                : typeCode === "LCR_MARRIAGE_LICENSE"
                                    ? releaseMarriageLicense
                                    : releaseCedula;
                const rel = await releaseFn(transaction.id, ctcNumber || transaction?.cedula?.ctcNumber || "");
                if (isLCR) {
                    if (rel.success) {
                        toast.success("Payment Received & Sent to Civil Registry for Re-Inspection");
                        router.push("/admin/treasury?category=Civil%20Registry");
                    } else {
                        toast.error(rel.error || "Failed to proceed to re-inspection");
                    }
                    return;
                }

                toast.success("Payment Confirmed");
                if (rel.success) {
                    toast.success(isBusinessPermit ? "Proceeding to Re-Inspection" : "Proceeding to Processing");
                } else {
                    toast.error(rel.error || (isBusinessPermit ? "Failed to proceed to re-inspection" : "Failed to proceed to processing"));
                }
                router.push(backUrl);
            } else toast.error(res.error || "Failed");
        } finally { setActionLoading(false); }
    };

    const handleReceiptFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setReceiptFile(file);
            setReceiptPreview(URL.createObjectURL(file));
        }
    };

    const handleDeclinePaymentProof = async () => {
        if (!remarks) { toast.error("Please specify a reason for declining the payment proof."); return; }
        setActionLoading(true);
        try {
            const res = await declinePaymentProofAction(transaction.id, remarks);
            if (res.success) {
                toast.success("Payment proof declined successfully.");
                setRemarks("");
                setIsRequestingRevision(false);
                fetchTransaction();
            } else {
                toast.error(res.error || "Failed to decline payment proof");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handlePrintWaybill = () => {
        // Create an isolated hidden iframe for printing
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) {
            toast.error("Failed to initialize print frame.");
            return;
        }

        const validLogo = branding.logo && (branding.logo.startsWith('/') || branding.logo.startsWith('http') || branding.logo.startsWith('data:'))
            ? branding.logo
            : "/placeholder.png";

        const logoHtml = branding.logo ? `
            <img src="${validLogo}" alt="Logo" style="width: 36px; height: 36px; object-fit: contain;" />
        ` : `
            <div style="width: 32px; height: 32px; border: 2px solid black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 10px; color: black;">
                ${(branding.word1 || 'A').charAt(0)}
            </div>
        `;

        const addressHtml = deliveryAddr ? `
            ${deliveryAddr.houseNumber ? deliveryAddr.houseNumber + ', ' : ''}
            ${deliveryAddr.street ? deliveryAddr.street + ' ' : ''}
            ${deliveryAddr.sitio ? 'Sitio ' + deliveryAddr.sitio + ', ' : ''}
            ${deliveryAddr.purok ? 'Purok ' + deliveryAddr.purok + ', ' : ''}
            <br />
            Barangay ${deliveryAddr.barangay || ''},<br />
            ${deliveryAddr.municipality || ''}, ${deliveryAddr.province || ''}
        ` : `
            ${resident.houseNumber ? resident.houseNumber + ', ' : ''}${resident.street || ''}<br />
            Barangay ${resident.barangay || ''},<br />
            ${resident.municipality || ''}, ${resident.province || ''}
        `;

        const landmarkHtml = (deliveryAddr?.landmark || transaction.deliveryLandmark) ? `
            <div style="margin-top: 4px; padding: 4px; background: rgba(0,0,0,0.05); border-radius: 2px; word-break: break-word;">
                <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: #94a3b8; display: block; line-height: 1;">Landmark</span>
                <span style="font-size: 7px; font-weight: 900; font-style: italic; text-transform: uppercase; line-height: 1.1; color: black; display: block;">
                    ${deliveryAddr?.landmark || transaction.deliveryLandmark}
                </span>
            </div>
        ` : '';

        const amountDue = (fiscal?.totalAmount || transaction.totalAmount || 0).toLocaleString();

        const waybillHtml = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Print Waybill - ${transaction.id}</title>
                    <style>
                        @media print {
                            @page { 
                                size: 100mm 150mm; 
                                margin: 0; 
                            }
                            body { 
                                margin: 0 !important; 
                                padding: 0 !important; 
                                background: white !important;
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        }
                        body {
                            font-family: system-ui, -apple-system, sans-serif;
                            margin: 0;
                            padding: 5mm;
                            background: white;
                            color: black;
                            width: 90mm;
                            height: 140mm;
                            box-sizing: border-box;
                        }
                        .container {
                            display: flex;
                            flex-direction: column;
                            height: 100%;
                            border: 3px solid black;
                            border-radius: 2px;
                            line-height: 1.2;
                            background: white;
                            box-sizing: border-box;
                        }
                        .text-wrap {
                            word-break: break-word;
                            overflow-wrap: anywhere;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <!-- HEADER -->
                        <div style="border-bottom: 3px solid black; padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; background: white; color: black;">
                            <div style="display: flex; align-items: center; gap: 12px;">
                                ${logoHtml}
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 14px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; text-transform: uppercase; line-height: 1; color: black;">
                                        ${branding.word1} <span style="color: ${themeColor}; font-style: italic; letter-spacing: normal;">${branding.word2}</span>
                                    </span>
                                    <span style="font-size: 6px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; font-style: italic; color: #475569;">
                                        Official Municipal Logistics
                                    </span>
                                </div>
                            </div>
                            <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: 0.1em; border: 2px solid black; padding: 4px 8px; color: black; background: white; line-height: 1;">
                                Waybill
                            </div>
                        </div>

                        <!-- QR CODE -->
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; gap: 12px; border-bottom: 2px dashed black;">
                            <div style="width: 140px; height: 140px; background: white; padding: 6px; border: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${transaction.id}" alt="Tracking QR" style="width: 100%; height: 100%;" />
                            </div>
                            <div style="display: flex; flex-direction: column; align-items: center; line-height: 1;">
                                <span style="font-size: 11px; font-weight: 900; font-style: italic; letter-spacing: 0.25em; font-family: monospace; color: black;">
                                    ${transaction.id.slice(-12).toUpperCase()}
                                </span>
                                <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-top: 2px;">
                                    Transaction Tracking Reference
                                </span>
                            </div>
                        </div>

                        <!-- LOGISTICS DATA -->
                        <div style="padding: 10px 12px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 12px; border-bottom: 3px solid black;">
                            <div style="display: flex; flex-direction: column; gap: 8px; min-width: 0;">
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: #64748b;">Recipient Name</span>
                                    <span class="text-wrap" style="font-size: 10px; font-weight: 900; text-transform: uppercase; font-style: italic; line-height: 1.1; color: black;">
                                        ${resident.firstName || ''} ${resident.lastName || ''}
                                    </span>
                                </div>
                                <div style="display: flex; flex-direction: column;">
                                    <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: #64748b;">Contact Number</span>
                                    <span style="font-size: 9px; font-weight: 700; font-style: italic; letter-spacing: 0.05em; color: black;">
                                        ${deliveryAddr?.contactNumber || resident.contactNumber || "--"}
                                    </span>
                                </div>
                            </div>
                            <div style="display: flex; flex-direction: column; min-width: 0;">
                                <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: #64748b;">Delivery Address</span>
                                <span class="text-wrap" style="font-size: 8px; font-weight: 700; text-transform: uppercase; line-height: 1.2; font-style: italic; color: black;">
                                    ${addressHtml}
                                </span>
                                ${landmarkHtml}
                            </div>
                        </div>

                        <!-- SERVICE & PAYMENT -->
                        <div style="padding: 8px 12px; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; border-bottom: 3px solid black;">
                            <div style="display: flex; flex-direction: column; min-width: 0;">
                                <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: black;">Payment Type</span>
                                <span class="text-wrap" style="font-size: 7px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: -0.05em; color: black; line-height: 1;">
                                    ${(transaction.paymentType || '').replace(/_/g, " ")}
                                </span>
                            </div>
                            <div style="display: flex; flex-direction: column; min-width: 0;">
                                <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: black;">Service</span>
                                <span class="text-wrap" style="font-size: 7px; font-weight: 900; text-transform: uppercase; font-style: italic; letter-spacing: -0.05em; color: black; line-height: 1.1;">
                                    ${transaction.type?.name || ''}
                                </span>
                            </div>
                            <div style="display: flex; flex-direction: column; text-align: right; min-width: 0;">
                                <span style="font-size: 5px; font-weight: 700; text-transform: uppercase; color: black;">Amount Due</span>
                                <span style="font-size: 9px; font-weight: 900; font-style: italic; letter-spacing: -0.05em; color: ${themeColor};">
                                    ₱${amountDue}
                                </span>
                            </div>
                        </div>

                        <!-- FOOTNOTE -->
                        <div style="padding: 12px; font-style: italic; box-sizing: border-box;">
                            <div style="border-top: 1.5px dotted black; padding-top: 8px;">
                                <p class="text-wrap" style="font-size: 6px; font-weight: 700; text-transform: uppercase; line-height: 1.4; color: #475569; margin: 0;">
                                    * Official document for municipal logistics use only. Handle with extreme care.
                                    If document is damaged, please report immediately to the Treasury Office.
                                </p>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        doc.open();
        doc.write(waybillHtml);
        doc.close();

        // Print once iframe finishes loading
        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            // Cleanup the frame after print dialog is closed
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
    };

    const hasVerification = !!((transaction?.paymentType === "E_PAYMENT" || transaction?.paymentType === "BANK_TRANSFER") || (transaction?.status === "DELIVERED" && transaction?.podUrl));
    const hasDispute = !!(transaction?.status?.includes("RETURN") || transaction?.status?.includes("REFUND") || transaction?.status === "DISPUTE_REJECTED");
    const isRequirementsAlone = !hasVerification && !hasDispute;


    const viewProps = {
        transaction,
        session,
        userRole,
        rawUserRole,
        isTreasuryStaff,
        isBPLOAdmin,
        isReadOnlyAide,
        backUrl,
        actionLoading,
        setActionLoading,
        remarks,
        setRemarks,
        ctcNumber,
        setCtcNumber,
        stickerNumber,
        setStickerNumber,
        isRejecting,
        setIsRejecting,
        isRequestingRevision,
        setIsRequestingRevision,
        deliveryFee,
        setDeliveryFee,
        eCopyFile,
        setECopyFile,
        eCopyPreview,
        setECopyPreview,
        orFile,
        setOrFile,
        orPreview,
        setOrPreview,
        themeColor,
        branding,
        additionalFeeLabel,
        setAdditionalFeeLabel,
        additionalFeeAmount,
        setAdditionalFeeAmount,
        showAdditionalFeeForm,
        setShowAdditionalFeeForm,
        isResolvingDispute,
        setIsResolvingDispute,
        disputeModalOpen,
        setDisputeModalOpen,
        disputeAction,
        setDisputeAction,
        showPreviousPhases,
        setShowPreviousPhases,
        feeLineItems,
        setFeeLineItems,
        fetchTransaction,
        handleEvaluate,
        handleConfirmPayment,
        handleDeclinePaymentProof,
        handlePrintWaybill,
        handleRelease,
        handleResolveDispute,
        handleAddAdditionalFee,
        handleRemoveAdditionalFee,
        handleApproveBilling,
        handleReject,
        handleRequestRevision,
        addFeeLineItem,
        removeFeeLineItem,
        updateFeeLineItem,
        safeFormatDate,
        declaredValue,
        declaredLabel,
        calcResult,
        displayTotal,
        evidenceDocs,
        steps,
        currentStepIdx,
        hasVerification,
        hasDispute,
        isRequirementsAlone,
        handleViewFile,
        deliveryAddr,
        fiscal,
        receiptFile,
        setReceiptFile,
        receiptPreview,
        setReceiptPreview,
        handleReceiptFileSelect,
        registryBookVerification,
        setRegistryBookVerification,
        birthRegDocFile,
        setBirthRegDocFile,
        birthRegDocPreview,
        setBirthRegDocPreview,
        orSeriesNumber,
        setOrSeriesNumber,
        miscFee,
        setMiscFee
    };

    if (isBusinessPermit) {
        return (
            <>
                <BusinessPermitView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (isBuildingPermit) {
        return (
            <>
                <BuildingPermitView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (typeCode === "LCR_PSA_ENDORSEMENT") {
        return (
            <>
                <BirthPsaEndorsementView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (typeCode === "LCR_MARRIAGE") {
        return (
            <>
                <MarraigeCertificateView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (typeCode === "LCR_BIRTH" || isLcrBirthCertifiedCopy) {
        return (
            <>
                <BirthCertificateView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (typeCode === "LCR_DEATH") {
        return (
            <>
                <DeathCertificateView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (typeCode === "LCR_DEATH_REG") {
        return (
            <>
                <DeathRegistrationView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (typeCode === "LCR_MARRIAGE_LICENSE") {
        return (
            <>
                <MarriageLicenseView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    if (isLCR) {
        return (
            <>
                <BirthRegistrationView {...viewProps} />
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => setViewerOpen(false)}
                    file={null}
                    fileUrl={viewerUrl}
                    title={viewerTitle}
                    themeColor={themeColor}
                    documents={viewerDocs}
                    initialIndex={viewerIndex}
                />
            </>
        );
    }
    return (
        <>
            <GenericServiceView {...viewProps} />
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor={themeColor}
                documents={viewerDocs}
                initialIndex={viewerIndex}
            />
        </>
    );
}

