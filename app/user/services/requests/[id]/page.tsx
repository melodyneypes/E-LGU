"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Calculator,
    Truck,
    Building2,
    CreditCard,
    MapPin,
    FileText,
    Wallet,
    Info,
    CheckCircle2,
    Home,
    Loader2,
    Upload,
    Check,
    Copy,
    XCircle,
    Activity,
    DollarSign,
    Clock,
    Download,
    ExternalLink,
    AlertCircle,
    QrCode,
    Search,
    Package,
    ShieldCheck,
    Hash,
    Eye,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compression";
import { calculateCedula } from "@/lib/cedula";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { CancelRequestModal } from "@/components/shared/CancelRequestModal";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import PaymongoCheckoutButton from "@/components/PaymongoCheckoutButton";

const checkIsPdf = (url: string | null) => {
    if (!url) return false;
    return url.toLowerCase().endsWith(".pdf") || url.includes("application/pdf") || url.includes(".pdf?");
};

const checkIsFileUrl = (value: string | null) => {
    if (!value) return false;
    return /^(https?:\/\/|blob:|data:)/i.test(value);
};

const getPaymongoPaymentIdFromAdditionalData = (additionalData: any) => {
    const paymongo = additionalData?.paymongo || {};
    const lastPayment = paymongo?.lastPayment || {};
    const payments =
        lastPayment?.data?.attributes?.payments ||
        lastPayment?.attributes?.payments ||
        lastPayment?.data?.payments ||
        [];

    const payment = Array.isArray(payments) ? payments[0] : null;
    return payment?.id || payment?.data?.id || null;
};

const isPaymongoPaymentId = (value: unknown) => {
    return typeof value === "string" && value.startsWith("pay_");
};

// Display dates/times in Philippine Standard Time (Asia/Manila) regardless of server or client timezone
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatPHDate(date: string | Date): string {
    return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date));
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function formatPHDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(date));
}
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
    getTransactionById,
    finalizeTransactionFulfillment,
    getSystemSettingAction,
    getPublicBarangayLogistics,
    cancelTransaction,
    requestReturnOrRefund,
    resubmitTransaction,
    checkPaymongoPaymentStatus,
    saveLogisticsDetails
} from "@/app/admin/transactions/actions";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { BirthCertificateRequestDetails, BirthCertificateVerificationCard } from "./birth-certificate-request";
import { DeathCertificateRequestDetails, DeathCertificateVerificationCard } from "./death-certificate-request";
import { DeathRegistrationRequestDetails, DeathRegistrationVerificationCard } from "./death-registration";
import { MarriageCertificateRequestDetails, MarriageCertificateVerificationCard } from "./marriage-certificate-request";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
    ssr: false,
    loading: () => <div className="h-[250px] w-full rounded-xl bg-white/5 animate-pulse flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Initializing Grid Matrix...</div>
});



export default function RequestHubPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [request, setRequest] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const [paymentRefCopied, setPaymentRefCopied] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [isDisputing, setIsDisputing] = useState(false);
    const [isResubmitting, setIsResubmitting] = useState(false);
    const [revisionFiles, setRevisionFiles] = useState<{ [key: string]: File | null }>({});



    // Dispute States
    const [disputeOpen, setDisputeOpen] = useState(false);
    const [disputeType, setDisputeType] = useState<"RETURN" | "REFUND">("RETURN");
    const [disputeReason, setDisputeReason] = useState("");
    const [disputeFile, setDisputeFile] = useState<File | null>(null);
    const [disputePreview, setDisputePreview] = useState<string | null>(null);

    // Logistics & Payment States
    const [localFulfillment, setLocalFulfillment] = useState<"PICK_UP" | "DELIVERY" | "E_COPY">("PICK_UP");
    const [localPayment, setLocalPayment] = useState("E_PAYMENT");
    const [localLat, setLocalLat] = useState<number | null>(null);
    const [localLng, setLocalLng] = useState<number | null>(null);
    const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
    const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
    const [gcashReferenceNo, setGcashReferenceNo] = useState("");
    const [selectedPaymongoMethod, setSelectedPaymongoMethod] = useState<"gcash" | "qrph" | "dob">("gcash");

    // Delivery Address States
    const [address, setAddress] = useState({
        houseNumber: "",
        street: "",
        sitio: "",
        purok: "",
        barangay: "",
        municipality: "",
        province: "",
        contactNumber: "",
        landmark: ""
    });

    // Treasury / Payment Details (Dynamic from settings)
    const [gcashDetails, setGcashDetails] = useState({
        qr: "",
        name: "OFFICIAL TREASURY ACCOUNT",
        number: "SCAN TO VIEW"
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [bankDetails, setBankDetails] = useState({
        bankName: "LANDBANK OF THE PHILIPPINES",
        accountName: "MUNICIPALITY OF MAPANDAN",
        accountNumber: "0541-2345-67"
    });
    const [themeColor, setThemeColor] = useState("");
    const [availableBarangays, setAvailableBarangays] = useState<any[]>([]);
    const [brgySearch, setBrgySearch] = useState("");
    const [isBrgyOpen, setIsBrgyOpen] = useState(false);

    // --- Lightbox State ---
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [isTreasuryOpen, setIsTreasuryOpen] = useState(true);

    const handleViewFile = (url: string | null, title: string) => {
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerOpen(true);
    };

    useEffect(() => {
        async function fetchRequest() {
            try {
                const res = await getTransactionById(id);
                if (res.success && res.data) {
                    let req = res.data;



                    if (req.status === "UNPAID" || req.status === "EVALUATED") {
                        try {
                            // Retry up to 3 times with delays — PayMongo may not settle the payment immediately after redirect
                            const MAX_RETRIES = 3;
                            const RETRY_DELAY_MS = 3000;
                            let paymentConfirmed = false;

                            for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                                const checkRes = await checkPaymongoPaymentStatus(id);
                                if (checkRes.success && checkRes.status === "PAID") {
                                    const refreshedRes = await getTransactionById(id);
                                    if (refreshedRes.success && refreshedRes.data) {
                                        req = refreshedRes.data;
                                    }
                                    paymentConfirmed = true;
                                    break;
                                }
                                // If not paid yet and we have retries left, wait before trying again
                                if (attempt < MAX_RETRIES) {
                                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                                }
                            }

                            if (!paymentConfirmed) {
                                console.log("[RequestHubPage] Payment not confirmed after retries — may still be processing.");
                            }
                        } catch (checkErr) {
                            console.error("Failed to check PayMongo status:", checkErr);
                        }
                    }

                    setRequest(req);

                    if (req.user?.residentProfile || req.residentSnapshot) {
                        const r = (req.user?.residentProfile || req.residentSnapshot) as any;
                        const finalAddr = (typeof req.deliveryAddress === 'string' ? JSON.parse(req.deliveryAddress || '{}') : req.deliveryAddress) || {};

                        setAddress({
                            houseNumber: finalAddr.houseNumber || r.houseNumber || "",
                            street: finalAddr.street || r.street || "",
                            sitio: finalAddr.sitio || r.sitio || "",
                            purok: finalAddr.purok || r.purok || "",
                            barangay: finalAddr.barangay || r.barangay || "",
                            municipality: finalAddr.municipality || r.municipality || "",
                            province: finalAddr.province || r.province || "",
                            contactNumber: r.contactNumber || "",
                            landmark: req.deliveryLandmark || ""
                        });

                        const lat = req.deliveryLat ? Number(req.deliveryLat) : r.latitude;
                        const lng = req.deliveryLng ? Number(req.deliveryLng) : r.longitude;

                        if (lat && lng) {
                            setLocalLat(lat);
                            setLocalLng(lng);
                        } else {
                            setLocalLat(16.026);
                            setLocalLng(120.454);
                        }
                    }

                    if (req.fulfillmentType) setLocalFulfillment(req.fulfillmentType);
                    if (req.paymentType) setLocalPayment(req.paymentType);
                    if (req.additionalData?.gcashReferenceNo) setGcashReferenceNo(req.additionalData.gcashReferenceNo);
                    if (checkIsFileUrl(req.paymentReference)) {
                        setPaymentProofPreview(req.paymentReference);
                    } else if (req.status === "UNPAID" && req.additionalData?.previousPaymentProofs?.length > 0) {
                        const prevs = req.additionalData.previousPaymentProofs;
                        setPaymentProofPreview(prevs[prevs.length - 1].url);
                    }

                } else {
                    toast.error("Request not found");
                    router.push("/user/services/requests");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                toast.error("Failed to load request details");
            }
        }

        async function fetchSettings() {
            try {
                const qrRes = await getSystemSettingAction("gcash_qr_url", "");
                const nameRes = await getSystemSettingAction("gcash_account_name", "ADMIN ACCOUNT");
                const numRes = await getSystemSettingAction("gcash_account_number", "0000 000 0000");
                const bNameRes = await getSystemSettingAction("bank_name", "LANDBANK OF THE PHILIPPINES");
                const bAccNameRes = await getSystemSettingAction("bank_account_name", "MUNICIPALITY OF MAPANDAN");
                const bAccNumRes = await getSystemSettingAction("bank_account_number", "0541-2345-67");
                const themeRes = await getSystemSettingAction("theme_color", "#2563eb");

                setGcashDetails({
                    qr: qrRes.data,
                    name: nameRes.data,
                    number: numRes.data
                });
                setBankDetails({
                    bankName: bNameRes.data,
                    accountName: bAccNameRes.data,
                    accountNumber: bAccNumRes.data
                });
                setThemeColor(themeRes.data);
            } catch (err) {
                console.error("Fetch settings error:", err);
            }
        }

        async function fetchLogistics() {
            try {
                const res = await getPublicBarangayLogistics();
                if (res.success) setAvailableBarangays(res.data || []);
            } catch (err) {
                console.error("Fetch logistics error:", err);
            }
        }

        async function initialize() {
            setLoading(true);
            await Promise.all([
                fetchRequest(),
                fetchSettings(),
                fetchLogistics()
            ]);
            setLoading(false);
        }

        initialize();
    }, [id, router]);

    const statusRef = React.useRef(request?.status);
    const isCancelledRef = React.useRef(request?.isCancelled);
    useEffect(() => {
        statusRef.current = request?.status;
        isCancelledRef.current = request?.isCancelled;
    }, [request]);

    // Realtime Supabase Subscription for request status/detail updates
    useEffect(() => {
        if (!supabase || !id) return;

        console.log(`Subscribing to Supabase Realtime for transaction ${id}...`);
        const channel = supabase
            .channel(`realtime-request-${id}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "Transaction",
                    filter: `id=eq.${id}`,
                },
                async (payload: any) => {
                    console.log("Realtime update caught for request:", payload);
                    // Re-fetch request details
                    try {
                        const res = await getTransactionById(id);
                        if (res.success && res.data) {
                            const newStatus = res.data.status;
                            const oldStatus = statusRef.current;
                            const newCancelled = res.data.isCancelled;
                            const oldCancelled = isCancelledRef.current;

                            if (oldStatus && (newStatus !== oldStatus || newCancelled !== oldCancelled)) {
                                toast.info("Application status updated! Redirecting to requests...");
                                setTimeout(() => {
                                    router.push("/user/services/requests");
                                }, 1000);
                            } else {
                                setRequest(res.data);
                            }
                        }
                    } catch (err) {
                        console.error("Failed to reload request in realtime:", err);
                    }
                }
            )
            .subscribe();

        return () => {
            console.log(`Unsubscribing from Supabase Realtime for transaction ${id}...`);
            supabase.removeChannel(channel);
        };
    }, [id, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setPaymentProofFile(file);
            setPaymentProofPreview(URL.createObjectURL(file));
        }
    };


    const handleClearPaymentProof = () => {
        setPaymentProofFile(null);
        setPaymentProofPreview(null);
    };


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleDownloadQR = async () => {
        if (!gcashDetails.qr) return;
        try {
            const response = await fetch(gcashDetails.qr);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Mapandan_Treasury_QR_${id.slice(-6).toUpperCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("QR Code downloaded.");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download QR code.");
        }
    };

    const handleECopyDownload = async () => {
        const eCopyUrl = request?.eCopyUrl || request?.cedula?.documentUrl || request?.businessPermit?.documentUrl;
        if (!eCopyUrl) return;
        try {
            const response = await fetch(eCopyUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            const ext = blob.type.includes("pdf") ? "pdf" : "png";
            link.download = `${request?.type?.name || "Official-Document"}_${id.slice(-6).toUpperCase()}.${ext}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success("Document downloaded!");
        } catch {
            toast.error("Download failed. Try opening in a new tab.");
        }
    };

    const handleFinalize = async () => {
        if (!isFreeDeathRegPickUp && (localPayment === "E_PAYMENT" || localPayment === "BANK_TRANSFER") && !paymentProofFile) {
            toast.error("Please upload proof of payment.");
            return;
        }
        // Reference number is optional, removed validation

        setIsFinalizing(true);
        try {
            const formData = new FormData();
            formData.append("transactionId", id);
            formData.append("fulfillmentType", localFulfillment);
            formData.append("paymentType", localPayment);
            formData.append("deliveryAddress", JSON.stringify(address));
            formData.append("deliveryLat", String(localLat || ""));
            formData.append("deliveryLng", String(localLng || ""));
            formData.append("deliveryLandmark", address.landmark);
            formData.append("gcashReferenceNo", gcashReferenceNo.trim());

            if (paymentProofFile) {
                formData.append("paymentFile", paymentProofFile);
            }

            const res = await finalizeTransactionFulfillment(formData);
            if (res.success) {
                toast.success("Logistics secured!");
                window.location.reload();
            } else {
                toast.error(res.error || "Failed to finalize");
            }
        } catch (error) {
            console.error("Finalization error:", error);
            toast.error("Network error during finalization");
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleSaveLogisticsForPaymongo = async (): Promise<boolean> => {
        try {
            const res = await saveLogisticsDetails(
                id,
                localFulfillment,
                localPayment,
                address,
                localLat,
                localLng,
                address.landmark
            );
            if (res.success) {
                return true;
            } else {
                toast.error(res.error || "Failed to secure logistics configuration");
                return false;
            }
        } catch (error) {
            console.error("Save logistics error before PayMongo:", error);
            toast.error("Failed to secure logistics configuration");
            return false;
        }
    };

    const handleCancel = async () => {
        setCancelConfirmOpen(false);
        setIsCancelling(true);
        try {
            const res = await cancelTransaction(id);
            if (res.success) {
                toast.success("Request cancelled successfully.");
                window.location.reload();
            } else {
                toast.error(res.error || "Failed to cancel");
            }
        } catch (error) {
            console.error("Cancel error:", error);
            toast.error("Network error during cancellation");
        } finally {
            setIsCancelling(false);
        }
    };

    const handleDisputeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            let fileToProcess = file;
            if (file.type.startsWith("image/")) {
                try {
                    toast.loading("Compressing and optimizing dispute evidence...", { id: "image-compress-toast" });
                    fileToProcess = await compressImage(file);
                    toast.success("Evidence optimized successfully!", { id: "image-compress-toast" });
                } catch (err) {
                    console.error("Compression error:", err);
                    toast.dismiss("image-compress-toast");
                }
            }
            setDisputeFile(fileToProcess);
            setDisputePreview(URL.createObjectURL(fileToProcess));
        }
    };

    const handleDispute = async () => {
        if (!disputeReason) {
            toast.error("Reason required.");
            return;
        }

        setIsDisputing(true);
        try {
            const formData = new FormData();
            formData.append("id", id);
            formData.append("type", disputeType);
            formData.append("reason", disputeReason);
            if (disputeFile) {
                formData.append("proofFile", disputeFile);
            }

            const res = await requestReturnOrRefund(formData);
            if (res.success) {
                toast.success(`Request submitted.`);
                setDisputeOpen(false);
                window.location.reload();
            } else {
                toast.error(res.error || "Failed to submit dispute");
            }
        } catch (err) {
            console.error("Dispute error:", err);
            toast.error("An error occurred");
        } finally {
            setIsDisputing(false);
        }
    };

    const handleRevisionFile = async (key: string, file: File | null) => {
        if (file) {
            let fileToProcess = file;
            if (file.type.startsWith("image/")) {
                try {
                    toast.loading("Compressing and optimizing document...", { id: "image-compress-toast" });
                    fileToProcess = await compressImage(file);
                    toast.success("Document optimized successfully!", { id: "image-compress-toast" });
                } catch (err) {
                    console.error("Compression error:", err);
                    toast.dismiss("image-compress-toast");
                }
            }
            setRevisionFiles(prev => ({ ...prev, [key]: fileToProcess }));
        } else {
            setRevisionFiles(prev => ({ ...prev, [key]: null }));
        }
    };

    const handleResubmit = async () => {
        setIsResubmitting(true);
        try {
            const formData = new FormData();
            Object.entries(revisionFiles).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });
            const res = await resubmitTransaction(id, formData);
            if (res.success) {
                toast.success("Transaction resubmitted successfully!");
                window.location.reload(); // Hard reload to ensure data resets
            } else {
                toast.error(res.error || "Failed to resubmit");
            }
        } finally {
            setIsResubmitting(false);
        }
    };



    const getStatusConfig = (status: string) => {
        if (request?.isCancelled) {
            return { label: "CANCELLED", color: "bg-red-600 text-white border-transparent", icon: XCircle };
        }
        switch (status) {
            case "DRAFT":
                return { label: "DRAFT", color: "bg-slate-100 text-slate-600 border-slate-200", icon: FileText };
            case "FOR_REVISION":
                return { label: "NEEDS REVISION", color: "bg-amber-500 text-white border-amber-500", icon: AlertCircle };
            case "FOR_REQUESTING":
                return { label: "FOR EVALUATION", color: "bg-primary text-white border-transparent", icon: Clock };
            case "FOR_INSPECTION":
                return { label: "UNDER INSPECTION", color: "bg-blue-600 text-white border-blue-600", icon: Search };
            case "FOR_PROCESSING":
                return { label: "FOR PROCESSING", color: "bg-primary text-white border-primary", icon: Activity };
            case "FOR_REINSPECTION":
                return { label: "FOR PROCESSING", color: "bg-primary text-white border-primary", icon: Activity };
            case "FOR_CLAIM":
                return { label: "FOR CLAIM", color: "bg-blue-600 text-white border-blue-600", icon: Clock };
            case "EVALUATED":
                if (request?.type?.code?.startsWith("BUILDING_PERMIT") && !request?.fiscalSnapshot) {
                    return { label: "AWAITING TREASURY ASSESSMENT", color: "bg-amber-500 text-white border-amber-500", icon: Clock };
                }
                return { label: "EVALUATED", color: "bg-primary text-white border-primary", icon: DollarSign };
            case "UNPAID":
                return { label: "UNPAID", color: "bg-amber-500 text-white border-amber-500", icon: Clock };
            case "PAID":
                return { label: "PAID", color: "bg-primary text-white border-primary", icon: Clock };
            case "FOR_PICKING":
                return { label: "FOR DELIVERY", color: "bg-amber-500 text-white border-amber-500", icon: Clock };
            case "IN_ROUTE":
                return { label: "IN ROUTE", color: "bg-blue-500 text-white border-blue-500", icon: Truck };
            case "DELIVERED":
                return { label: "DELIVERED", color: "bg-emerald-500 text-white border-emerald-500", icon: CheckCircle2 };
            case "RELEASED":
                return { label: "RELEASED", color: "bg-emerald-500 text-white border-emerald-500", icon: CheckCircle2 };
            case "REJECTED":
                return { label: "REJECTED", color: "bg-red-500 text-white border-red-500", icon: XCircle };
            case "RETURN_REQUESTED":
                return { label: "REQUEST FOR RETURN", color: "bg-orange-500 text-white", icon: Activity };
            case "REFUND_REQUESTED":
                return { label: "REQUEST FOR REFUND", color: "bg-orange-500 text-white", icon: DollarSign };
            case "RETURNED":
                return { label: "RETURNED", color: "bg-slate-600 text-white", icon: Package };
            case "REFUNDED":
                return { label: "REFUNDED", color: "bg-slate-600 text-white", icon: DollarSign };
            case "DISPUTE_REJECTED":
                return { label: "REJECTED", color: "bg-red-600 text-white", icon: XCircle };
            default:
                return { label: status.replace(/_/g, " "), color: "bg-slate-900 text-white", icon: Clock };
        }
    };

    const additionalData = useMemo(() => request?.additionalData || {}, [request?.additionalData]);
    const residentData = request?.user?.residentProfile || request?.residentSnapshot || {};
    const residentIdFront = residentData.idFrontUrl;
    const residentIdBack = residentData.idBackUrl;
    const statusConfig = request ? getStatusConfig(request.status) : null;
    const typeCode = request?.type?.code || "";
    const isActionable = (request?.status === "EVALUATED" && (!typeCode.startsWith("BUILDING_PERMIT") || !!request.fiscalSnapshot)) || (request?.status === "UNPAID" && (typeCode.startsWith("BUSINESS_PERMIT") || typeCode.startsWith("CEDULA") || typeCode.startsWith("BUILDING_PERMIT")));
    const isBusinessPermit = typeCode.startsWith("BUSINESS_PERMIT");
    const isBuildingPermit = typeCode.startsWith("BUILDING_PERMIT");
    const isCedula = typeCode.startsWith("CEDULA");
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const estimatedCedulaAmount = useMemo(() => {
        if (!isCedula || !request) return 0;
        if (request.isStudent) {
            const baseStudentFee = Number(request.type?.studentFee || 0);
            const deliveryFee = request.fulfillmentType === "DELIVERY" ? (request.type?.deliveryFee || 0) : 0;
            return baseStudentFee + deliveryFee;
        } else {
            const incomeValue = Number(additionalData.income || 0);
            const propertyValue = Number(additionalData.propertyValue || 0);
            const type = typeCode === "CEDULA_JUR" ? "JURIDICAL" : "INDIVIDUAL";
            const fulfillmentType = request.fulfillmentType;
            const deliveryFee = request.type?.deliveryFee || 0;
            const baseFee = request.type?.baseFee;

            const calc = calculateCedula({
                type,
                income: incomeValue,
                propertyValue,
                fulfillmentType,
                deliveryFee,
                baseFee
            });
            return calc.totalAmount;
        }
    }, [isCedula, request, additionalData, typeCode]);
    const isCivilRegistry = typeCode.startsWith("CIVIL_REGISTRY") || typeCode.startsWith("LCR_");
    const isLcrBirth = typeCode === "LCR_BIRTH" || typeCode === "LCR_BIRTH_REG";
    const isLcrDeath = typeCode === "LCR_DEATH" || typeCode === "LCR_DEATH_REG";
    const isLcrDeathCert = typeCode === "LCR_DEATH";
    const isLcrDeathReg = typeCode === "LCR_DEATH_REG";
    const isLcrMarriage = typeCode === "LCR_MARRIAGE" || typeCode === "LCR_MARRIAGE_REG";
    const isBirthPsaEndorsement = typeCode === "LCR_PSA_ENDORSEMENT";
    const isDeathPsaEndorsement = typeCode === "LCR_DEATH_PSA_ENDORSEMENT";
    const isPsaEndorsement = isBirthPsaEndorsement || isDeathPsaEndorsement;
    const isRenewal = request?.type?.code === "BUSINESS_PERMIT_RENEW" || additionalData.businessType === "RENEWAL" || additionalData.businessType === "RENEW" || additionalData.businessType?.toLowerCase()?.includes("renew");
    const remainingRevisions = request ? Math.max(0, 3 - (request.revisionCount || 0)) : 3;
    const isPermitNewReleasedOrDelivered = isBusinessPermit &&
        ["RELEASED", "DELIVERED"].includes(request?.status) &&
        !!request?.businessPermit?.permitNumber;
    const paymentProofUrl = checkIsFileUrl(request?.paymentReference) ? request.paymentReference : null;
    const paymongoPaymentId = getPaymongoPaymentIdFromAdditionalData(additionalData);
    const paymentReferenceNumber =
        additionalData?.gcashReferenceNo ||
        paymongoPaymentId ||
        (isPaymongoPaymentId(additionalData?.paymongo?.paymentId) ? additionalData.paymongo.paymentId : null) ||
        (isPaymongoPaymentId(request?.paymentReference) ? request.paymentReference : null);

    const isReportAllowed = useMemo(() => {
        if (!request || request.status !== "DELIVERED") return false;
        const deliveredTime = request.deliveredAt ? new Date(request.deliveredAt) : new Date(request.updatedAt);
        const timeDiff = Date.now() - deliveredTime.getTime();
        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;
        return timeDiff <= twoDaysInMs;
    }, [request]);

    const computation = useMemo(() => {
        if (!request) return null;
        const fiscal = request.fiscalSnapshot as any;
        const addData = request.additionalData || {};
        const selectedBrgy = availableBarangays.find(b => b.name === address.barangay);
        const dFee = localFulfillment === "DELIVERY" ? (selectedBrgy?.deliveryFee ?? request.type?.deliveryFee ?? 0) : 0;

        // Handle Civil Registry (Usually simple total or evaluated amount)
        if (isCivilRegistry) {
            const fiscal = request.fiscalSnapshot as any;
            const savedDeliveryFee = Number(fiscal?.deliveryFee || 0);
            const cleanBase = Math.max(0, (Number(request.totalAmount) || Number(fiscal?.totalAmount) || 0) - savedDeliveryFee);
            const finalTotal = cleanBase + dFee;
            return {
                basicTax: 0,
                additionalTax: 0,
                penaltyAmount: 0,
                deliveryFee: dFee,
                finalTotal,
                cedulaType: "INDIVIDUAL",
                miscFee: fiscal?.miscFee !== undefined ? Number(fiscal.miscFee) : undefined,
                lineItems: fiscal?.lineItems || []
            };
        }

        const cedulaType = (addData.applicantType === "JURIDICAL" || addData.applicantType === "COMPANY") ? "JURIDICAL" : "INDIVIDUAL";

        if (fiscal) {
            const savedDeliveryFee = Number(fiscal.deliveryFee || 0);
            const cleanBaseAmount = Math.max(0, (Number(fiscal.totalAmount) || 0) - savedDeliveryFee);
            return {
                basicTax: fiscal.basicTax || 0,
                additionalTax: fiscal.additionalTax || 0,
                penaltyAmount: fiscal.penaltyCharge || 0,
                deliveryFee: dFee,
                finalTotal: cleanBaseAmount + dFee,
                cedulaType,
                lineItems: fiscal.lineItems
            };
        }

        const income = Number(addData.income) || 0;
        const propertyValue = Number(addData.propertyValue) || 0;
        const totalBasis = income + propertyValue;
        const basicTax = cedulaType === "JURIDICAL" ? 500.00 : 5.00;
        const additionalTax = cedulaType === "JURIDICAL" ? Math.floor(totalBasis / 5000) * 2.00 : Math.floor(totalBasis / 1000) * 1.00;
        const subtotal = basicTax + additionalTax;

        const savedDeliveryFee = Number(request.fiscalSnapshot?.deliveryFee || 0);
        const cleanTotalAmount = Math.max(0, (Number(request.totalAmount) || 0) - savedDeliveryFee);

        const totalWithPenalty = cleanTotalAmount || subtotal;
        const penaltyAmount = Math.max(0, totalWithPenalty - subtotal);
        const finalTotal = totalWithPenalty + dFee;

        return { basicTax, additionalTax, penaltyAmount, deliveryFee: dFee, finalTotal, cedulaType };
    }, [request, localFulfillment, address.barangay, availableBarangays, isCivilRegistry]);

    const isFreeDeathRegPickUp = (
        request?.typeId === "cmpgkxxke0019vpjkquvcxggu" ||
        typeCode === "LCR_DEATH_REG" ||
        typeCode === "LCR_MARRIAGE_REG" ||
        typeCode === "LCR_BIRTH_REG"
    ) &&
        ((additionalData.registrationType || "").toUpperCase() === "STANDARD" || !additionalData.registrationType) &&
        localFulfillment === "PICK_UP" &&
        (computation?.finalTotal ?? 0) === 0;

    // Flat list of docs that have a URL — drives both the grid and the lightbox
    const documentList = useMemo(() => {
        if (!request) return [] as { label: string; url: string }[];
        const addData = request.additionalData || {};

        if (isBuildingPermit) {
            const docs = [];
            const d = addData.documents || {};

            // Requirements
            const reqLabels = [
                "Barangay Clearance/Certification", "Tax Declaration", "Land Title",
                "Community Tax Certificate", "Latest Tax Receipts",
                "Adjoining Owners Confirmation", "Locational Clearance", "2 Affidavits",
                "Affidavit of Consent", "Affidavit of Adjoining Owners", "Signed & Sealed Plans",
                "Fire Safety Clearance"
            ];
            reqLabels.forEach((label, i) => {
                if (d[`req_${i}`]) docs.push({ label, url: d[`req_${i}`] });
            });

            // Permits
            const permitLabels = [
                "1. Building Permit", "2. Electrical Permit", "3. Plumbing Permit",
                "4. Sanitary Permit", "5. Excavation & Ground Preparation Permit",
                "6. Fencing Permit", "7. Affidavit Form", "8. Scaffolding Permit",
                "9. Mechanical Permit"
            ];
            permitLabels.forEach((label, i) => {
                if (d[`permit_${i}`]) docs.push({ label, url: d[`permit_${i}`] });
            });

            if (d.newIdFile) docs.push({ label: "Applicant ID", url: d.newIdFile });
            if (d.tctFile) docs.push({ label: "TCT File", url: d.tctFile });
            if (addData.signature) docs.push({ label: "Digital Signature", url: addData.signature });

            return docs.filter(doc => !!doc.url) as { label: string; url: string }[];
        }

        if (isCivilRegistry) {
            const lcrDocs = [];
            // Deceased / Registrations (Death)
            if (addData.municipalForm103) lcrDocs.push({ label: "Municipal Form No. 103", url: addData.municipalForm103 });
            if (addData.psaNegative) lcrDocs.push({ label: "PSA Negative Certification", url: addData.psaNegative });
            if (addData.affidavitOfDelay) lcrDocs.push({ label: "Affidavit of Delayed Registration", url: addData.affidavitOfDelay });

            // Birth Registration
            if (addData.municipalForm102) lcrDocs.push({ label: "Municipal Form 102", url: addData.municipalForm102 });
            if (addData.marriageCertificate) lcrDocs.push({ label: "Marriage Certificate of Parents", url: addData.marriageCertificate });
            if (addData.communityTaxCertificate) lcrDocs.push({ label: "Community Tax Certificate", url: addData.communityTaxCertificate });
            if (addData.negativePSA) lcrDocs.push({ label: "Negative Certification from PSA", url: addData.negativePSA });
            if (addData.colb) lcrDocs.push({ label: "Certificate of Live Birth (COLB)", url: addData.colb });
            if (addData.affidavitDelayed) lcrDocs.push({ label: "Affidavit of Delayed Registration", url: addData.affidavitDelayed });

            // Marriage Registration
            if (addData.marriageCert) lcrDocs.push({ label: "Accomplished Certificate of Marriage", url: addData.marriageCert });
            if (addData.psaNeg) lcrDocs.push({ label: "Negative Certificate from PSA", url: addData.psaNeg });
            if (addData.affidavitDelay) lcrDocs.push({ label: "Affidavit of Delayed Registration", url: addData.affidavitDelay });
            if (addData.marriageLicense) lcrDocs.push({ label: "Certified Copy of Marriage License", url: addData.marriageLicense });

            // Shared LCR IDs
            const idFront = addData.validIdFront || addData.validIdFrontUrl || addData.idFrontUrl || residentIdFront || request?.user?.residentProfile?.idFrontUrl;
            const idBack = addData.validIdBack || addData.validIdBackUrl || addData.idBackUrl || residentIdBack || request?.user?.residentProfile?.idBackUrl;
            if (idFront) {
                lcrDocs.push({ label: "Valid ID (Front)", url: idFront });
            }
            if (idBack) {
                lcrDocs.push({ label: "Valid ID (Back)", url: idBack });
            }
            if (addData.validIdUrl) {
                lcrDocs.push({ label: "Identity Matrix", url: addData.validIdUrl });
            }
            return lcrDocs.filter(d => !!d.url) as { label: string; url: string }[];
        }

        const docs = isBusinessPermit
            ? [
                { label: "Owner's Valid ID", url: addData.ownerIdUrl },
                { label: "Cedula (CTC) Copy", url: addData.ctcUrl },
                { label: "DTI / SEC Registry", url: addData.dtiSecUrl },
                { label: "Barangay Clearance", url: addData.brgyClearanceUrl },
                { label: "Location Photo", url: addData.locationPhotoUrl },
                { label: "Sanitary Permit", url: addData.sanitaryPermitUrl },
                { label: "Fire Safety Certificate", url: addData.fireSafetyUrl },
                { label: "BIR Certificate (COR)", url: addData.birCorUrl },
                { label: "Previous Business Permit", url: addData.previousPermitUrl },
            ]
            : [
                { label: "Valid ID", url: addData.validIdUrl },
                { label: request?.isStudent ? "Student Proof (Enrollment/COR)" : "Financial Evidence", url: addData.proofOfIncomeUrl },
            ];
        return docs.filter(d => !!d.url) as { label: string; url: string }[];
    }, [request, isBusinessPermit, isBuildingPermit, isCivilRegistry, residentIdFront, residentIdBack]);

    // Keyboard navigation for lightbox
    useEffect(() => {
        if (!lightboxOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setLightboxOpen(false);
            if (e.key === "ArrowRight") setLightboxIndex(i => Math.min(i + 1, documentList.length - 1));
            if (e.key === "ArrowLeft") setLightboxIndex(i => Math.max(i - 1, 0));
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [lightboxOpen, documentList.length]);

    // Keep unused variables/functions to avoid lint warnings while preserving future logic
    if (false as boolean) {
        console.log(
            isFinalizing,
            paymentProofPreview,
            handleFileChange,
            handleClearPaymentProof,
            handleFinalize
        );
    }

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Synchronizing Hub...</p>
            </div>
        );
    }

    return (
        <>
            <div
                className="min-h-screen bg-white dark:bg-[#0a0c10] pb-20"
                style={{ "--primary-theme": themeColor } as React.CSSProperties}
            >
                <div className="max-w-7xl mx-auto px-4 md:px-0 pt-4 md:pt-10 space-y-6 md:space-y-12">
                    {/* Breadcrumb section - Glassmorphic & Compact */}
                    <div className="sticky top-[64px] sm:top-[80px] md:static z-40 -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                        <Breadcrumb>
                            <BreadcrumbList className="bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/" className="flex items-center gap-2 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                            <Home className="w-3.5 h-3.5 mb-0.5" />
                                            Home
                                        </Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbLink asChild>
                                        <Link href="/user/services/requests" className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">Requests</Link>
                                    </BreadcrumbLink>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator />
                                <BreadcrumbItem>
                                    <BreadcrumbPage className="text-[9px] md:text-[10px] font-semibold uppercase tracking-widest text-primary italic max-w-[120px] truncate">Tracker</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                    </div>

                    {/* Header Section - Compact */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
                        <div className="space-y-2 md:space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0 transform -rotate-3">
                                    <Activity className="w-5 h-5 md:w-6 md:h-6" />
                                </div>
                                <div className="space-y-0.5 md:space-y-1">
                                    <h1 className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                                        {request.type?.name || "Request"} <span className="text-primary">Hub</span>
                                    </h1>
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            className={cn("px-3 py-1 text-[7px] md:text-[9px] font-semibold uppercase tracking-widest italic rounded-full border")}
                                            style={{
                                                backgroundColor: statusConfig?.color.includes("bg-primary") ? themeColor : undefined,
                                                borderColor: statusConfig?.color.includes("bg-primary") ? themeColor : undefined,
                                                color: statusConfig?.color.includes("bg-primary") ? "white" : undefined
                                            }}
                                        >
                                            {statusConfig?.label}
                                        </Badge>
                                        {isPermitNewReleasedOrDelivered && (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-[8px] md:text-[10px] font-semibold text-slate-400 uppercase tracking-widest opacity-80">
                                                <div className="flex items-center gap-1.5">
                                                    <span>Permit No: {request.businessPermit.permitNumber}</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(request.businessPermit.permitNumber);
                                                            setCopied(true);
                                                            toast.success("Permit number copied to clipboard!");
                                                            setTimeout(() => setCopied(false), 2000);
                                                        }}
                                                        className="p-0.5 hover:text-primary transition-all duration-200 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95"
                                                        title="Copy Permit Number"
                                                    >
                                                        {copied ? (
                                                            <Check className="w-3 h-3 md:w-3.5 md:h-3.5 text-emerald-500 animate-in zoom-in duration-200" />
                                                        ) : (
                                                            <Copy className="w-3 h-3 md:w-3.5 md:h-3.5 transition-transform duration-200" />
                                                        )}
                                                    </button>
                                                </div>
                                                {additionalData.stickerNumber && (
                                                    <span className="text-primary font-extrabold bg-primary/10 px-2 py-0.5 rounded-full">Sticker No: {additionalData.stickerNumber}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>



                    {isActionable && !request.isCancelled ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
                            {/* Treasury Card */}
                            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28 h-fit">
                                <Card className="p-6 md:p-10 border-none bg-slate-950 text-white shadow-2xl rounded-2xl md:rounded-[2.5rem] overflow-hidden relative group">
                                    <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                                        <Calculator className="w-32 h-32 md:w-48 md:h-48" />
                                    </div>
                                    <div className="relative z-10 space-y-6 md:space-y-10">
                                        <div
                                            className="flex justify-between items-center cursor-pointer select-none"
                                            onClick={() => setIsTreasuryOpen(!isTreasuryOpen)}
                                        >
                                            <div className="space-y-2 min-w-0 pr-4">
                                                <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-primary italic flex items-center gap-2">
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    Treasury Protocol
                                                </h3>
                                                <p className="text-[10px] md:text-sm text-slate-400 font-medium italic leading-relaxed truncate">Evaluation complete. Secure your issuance below.</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {!isTreasuryOpen && (
                                                    <div className="text-right animate-in fade-in zoom-in-95 duration-200">
                                                        <p className="text-[8px] font-black uppercase text-emerald-400 tracking-wider italic leading-none">Total Amount</p>
                                                        <p className="text-sm md:text-base font-black italic tracking-tighter text-white mt-1 leading-none">
                                                            ₱{computation?.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="w-8 h-8 rounded-full hover:bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-white transition-all shrink-0">
                                                    {isTreasuryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                </div>
                                            </div>
                                        </div>
                                        {isTreasuryOpen && (
                                            <div className="space-y-4 md:space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {/* Miscellaneous Fee for Civil Registry requests */}
                                                {computation?.miscFee !== undefined && (
                                                    <div className="flex justify-between items-end pb-3 border-b border-white/5">
                                                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Miscellaneous Fee</span>
                                                        <span className="text-lg md:text-2xl font-black italic">₱{computation.miscFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}

                                                {/* Structured Line Items (Additional fees or itemized breakdown) */}
                                                {computation?.lineItems && computation.lineItems.length > 0 && (
                                                    computation.lineItems.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-end pb-3 border-b border-white/5">
                                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 italic">{item.label}</span>
                                                            <span className="text-lg md:text-2xl font-black italic">₱{(Number(item.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    ))
                                                )}

                                                {/* Basic & Additional Taxes for non-BPLO / non-itemized defaults */}
                                                {(!isBusinessPermit && !isBuildingPermit) && (
                                                    <>
                                                        {computation && computation.basicTax > 0 && (
                                                            <div className="flex justify-between items-end pb-3 border-b border-white/5">
                                                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Basic Tax</span>
                                                                <span className="text-lg md:text-2xl font-black italic">₱{computation.basicTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        )}
                                                        {computation && computation.additionalTax > 0 && (
                                                            <div className="flex justify-between items-end pb-3 border-b border-white/5">
                                                                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 italic">Additional Tax</span>
                                                                <span className="text-lg md:text-2xl font-black italic">₱{computation.additionalTax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {computation && computation.penaltyAmount > 0 && (
                                                    <div className="flex justify-between items-end pb-3 border-b border-white/5 text-orange-500">
                                                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest italic">Penalty</span>
                                                        <span className="text-lg md:text-2xl font-black italic">₱{computation.penaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                                {localFulfillment === "DELIVERY" && (
                                                    <div className="flex justify-between items-end pb-3 border-b border-white/5 text-emerald-400">
                                                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest italic">Delivery Service</span>
                                                        <span className="text-lg md:text-2xl font-black italic">₱{computation?.deliveryFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                )}
                                                <div className="pt-4 md:pt-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2 md:gap-4">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] md:text-[11px] font-black uppercase text-emerald-400 tracking-[0.3em] italic leading-none">Total Amount</p>
                                                        <p className="text-[7px] md:text-[9px] font-bold text-white/20 uppercase italic">Payable via Channel</p>
                                                    </div>
                                                    <span className="text-lg md:text-2xl font-black italic tracking-tighter text-white truncate min-w-0">₱{computation?.finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* Configuration Column */}
                            <div className="lg:col-span-7 space-y-6 md:space-y-10">
                                <div className="bg-white dark:bg-[#0d0f14] rounded-2xl md:rounded-[2.5rem] border border-slate-200 dark:border-white/5 p-5 md:p-10 shadow-2xl space-y-8 md:space-y-12">
                                    {/* Treasury Rejection Remarks Notice */}
                                    {request?.status === "UNPAID" && request?.rejectionRemarks && (
                                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-500 animate-in fade-in duration-300">
                                            <AlertCircle className="w-5 h-5 shrink-0 animate-pulse mt-0.5" />
                                            <div className="text-left space-y-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider italic">Treasury Revision Requested</p>
                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                    &ldquo;{request.rejectionRemarks}&rdquo;
                                                </p>
                                                <p className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 tracking-widest italic pt-1">
                                                    Please review the details, replace the GCash Reference/Proof of payment below, and resubmit.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Logistics Selection */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Truck className="w-5 h-5" /></div>
                                            <h3 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">Deployment Strategy</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                                            {[
                                                { id: "PICK_UP", label: "Office Pickup", icon: Building2 },
                                                { id: "DELIVERY", label: "Home Delivery", icon: Truck }
                                            ].map(opt => (
                                                <button key={opt.id} onClick={() => {
                                                    setLocalFulfillment(opt.id as any);
                                                    if (opt.id === "PICK_UP") setLocalPayment("E_PAYMENT");
                                                    else setLocalPayment("E_PAYMENT");
                                                }} className={cn("flex flex-col items-center gap-3 md:gap-4 p-5 md:p-8 rounded-2xl md:rounded-[2rem] border-2 transition-all relative group text-center active:scale-95", localFulfillment === opt.id ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-white dark:bg-white/5 border-slate-100 dark:border-white/5 hover:border-primary/30")}>
                                                    <opt.icon className="w-6 h-6 md:w-8 md:h-8" />
                                                    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest italic">{opt.label}</span>
                                                    {localFulfillment === opt.id && <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-950"><Check className="w-3 h-3 text-white" /></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <AnimatePresence mode="wait">
                                        {localFulfillment === "DELIVERY" && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8 pt-8 border-t border-slate-100 dark:border-white/5">
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                                                    <div className="space-y-2">
                                                        <Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Barangay Matrix</Label>
                                                        <div className="relative">
                                                            <button type="button" onClick={() => setIsBrgyOpen(!isBrgyOpen)} className="h-10 md:h-12 w-full px-4 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-left text-[10px] md:text-sm flex items-center justify-between group">
                                                                <span className={cn(address.barangay ? "text-slate-900 dark:text-white" : "text-slate-400")}>{address.barangay || "Select Area"}</span>
                                                                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                                                            </button>
                                                            <AnimatePresence>
                                                                {isBrgyOpen && (
                                                                    <>
                                                                        <div className="fixed inset-0 z-[60]" onClick={() => setIsBrgyOpen(false)} />
                                                                        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }} className="absolute top-12 left-0 right-0 bg-white dark:bg-[#12141a] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden">
                                                                            <div className="p-2 border-b border-slate-100 dark:border-white/5">
                                                                                <Input placeholder="Search..." value={brgySearch} onChange={(e) => setBrgySearch(e.target.value)} className="h-8 text-[10px] font-bold italic bg-slate-50 dark:bg-black/20" autoFocus />
                                                                            </div>
                                                                            <div className="max-h-[200px] overflow-y-auto p-1 custom-scrollbar">
                                                                                {availableBarangays.filter(b => b.name.toLowerCase().includes(brgySearch.toLowerCase())).map(b => (
                                                                                    <button key={b.name} onClick={() => { setAddress(p => ({ ...p, barangay: b.name })); setIsBrgyOpen(false); setBrgySearch(""); }} className={cn("w-full text-left px-3 py-2.5 rounded-lg text-[9px] font-black uppercase italic tracking-widest transition-all", address.barangay === b.name ? "bg-primary text-white" : "hover:bg-slate-50 dark:hover:bg-white/5")}>{b.name}</button>
                                                                                ))}
                                                                            </div>
                                                                        </motion.div>
                                                                    </>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2"><Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">House #</Label><Input value={address.houseNumber} onChange={e => setAddress(p => ({ ...p, houseNumber: e.target.value }))} className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-[10px] md:text-sm" /></div>
                                                    <div className="space-y-2"><Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Street</Label><Input value={address.street} onChange={e => setAddress(p => ({ ...p, street: e.target.value }))} className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-[10px] md:text-sm" /></div>
                                                    <div className="space-y-2"><Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Sitio</Label><Input value={address.sitio} onChange={e => setAddress(p => ({ ...p, sitio: e.target.value }))} className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-[10px] md:text-sm" /></div>
                                                    <div className="space-y-2"><Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Purok</Label><Input value={address.purok} onChange={e => setAddress(p => ({ ...p, purok: e.target.value }))} className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-[10px] md:text-sm" /></div>
                                                    <div className="space-y-2"><Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Municipality</Label><Input value={address.municipality} onChange={e => setAddress(p => ({ ...p, municipality: e.target.value }))} className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-[10px] md:text-sm" /></div>
                                                    <div className="col-span-2 md:col-span-1 space-y-2"><Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Province</Label><Input value={address.province} onChange={e => setAddress(p => ({ ...p, province: e.target.value }))} className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-[10px] md:text-sm" /></div>
                                                    <div className="col-span-2 md:col-span-2 space-y-2"><Label className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1">Landmark / Instructions</Label><Input value={address.landmark} onChange={e => setAddress(p => ({ ...p, landmark: e.target.value }))} className="h-10 md:h-12 bg-slate-50 dark:bg-black/20 rounded-xl font-bold italic text-[10px] md:text-sm" /></div>
                                                </div>
                                                <div className="h-[250px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative shadow-inner">
                                                    <div className="h-[250px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative shadow-inner">
                                                        {localLat != null && localLng != null ? (
                                                            <LocationPicker lat={localLat} lng={localLng} onChange={(lat, lng) => { setLocalLat(lat); setLocalLng(lng); }} />
                                                        ) : (
                                                            <LocationPicker lat={16.026} lng={120.454} onChange={(lat, lng) => { setLocalLat(lat); setLocalLng(lng); }} />
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Payment Selection */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><CreditCard className="w-5 h-5" /></div>
                                            <h3 className="text-lg md:text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">Payment</h3>
                                        </div>
                                        {isFreeDeathRegPickUp ? (
                                            <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                                <div className="p-6 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed italic">
                                                        This timely registration request is free of charge under Office Pickup strategy. No payment required.
                                                    </p>
                                                </div>
                                                <div className="mt-4">
                                                    <Button
                                                        onClick={handleFinalize}
                                                        disabled={isFinalizing}
                                                        className="w-full h-12 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl flex items-center justify-center gap-2"
                                                        style={{ backgroundColor: themeColor }}
                                                    >
                                                        {isFinalizing ? (
                                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        ) : null}
                                                        SUBMIT AND FINALIZE REQUEST
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            (localPayment === "E_PAYMENT" || localPayment === "BANK_TRANSFER") && (
                                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                                                        {[
                                                            { id: "gcash", label: "GCash Wallet", desc: "GCash E-Wallet", icon: Wallet },
                                                            { id: "qrph", label: "QRPH Scan", desc: "Maya, BPI, GCash", icon: QrCode },
                                                            { id: "dob", label: "Direct Banking", desc: "UnionBank / BPI", icon: Building2 }
                                                        ].map(method => (
                                                            <button
                                                                key={method.id}
                                                                type="button"
                                                                onClick={() => setSelectedPaymongoMethod(method.id as any)}
                                                                className={cn(
                                                                    "flex flex-col items-center justify-center gap-3 p-5 md:p-6 rounded-2xl border-2 transition-all relative group text-center active:scale-95",
                                                                    selectedPaymongoMethod === method.id
                                                                        ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-xl"
                                                                        : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-primary/30"
                                                                )}
                                                            >
                                                                <method.icon className={cn("w-6 h-6 md:w-8 md:h-8 transition-colors", selectedPaymongoMethod === method.id ? "text-primary dark:text-primary" : "text-slate-400 group-hover:text-primary")} />
                                                                <div className="space-y-1">
                                                                    <span className="block text-[8px] md:text-[10px] font-black uppercase tracking-widest italic leading-none">{method.label}</span>
                                                                    <span className="block text-[6px] md:text-[7px] font-bold opacity-60 uppercase tracking-wider leading-none mt-1">{method.desc}</span>
                                                                </div>
                                                                {selectedPaymongoMethod === method.id && (
                                                                    <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-950">
                                                                        <Check className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    <div className="mt-4">
                                                        <PaymongoCheckoutButton
                                                            amount={computation?.finalTotal ?? Number(request?.totalAmount) ?? 0}
                                                            type={selectedPaymongoMethod}
                                                            label={`Proceed to secure ${selectedPaymongoMethod.toUpperCase()} checkout (₱${((computation?.finalTotal ?? Number(request?.totalAmount) ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })})`}
                                                            transactionId={request?.id || id}
                                                            onBeforeCheckout={handleSaveLogisticsForPaymongo}
                                                            className="w-full h-12 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[9px] md:text-[10px] rounded-xl"
                                                            style={{ backgroundColor: themeColor }}
                                                        />
                                                    </div>

                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Tabs defaultValue="overview" className="space-y-8 md:space-y-12">
                            <TabsList className="bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-[1.25rem] md:rounded-[1.5rem] h-auto md:h-16 w-full md:w-fit border border-slate-200 dark:border-white/10 shadow-inner flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                                <TabsTrigger value="overview" className="flex-1 md:flex-none rounded-xl md:rounded-[1rem] px-5 md:px-10 py-3 md:py-0 h-full font-black text-[8px] md:text-[10px] uppercase tracking-widest italic data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Overview</TabsTrigger>
                                <TabsTrigger value="records" className="flex-1 md:flex-none rounded-xl md:rounded-[1rem] px-5 md:px-10 py-3 md:py-0 h-full font-black text-[8px] md:text-[10px] uppercase tracking-widest italic data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Records</TabsTrigger>
                                <TabsTrigger value="logistics" className="flex-1 md:flex-none rounded-xl md:rounded-[1rem] px-5 md:px-10 py-3 md:py-0 h-full font-black text-[8px] md:text-[10px] uppercase tracking-widest italic data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md transition-all">Logistics</TabsTrigger>
                            </TabsList>

                            <TabsContent value="overview" className="mt-0 space-y-3 md:space-y-4">
                                {(((isBusinessPermit && request.status === "FOR_INSPECTION") || (isCedula && request.status === "FOR_REQUESTING")) && !request.isCancelled) && (
                                    <div className="w-full flex justify-end animate-in fade-in duration-300">
                                        <button
                                            id="cancel-request-btn"
                                            onClick={() => setCancelConfirmOpen(true)}
                                            disabled={isCancelling}
                                            className="w-full md:w-auto px-10 h-12 bg-red-600 hover:bg-red-700 text-white font-black italic uppercase tracking-widest text-[10px] rounded-xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-red-600/10"
                                        >
                                            {isCancelling ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <span>Cancel Request</span>
                                            )}
                                        </button>
                                        <CancelRequestModal
                                            isOpen={cancelConfirmOpen}
                                            onOpenChange={setCancelConfirmOpen}
                                            onConfirm={handleCancel}
                                            isCancelling={isCancelling}
                                            serviceName={isBusinessPermit ? "Business Permit" : "Cedula"}
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-10 items-start">
                                    <Card className="p-6 md:p-10 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-xl rounded-2xl md:rounded-3xl lg:col-span-4 relative overflow-hidden h-fit">
                                        <div className="absolute top-0 right-0 p-8 opacity-5"><FileText className="w-32 h-32" /></div>
                                        <div className="relative z-10 space-y-12">
                                            {/* Decision matrix / Evaluated details for revision requests */}
                                            {request.status === "FOR_REVISION" && (
                                                <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5">
                                                    <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-4 text-amber-500">
                                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                                                        <div className="text-left space-y-1">
                                                            <p className="text-[10px] font-black uppercase tracking-wider italic">Revision Required (Revisions Left: {remainingRevisions})</p>
                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                                                                &ldquo;{request.rejectionRemarks || "Information is incomplete or inconsistent. Please review files."}&rdquo;
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {remainingRevisions > 0 ? (
                                                        isCedula || isLcrDeathReg ? (
                                                            <div className="space-y-4">
                                                                <Button
                                                                    asChild
                                                                    className="w-full h-12 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all duration-200 active:scale-95 border-none"
                                                                    style={{ backgroundColor: themeColor }}
                                                                >
                                                                    <Link href={isCedula ? `/user/services/cedula?revisionId=${request.id}` : `/user/services/civil-registry/death-registration?revisionId=${request.id}`}>
                                                                        Revise Application
                                                                    </Link>
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Upload Revisions</p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                                    {documentList.map((doc, idx) => {
                                                                        // Get file input key based on document label matching
                                                                        const labelKeyMap: { [key: string]: string } = {
                                                                            "Owner's Valid ID": "ownerId",
                                                                            "Cedula (CTC) Copy": "ctc",
                                                                            "DTI / SEC Registry": "dtiSec",
                                                                            "Barangay Clearance": "brgyClearance",
                                                                            "Location Photo": "locationPhoto",
                                                                            "Sanitary Permit": "sanitary",
                                                                            "Fire Safety Certificate": "fireSafety",
                                                                            "BIR Certificate (COR)": "birCor",
                                                                            "Previous Business Permit": "previousPermit",
                                                                            "Identity Matrix": "validId",
                                                                            "Financial Evidence": "proofOfIncome",
                                                                            "Municipal Form No. 103": "municipalForm103",
                                                                            "PSA Negative Certification": "psaNegative",
                                                                            "Affidavit of Delayed Registration": "affidavitOfDelay",
                                                                            "Municipal Form 102": "municipalForm102",
                                                                            "Marriage Certificate of Parents": "marriageCertificate",
                                                                            "Community Tax Certificate": "communityTaxCertificate",
                                                                            "Negative Certification from PSA": "negativePSA",
                                                                            "Certificate of Live Birth (COLB)": "colb",
                                                                            "Accomplished Certificate of Marriage": "marriageCert",
                                                                            "Negative Certificate from PSA (Marriage)": "psaNeg",
                                                                            "Certified Copy of Marriage License": "marriageLicense",
                                                                            "Valid ID (Front)": "validIdFront",
                                                                            "Valid ID (Back)": "validIdBack"
                                                                        };
                                                                        const fileKey = labelKeyMap[doc.label] || `doc_${idx}`;
                                                                        return (
                                                                            <div key={idx} className="p-4 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-2xl space-y-3">
                                                                                <span className="text-[9px] font-black uppercase text-slate-500 block truncate">{doc.label}</span>
                                                                                <Label htmlFor={`rev-${fileKey}`} className="flex items-center justify-center gap-2 h-10 border border-dashed border-slate-200 dark:border-white/10 rounded-xl text-[8px] font-black uppercase tracking-widest cursor-pointer hover:border-primary/50 transition-colors">
                                                                                    <Upload className="w-3.5 h-3.5" />
                                                                                    {revisionFiles[fileKey] ? "Change File" : "Choose File"}
                                                                                </Label>
                                                                                <input
                                                                                    id={`rev-${fileKey}`}
                                                                                    type="file"
                                                                                    className="hidden"
                                                                                    onChange={(e) => {
                                                                                        const file = e.target.files?.[0];
                                                                                        if (file) handleRevisionFile(fileKey, file);
                                                                                    }}
                                                                                />
                                                                                {revisionFiles[fileKey] && (
                                                                                    <span className="text-[8px] font-bold text-slate-400 block truncate">{revisionFiles[fileKey]?.name}</span>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                                <Button
                                                                    onClick={handleResubmit}
                                                                    disabled={isResubmitting || Object.values(revisionFiles).every(f => f === null)}
                                                                    className="w-full h-12 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 transition-all duration-200 active:scale-95"
                                                                    style={{ backgroundColor: themeColor }}
                                                                >
                                                                    {isResubmitting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                                                                    RESUBMIT TRANSACTION
                                                                </Button>
                                                            </div>
                                                        )
                                                    ) : (
                                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                                            <p className="text-xs font-bold text-red-500 italic">No revisions remaining. Please contact the administrator for further assistance.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isLcrBirth && (
                                                <BirthCertificateRequestDetails additionalData={additionalData} />
                                            )}
                                            {isLcrDeathCert && (
                                                <DeathCertificateRequestDetails additionalData={additionalData} />
                                            )}
                                            {isLcrDeathReg && (
                                                <DeathRegistrationRequestDetails additionalData={additionalData} />
                                            )}
                                            {isLcrMarriage && (
                                                <MarriageCertificateRequestDetails additionalData={additionalData} />
                                            )}

                                            {request.type?.code.startsWith("BUSINESS_PERMIT") && (
                                                <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5">
                                                    <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">Business Information</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Official Business Name</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.businessName}</p></div>
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Trade Name</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.tradeName || "N/A"}</p></div>
                                                        {!isRenewal ? (
                                                            <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">DTI / SEC ID</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.dtiSecNumber || "N/A"}</p></div>
                                                        ) : (
                                                            <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Existing Permit No.</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.permitNumber || "N/A"}</p></div>
                                                        )}
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Line of Business</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.lineOfBusiness}</p></div>
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Business Barangay</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.barangay}</p></div>
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Employee Count</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.employeeCount ?? 0}</p></div>
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Store Area (sqm)</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.businessArea ? `${additionalData.businessArea} sqm` : "N/A"}</p></div>
                                                    </div>
                                                </div>
                                            )}
                                            {isBuildingPermit && (
                                                <div className="space-y-6 pb-8 border-b border-slate-100 dark:border-white/5">
                                                    <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">Building Information</h4>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Occupancy Use</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.occupancyUse}</p></div>
                                                        <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Estimated Cost</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">₱{Number(additionalData.estimatedCost || 0).toLocaleString()}</p></div>
                                                        <div className="space-y-1 col-span-2"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Description of Work</p><p className="text-xs md:text-sm font-bold italic uppercase text-slate-900 dark:text-white leading-tight">{additionalData.descriptionOfWork}</p></div>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
                                                <div className="space-y-10">
                                                    <div className="space-y-6">
                                                        <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">Personal Identity</h4>
                                                        <div className="grid grid-cols-2 gap-6 md:gap-8">
                                                            <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Name</p><p className="text-xs md:text-lg font-bold italic truncate">{residentData.firstName} {residentData.lastName}</p></div>
                                                            <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Birth Date</p><p className="text-xs md:text-lg font-bold italic">{residentData.dateOfBirth && !isNaN(new Date(residentData.dateOfBirth).getTime()) ? format(new Date(residentData.dateOfBirth), "MMM d, yyyy") : "N/A"}</p></div>
                                                            <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Civil Status</p><p className="text-xs md:text-lg font-bold italic uppercase">{residentData.civilStatus || "Single"}</p></div>
                                                            <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Citizenship</p><p className="text-xs md:text-lg font-bold italic uppercase">{residentData.citizenship || "Filipino"}</p></div>
                                                        </div>
                                                    </div>
                                                    {!isCivilRegistry && (
                                                        <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-white/5">
                                                            <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">
                                                                {request.isStudent ? "Student Status" : "Financial Declarations"}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-6 md:gap-8">
                                                                {request.type?.code.startsWith("BUSINESS_PERMIT") ? (
                                                                    <>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">
                                                                                {additionalData.businessType === "NEW" ? "Capital Investment" : "Annual Gross Sales"}
                                                                            </p>
                                                                            <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-white italic">
                                                                                ₱{(additionalData.capitalInvestment || additionalData.grossSales || 0).toLocaleString()}
                                                                            </p>
                                                                        </div>
                                                                        {request.businessPermit?.expiryDate && (
                                                                            <div className="space-y-1">
                                                                                <p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Validity Mandate</p>
                                                                                <p className="text-lg md:text-2xl font-black text-primary italic uppercase leading-none">
                                                                                    Expires {format(new Date(request.businessPermit.expiryDate), "MMM d, yyyy")}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : request.isStudent ? (
                                                                    <>
                                                                        <div className="space-y-1">
                                                                            {/* <p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Application Pathway</p> */}
                                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20 shrink-0 w-fit mt-1 italic shadow-sm">
                                                                                🎓 Student Request
                                                                            </span>
                                                                        </div>
                                                                        {request.cedula?.expiryDate && (
                                                                            <div className="space-y-1">
                                                                                <p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Validity Mandate</p>
                                                                                <p className="text-lg md:text-2xl font-black text-primary italic uppercase leading-none">
                                                                                    Expires {format(new Date(request.cedula.expiryDate), "MMM d")}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div className="space-y-1">
                                                                            <p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Annual Gross Income</p>
                                                                            <p className="text-lg md:text-2xl font-black text-slate-900 dark:text-white italic">
                                                                                ₱{(additionalData.income || 0).toLocaleString()}
                                                                            </p>
                                                                        </div>
                                                                        {request.cedula?.expiryDate && (
                                                                            <div className="space-y-1">
                                                                                <p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Validity Mandate</p>
                                                                                <p className="text-lg md:text-2xl font-black text-primary italic uppercase leading-none">
                                                                                    Expires {format(new Date(request.cedula.expiryDate), "MMM d")}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="space-y-6">
                                                    <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">Registered Address</h4>
                                                    <div className="bg-slate-50 dark:bg-white/5 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 relative overflow-hidden">
                                                        <MapPin className="absolute top-4 right-4 w-12 h-12 text-primary/10" />
                                                        <div className="relative z-10 space-y-6">
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">House / Street</p><p className="text-[11px] md:text-md font-bold italic leading-tight uppercase">{residentData.houseNumber} {residentData.street}</p></div>
                                                                <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Sitio / Purok</p><p className="text-[11px] md:text-md font-bold italic leading-tight uppercase">{residentData.sitio} {residentData.purok}</p></div>
                                                            </div>
                                                            <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-black text-slate-400 leading-none">Barangay Matrix</p><p className="text-[11px] md:text-md font-bold italic leading-tight uppercase">{residentData.barangay}, Mapandan</p></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            </TabsContent>

                            <TabsContent value="logistics" className="mt-0 space-y-6 md:space-y-10">
                                {request.disputeRemarks && request.status !== 'DELIVERED' && request.status !== 'RELEASED' && (
                                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                                        <Card className="p-6 md:p-10 border border-primary/20 shadow-xl rounded-2xl md:rounded-[2.5rem] relative overflow-hidden" style={{ borderColor: `${themeColor}20`, backgroundColor: `${themeColor}05` }}>
                                            <div className="absolute top-0 right-0 p-6 opacity-10" style={{ color: themeColor }}><AlertCircle className="w-12 h-12" /></div>
                                            <div className="relative z-10 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl text-white shadow-lg" style={{ backgroundColor: themeColor }}><Info className="w-4 h-4" /></div>
                                                    <h3 className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] italic" style={{ color: themeColor }}>Dispute Resolution Matrix</h3>
                                                </div>
                                                <div className="p-5 bg-white/50 dark:bg-black/20 rounded-xl border italic font-bold text-xs md:text-sm text-slate-700 dark:text-slate-200" style={{ borderColor: `${themeColor}20` }}>{request.disputeRemarks}</div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
                                    <div className="space-y-6">
                                        <h4 className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-primary italic border-l-4 border-primary pl-4">Requirements</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {documentList.length > 0 ? documentList.map((doc, i) => {
                                                const isPdf = checkIsPdf(doc.url);
                                                if (isPdf) {
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleViewFile(doc.url, doc.label)}
                                                            className="relative aspect-[16/9] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden group/doc hover:shadow-xl transition-all w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 hover:border-red-500/50"
                                                        >
                                                            <FileText className="w-8 h-8 text-red-500 group-hover/doc:scale-110 transition-transform duration-300 animate-pulse" />
                                                            <span className="text-[7px] font-black uppercase text-red-500/70 tracking-wider mt-1">View PDF Document</span>
                                                            <div className="absolute bottom-2 left-2 right-2">
                                                                <Badge className="text-[7px] bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white border-none font-black italic tracking-widest uppercase w-full block text-center py-0.5 truncate">{doc.label}</Badge>
                                                            </div>
                                                        </button>
                                                    );
                                                }
                                                return (
                                                    <button
                                                        key={i}
                                                        onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                                                        className="relative aspect-[16/9] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden group/doc hover:shadow-xl transition-all w-full text-left"
                                                    >
                                                        <Image src={doc.url} alt={doc.label} fill className="object-cover transition-transform group-hover/doc:scale-110 duration-700" unoptimized />
                                                        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/doc:opacity-100 transition-all duration-300 flex items-center justify-center gap-2">
                                                            <div
                                                                style={{ backgroundColor: themeColor }}
                                                                className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] scale-75 group-hover/doc:scale-100 transition-transform duration-300"
                                                            >
                                                                <span>View</span>
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-2 left-2 right-2">
                                                            <Badge className="text-[7px] bg-white/95 dark:bg-slate-950/95 text-slate-900 dark:text-white border-none font-black italic tracking-widest uppercase w-full block text-center py-0.5 truncate">{doc.label}</Badge>
                                                        </div>
                                                    </button>
                                                );
                                            }) : (
                                                <div className="col-span-1 sm:col-span-2 py-10 flex flex-col items-center justify-center text-slate-300 dark:text-white/20">
                                                    <FileText className="w-8 h-8 mb-2 opacity-30" />
                                                    <p className="text-[9px] font-black uppercase tracking-widest italic">No documents uploaded</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Payment Proof Card - Visible only when paymentReference is an uploaded file URL and OR is not yet uploaded */}
                                        {paymentProofUrl && !(request.orUrl || additionalData.orDocumentUrl) && (
                                            <div className="bg-slate-950 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><Wallet className="w-24 h-24" /></div>
                                                <div className="relative z-10 space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><Wallet className="w-5 h-5 text-white" /></div>
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase text-primary tracking-widest italic opacity-70 leading-none">Payment Verification</p>
                                                            <p className="text-xs font-bold italic tracking-tight uppercase leading-none mt-1">Proof of Payment</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Button
                                                            onClick={async () => {
                                                                if (!paymentProofUrl) return;
                                                                try {
                                                                    const response = await fetch(paymentProofUrl);
                                                                    const font = await response.blob();
                                                                    const url = window.URL.createObjectURL(font);
                                                                    const link = document.createElement("a");
                                                                    link.href = url;
                                                                    const ext = font.type.includes("pdf") ? "pdf" : "png";
                                                                    link.download = `Payment_Proof_${id.slice(-6).toUpperCase()}.${ext}`;
                                                                    document.body.appendChild(link);
                                                                    link.click();
                                                                    document.body.removeChild(link);
                                                                    window.URL.revokeObjectURL(url);
                                                                    toast.success("Payment proof downloaded!");
                                                                } catch {
                                                                    toast.error("Download failed. Try opening in a new tab.");
                                                                }
                                                            }}
                                                            className="h-12 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                if (paymentProofUrl) {
                                                                    handleViewFile(paymentProofUrl, "Proof of Payment");
                                                                }
                                                            }}
                                                            variant="outline"
                                                            className="h-12 border-white/20 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-white/10 bg-transparent"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Preview
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {!paymentProofUrl && paymentReferenceNumber && (
                                            <div className="bg-white dark:bg-white/[0.03] p-5 md:p-6 rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                                        <Hash className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[8px] font-black uppercase text-primary tracking-widest italic opacity-70 leading-none">Payment Reference</p>
                                                        <p className="text-xs font-bold italic tracking-tight uppercase leading-none mt-1 text-slate-900 dark:text-white">Reference Number</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/10 p-3">
                                                    <p className="flex-1 min-w-0 font-mono text-xs md:text-sm font-black text-slate-800 dark:text-slate-100 truncate">
                                                        {paymentReferenceNumber}
                                                    </p>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        onClick={async () => {
                                                            await navigator.clipboard.writeText(String(paymentReferenceNumber));
                                                            setPaymentRefCopied(true);
                                                            toast.success("Payment reference copied!");
                                                            setTimeout(() => setPaymentRefCopied(false), 1800);
                                                        }}
                                                        className="h-10 w-10 rounded-xl shrink-0"
                                                        title="Copy Payment Reference"
                                                    >
                                                        {paymentRefCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Official Receipt (OR) Card - Visible in FOR_PROCESSING, FOR_REINSPECTION, FOR_CLAIM, FOR_PICKING, IN_ROUTE, RELEASED, or DELIVERED */}
                                        {["FOR_PROCESSING", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE", "RELEASED", "DELIVERED"].includes(request.status) &&
                                            (request.orUrl || additionalData.orDocumentUrl) && (
                                                <div className="bg-slate-950 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><ShieldCheck className="w-24 h-24" /></div>
                                                    <div className="relative z-10 space-y-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><CreditCard className="w-5 h-5 text-white" /></div>
                                                            <div>
                                                                <p className="text-[8px] font-black uppercase text-primary tracking-widest italic opacity-70 leading-none">Financial Record Secured</p>
                                                                <p className="text-xs font-bold italic tracking-tight uppercase leading-none mt-1">Official Receipt (OR)</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button
                                                                onClick={async () => {
                                                                    const orUrlToUse = request.orUrl || additionalData.orDocumentUrl;
                                                                    if (!orUrlToUse) return;
                                                                    try {
                                                                        const response = await fetch(orUrlToUse);
                                                                        const font = await response.blob();
                                                                        const url = window.URL.createObjectURL(font);
                                                                        const link = document.createElement("a");
                                                                        link.href = url;
                                                                        const ext = font.type.includes("pdf") ? "pdf" : "png";
                                                                        link.download = `Official_Receipt_${id.slice(-6).toUpperCase()}.${ext}`;
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                        window.URL.revokeObjectURL(url);
                                                                        toast.success("Receipt downloaded!");
                                                                    } catch {
                                                                        toast.error("Download failed. Try opening in a new tab.");
                                                                    }
                                                                }}
                                                                className="h-12 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Download
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    const orUrlToUse = request.orUrl || additionalData.orDocumentUrl;
                                                                    if (orUrlToUse) {
                                                                        handleViewFile(orUrlToUse, "Official Receipt");
                                                                    }
                                                                }}
                                                                variant="outline"
                                                                className="h-12 border-white/20 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-white/10 bg-transparent"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Preview
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        {isLcrBirth && ["RELEASED", "DELIVERED", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE"].includes(request.status) && (
                                            <BirthCertificateVerificationCard
                                                request={request}
                                                additionalData={additionalData}
                                                themeColor={themeColor}
                                                handleViewFile={handleViewFile}
                                            />
                                        )}

                                        {isLcrDeathCert && ["RELEASED", "DELIVERED", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE"].includes(request.status) && (
                                            <DeathCertificateVerificationCard
                                                request={request}
                                                additionalData={additionalData}
                                                themeColor={themeColor}
                                                handleViewFile={handleViewFile}
                                            />
                                        )}

                                        {isLcrDeathReg && ["RELEASED", "DELIVERED", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE"].includes(request.status) && (
                                            <DeathRegistrationVerificationCard
                                                request={request}
                                                additionalData={additionalData}
                                                themeColor={themeColor}
                                                handleViewFile={handleViewFile}
                                            />
                                        )}

                                        {isLcrMarriage && ["RELEASED", "DELIVERED", "FOR_REINSPECTION", "FOR_CLAIM", "FOR_PICKING", "IN_ROUTE"].includes(request.status) && (
                                            <MarriageCertificateVerificationCard
                                                request={request}
                                                additionalData={additionalData}
                                                themeColor={themeColor}
                                                handleViewFile={handleViewFile}
                                            />
                                        )}


                                        {isPsaEndorsement && (request.status === "RELEASED" || request.status === "DELIVERED") && (
                                            <div
                                                className="p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden group transition-all duration-300 hover:scale-[1.01] w-full text-left bg-white dark:bg-slate-900/40"
                                                style={{
                                                    borderColor: `${themeColor}20`,
                                                    boxShadow: `0 20px 25px -5px ${themeColor}10`
                                                }}
                                            >
                                                <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform duration-700">
                                                    <ShieldCheck className="w-24 h-24" style={{ color: themeColor }} />
                                                </div>
                                                <div className="relative z-10 space-y-6">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <div
                                                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                                                                style={{ backgroundColor: themeColor }}
                                                            >
                                                                <FileText className="w-5 h-5 text-white" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-black uppercase tracking-widest italic opacity-70 leading-none" style={{ color: themeColor }}>
                                                                    PSA Endorsement Protocol
                                                                </p>
                                                                <p className="text-xs md:text-sm font-black italic tracking-tight uppercase leading-none mt-1.5 text-slate-900 dark:text-white">
                                                                    Endorsement Transmitted to PSA
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge
                                                            className="text-[8px] font-black uppercase tracking-widest italic px-3 py-1 rounded-full text-white border-transparent"
                                                            style={{ backgroundColor: themeColor }}
                                                        >
                                                            TRANSMITTED
                                                        </Badge>
                                                    </div>

                                                    <div className="p-5 bg-[#f8fafd] dark:bg-[#121620]/60 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm space-y-4">
                                                        <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed italic">
                                                            The Municipal Civil Registrar has officially endorsed and transmitted your {isDeathPsaEndorsement ? "Form 2A" : "Form 1A"} to the Philippine Statistics Authority (PSA).
                                                        </p>
                                                        <div className="space-y-2 border-t border-slate-200/20 dark:border-white/5 pt-4">
                                                            <span className="text-[9px] font-black uppercase tracking-widest italic leading-none" style={{ color: themeColor }}>📝 Next Steps for the Applicant:</span>
                                                            <ul className="list-disc pl-5 text-xs text-slate-600 dark:text-slate-400 space-y-2 font-medium italic">
                                                                <li>Download or view your Endorsement Copy below to serve as your personal receiving proof.</li>
                                                                <li>Please wait 3 to 4 weeks to allow the PSA to successfully encode your forwarded records into their national database.</li>
                                                                <li>After the waiting period, you may directly request your PSA-Authenticated {isDeathPsaEndorsement ? "Death" : "Birth"} Certificate (SECPA) at any PSA Serbilis Center or online.</li>
                                                            </ul>
                                                        </div>
                                                    </div>

                                                    {request.eCopyUrl && (
                                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                                            <Button
                                                                onClick={handleECopyDownload}
                                                                className="h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                                                style={{
                                                                    backgroundColor: themeColor,
                                                                    boxShadow: `0 10px 20px -5px ${themeColor}30`
                                                                }}
                                                            >
                                                                <Download className="w-4 h-4" />
                                                                Download
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    if (request.eCopyUrl) {
                                                                        handleViewFile(request.eCopyUrl, isCedula ? "E-Copy of CEDULA" : "Official Document");
                                                                    }
                                                                }}
                                                                variant="outline"
                                                                className="h-12 border-slate-200 dark:border-white/10 text-slate-750 dark:text-slate-300 font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-slate-50 dark:hover:bg-white/5 bg-transparent"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Preview
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!isLcrBirth && !isLcrDeath && !isLcrMarriage && !isPsaEndorsement && (request.status === "RELEASED" || request.status === "DELIVERED") && (request.eCopyUrl || request.cedula?.documentUrl || request.businessPermit?.documentUrl) && (
                                            <div className="bg-slate-950 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><ShieldCheck className="w-24 h-24" /></div>
                                                <div className="relative z-10 space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-white" /></div>
                                                        <div>
                                                            <p className="text-[8px] font-black uppercase text-primary tracking-widest italic opacity-70 leading-none">Issuance Protocol Secured</p>
                                                            <p className="text-xs font-bold italic tracking-tight uppercase leading-none mt-1">Certified Official Document</p>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Button
                                                            onClick={handleECopyDownload}
                                                            className="h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                                            style={{
                                                                backgroundColor: themeColor,
                                                                boxShadow: `0 10px 20px -5px ${themeColor}30`
                                                            }}
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                const url = request.eCopyUrl || request.cedula?.documentUrl || request.businessPermit?.documentUrl;
                                                                if (url) {
                                                                    handleViewFile(url, isCedula ? "E-Copy of CEDULA" : "Official Document");
                                                                }
                                                            }}
                                                            variant="outline"
                                                            className="h-12 border-white/20 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-white/10 bg-transparent"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            Preview
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {isReportAllowed && (
                                            <div className="flex justify-end pt-4 md:pt-6">
                                                <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="link"
                                                            className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors italic shrink-0"
                                                        >
                                                            ⚠️ Report Concern / Request Dispute
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-[400px] w-full bg-slate-900 text-white border-none rounded-[2rem] shadow-2xl p-6 md:p-8 z-[150]">
                                                        <DialogHeader className="space-y-1">
                                                            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter text-white">Dispute <span className="text-red-500">Protocol</span></DialogTitle>
                                                            <DialogDescription className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Resolution & Audit System</DialogDescription>
                                                        </DialogHeader>
                                                        <div className="space-y-5 py-4">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Resolution Strategy</Label>
                                                                <div className="grid grid-cols-2 gap-3">
                                                                    {[
                                                                        { id: "RETURN", label: "Request Return" },
                                                                        { id: "REFUND", label: "Request Refund" }
                                                                    ].map(opt => (
                                                                        <button key={opt.id} type="button" onClick={() => setDisputeType(opt.id as any)} className={cn("h-11 rounded-xl font-black uppercase tracking-widest text-[9px] italic border-2 transition-all active:scale-95", disputeType === opt.id ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20" : "bg-transparent border-slate-800 text-slate-400 hover:border-slate-700")}>{opt.label}</button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Reason / Statement</Label>
                                                                <Textarea placeholder="PROVIDE COMPLETE STATEMENT FOR DISPUTE AUDIT..." value={disputeReason} onChange={e => setDisputeReason(e.target.value)} className="min-h-[100px] bg-slate-950 border-slate-800 rounded-xl focus:border-red-500 text-xs md:text-sm font-bold placeholder:text-slate-600 uppercase" />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Evidence / Proof File (Optional)</Label>
                                                                <div className="w-full aspect-[21/9] bg-slate-950 rounded-xl border border-dashed border-slate-800 flex items-center justify-center relative overflow-hidden group">
                                                                    {disputePreview ? (
                                                                        <>
                                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                            <img src={disputePreview} alt="Evidence preview" className="w-full h-full object-cover" />
                                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                <Button variant="secondary" size="sm" className="h-7 px-3 font-black italic uppercase text-[8px] tracking-widest rounded-lg relative overflow-hidden">
                                                                                    Change File
                                                                                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDisputeFileChange} />
                                                                                </Button>
                                                                            </div>
                                                                        </>
                                                                    ) : (
                                                                        <div className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900 transition-colors">
                                                                            <Upload className="w-5 h-5 text-slate-650 mb-1" />
                                                                            <p className="text-[9px] font-black uppercase text-slate-500 italic">Upload Evidence</p>
                                                                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleDisputeFileChange} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <DialogFooter className="pt-2">
                                                            <Button onClick={handleDispute} disabled={isDisputing || !disputeReason} className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all active:scale-95 gap-2 border-none shadow-xl shadow-red-600/10">
                                                                {isDisputing ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                                                                Submit Concern Statement
                                                            </Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>

            {/* Lightbox component - Elegant backdrop overlay */}
            <AnimatePresence>
                {lightboxOpen && documentList[lightboxIndex] && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[100] bg-black/96 flex flex-col select-none"
                        onClick={() => setLightboxOpen(false)}
                    >
                        {/* Top bar */}
                        <div className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 border-b border-white/10 shrink-0" onClick={e => e.stopPropagation()}>
                            <div className="space-y-0.5 min-w-0">
                                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                                    {lightboxIndex + 1} / {documentList.length}
                                </p>
                                <p className="text-sm md:text-base font-black uppercase tracking-tighter text-white italic truncate">
                                    {documentList[lightboxIndex].label}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-4">
                                <a
                                    href={documentList[lightboxIndex].url || null as any}
                                    download
                                    onClick={e => e.stopPropagation()}
                                    className="h-9 px-4 bg-white/10 hover:bg-primary/80 backdrop-blur-md rounded-xl text-white text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2 transition-all border border-white/10"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Download</span>
                                </a>
                                <a
                                    href={documentList[lightboxIndex].url || null as any}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="h-9 w-9 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white flex items-center justify-center transition-all border border-white/10"
                                    title="Open in new tab"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                    onClick={() => setLightboxOpen(false)}
                                    className="h-9 w-9 bg-white/10 hover:bg-red-500/80 backdrop-blur-md rounded-xl text-white flex items-center justify-center transition-all border border-white/10"
                                    title="Close (Esc)"
                                >
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Main image area */}
                        <div className="flex-1 flex items-center justify-center relative overflow-hidden px-16 md:px-24" onClick={e => e.stopPropagation()}>
                            {/* Prev arrow */}
                            {lightboxIndex > 0 && (
                                <button
                                    onClick={() => setLightboxIndex(i => i - 1)}
                                    className="absolute left-3 md:left-6 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10 active:scale-95"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                </button>
                            )}

                            {/* Image */}
                            <motion.div
                                key={lightboxIndex}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                transition={{ duration: 0.2 }}
                                className="relative flex items-center justify-center w-full max-h-[70vh]"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={documentList[lightboxIndex].url}
                                    alt={documentList[lightboxIndex].label}
                                    className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl"
                                    draggable={false}
                                />
                            </motion.div>

                            {/* Next arrow */}
                            {lightboxIndex < documentList.length - 1 && (
                                <button
                                    onClick={() => setLightboxIndex(i => i + 1)}
                                    className="absolute right-3 md:right-6 z-10 w-10 h-10 md:w-12 md:h-12 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10 active:scale-95"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            )}
                        </div>

                        {/* Thumbnail strip (only when multiple docs) */}
                        {documentList.length > 1 && (
                            <div className="shrink-0 px-4 py-4 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto" onClick={e => e.stopPropagation()}>
                                {documentList.map((doc, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setLightboxIndex(i)}
                                        className={cn(
                                            "w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 relative flex items-center justify-center bg-slate-100 dark:bg-slate-900",
                                            i === lightboxIndex
                                                ? "border-primary scale-110 shadow-lg shadow-primary/30"
                                                : "border-white/20 opacity-50 hover:opacity-80 hover:border-white/50"
                                        )}
                                    >
                                        {checkIsPdf(doc.url) ? (
                                            <FileText className="w-6 h-6 text-red-500" />
                                        ) : (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={doc.url} alt={doc.label} className="w-full h-full object-cover" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Document Viewer Modal for PDFs */}
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor={themeColor || "var(--primary-theme)"}
            />
        </>
    );
}
