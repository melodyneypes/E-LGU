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
    Camera,
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
import { calculateCedula } from "@/lib/cedula";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
function formatPHDate(date: string | Date): string {
    return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date));
}
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
    saveLogisticsDetails,
    requestPsaEndorsement
} from "@/app/admin/transactions/actions";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
    ssr: false,
    loading: () => <div className="h-[250px] w-full rounded-xl bg-white/5 animate-pulse flex items-center justify-center text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Initializing Grid Matrix...</div>
});

const getVerificationConfig = (formType: string) => {
    switch (formType) {
        case "FORM_1B":
            return {
                title: "Record Not Available (Form 1B)",
                description: "Your requested birth certificate record is not available in our archives.",
                badgeColor: "bg-amber-500 text-white border-transparent",
                themeColor: "#f59e0b",
                bgColor: "bg-amber-500/5 dark:bg-amber-500/10",
                borderColor: "border-amber-500/20 dark:border-amber-500/30",
                textColor: "text-amber-600 dark:text-amber-400",
                glowColor: "shadow-amber-500/10",
            };
        case "FORM_1C":
            return {
                title: "Record Destroyed (Form 1C)",
                description: "Your requested birth certificate record has been destroyed in our archives.",
                badgeColor: "bg-rose-500 text-white border-transparent",
                themeColor: "#f43f5e",
                bgColor: "bg-rose-500/5 dark:bg-rose-500/10",
                borderColor: "border-rose-500/20 dark:border-rose-500/30",
                textColor: "text-rose-600 dark:text-rose-400",
                glowColor: "shadow-rose-500/10",
            };
        case "FORM_2B":
            return {
                title: "Record Not Available (Form 2B)",
                description: "Your requested death certificate record is not available in our archives.",
                badgeColor: "bg-amber-500 text-white border-transparent",
                themeColor: "#f59e0b",
                bgColor: "bg-amber-500/5 dark:bg-amber-500/10",
                borderColor: "border-amber-500/20 dark:border-amber-500/30",
                textColor: "text-amber-600 dark:text-amber-400",
                glowColor: "shadow-amber-500/10",
            };
        case "FORM_2C":
            return {
                title: "Record Destroyed (Form 2C)",
                description: "Your requested death certificate record has been destroyed in our archives.",
                badgeColor: "bg-rose-500 text-white border-transparent",
                themeColor: "#f43f5e",
                bgColor: "bg-rose-500/5 dark:bg-rose-500/10",
                borderColor: "border-rose-500/20 dark:border-rose-500/30",
                textColor: "text-rose-600 dark:text-rose-400",
                glowColor: "shadow-rose-500/10",
            };
        case "FORM_2A":
            return {
                title: "Record Found (Form 2A)",
                description: "Your requested death certificate has been retrieved and certified.",
                badgeColor: "bg-emerald-500 text-white border-transparent",
                themeColor: "#10b981",
                bgColor: "bg-emerald-500/5 dark:bg-emerald-500/10",
                borderColor: "border-emerald-500/20 dark:border-emerald-500/30",
                textColor: "text-emerald-600 dark:text-emerald-400",
                glowColor: "shadow-emerald-500/10",
            };
        case "FORM_1A":
        default:
            return {
                title: "Record Found (Form 1A)",
                description: "Your requested birth certificate has been retrieved and certified.",
                badgeColor: "bg-emerald-500 text-white border-transparent",
                themeColor: "#10b981",
                bgColor: "bg-emerald-500/5 dark:bg-emerald-500/10",
                borderColor: "border-emerald-500/20 dark:border-emerald-500/30",
                textColor: "text-emerald-600 dark:text-emerald-400",
                glowColor: "shadow-emerald-500/10",
            };
    }
}

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

    // PSA Endorsement States
    const [psaEndorsementOpen, setPsaEndorsementOpen] = useState(false);
    const [psaNegFile, setPsaNegFile] = useState<File | null>(null);
    const [psaNegPreview, setPsaNegPreview] = useState<string | null>(null);
    const [isSubmittingPsaEndorsement, setIsSubmittingPsaEndorsement] = useState(false);

    // Dispute States
    const [disputeOpen, setDisputeOpen] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    const handleDisputeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setDisputeFile(file);
            setDisputePreview(URL.createObjectURL(file));
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

    const handleRevisionFile = (key: string, file: File | null) => {
        setRevisionFiles(prev => ({ ...prev, [key]: file }));
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

    const handlePsaEndorsementSubmit = async () => {
        if (!psaNegFile) {
            toast.error("Please upload the PSA Negative Certification document.");
            return;
        }
        setIsSubmittingPsaEndorsement(true);
        try {
            const formData = new FormData();
            formData.append("transactionId", id);
            formData.append("psaNegCertFile", psaNegFile);

            const res = await requestPsaEndorsement(formData);
            if (res.success) {
                toast.success("PSA Endorsement requested successfully!");
                setPsaEndorsementOpen(false);
                window.location.reload();
            } else {
                toast.error(res.error || "Failed to request PSA endorsement");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred during submission.");
        } finally {
            setIsSubmittingPsaEndorsement(false);
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
    const statusConfig = request ? getStatusConfig(request.status) : null;
    const typeCode = request?.type?.code || "";
    const isActionable = (request?.status === "EVALUATED" && (!typeCode.startsWith("BUILDING_PERMIT") || !!request.fiscalSnapshot)) || (request?.status === "UNPAID" && (typeCode.startsWith("BUSINESS_PERMIT") || typeCode.startsWith("CEDULA") || typeCode.startsWith("BUILDING_PERMIT")));
    const isBusinessPermit = typeCode.startsWith("BUSINESS_PERMIT");
    const isBuildingPermit = typeCode.startsWith("BUILDING_PERMIT");
    const isCedula = typeCode.startsWith("CEDULA");
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
    const isLcrBirth = typeCode === "LCR_BIRTH";
    const isLcrDeath = typeCode === "LCR_DEATH";
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

    const isFreeDeathRegPickUp = (request?.typeId === "cmpgkxxke0019vpjkquvcxggu" || typeCode === "LCR_DEATH_REG") &&
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
                { label: "Identity Matrix", url: addData.validIdUrl },
                { label: "Financial Evidence", url: addData.proofOfIncomeUrl },
            ];
        return docs.filter(d => !!d.url) as { label: string; url: string }[];
    }, [request, isBusinessPermit, isBuildingPermit]);

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
                <div className="max-w-5xl mx-auto px-4 md:px-0 pt-4 md:pt-10 space-y-6 md:space-y-12">
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
                                                        className="p-0.5 hover:text-primary transition-all duration-200 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-white/5 active:scale-90"
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

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10 items-start">
                                    <Card className="p-6 md:p-10 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 shadow-xl rounded-2xl md:rounded-3xl lg:col-span-2 relative overflow-hidden h-fit">
                                        <div className="absolute top-0 right-0 p-8 opacity-5"><FileText className="w-32 h-32" /></div>
                                        <div className="relative z-10 space-y-12">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3 italic leading-none"><FileText className="w-4 h-4 text-primary" /> Application Matrix</h3>
                                                <div className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-widest text-primary italic bg-primary/5 px-3 py-1 rounded-lg border border-primary/10"><Clock className="w-3 h-3" /> Updated: {formatPHDateTime(request.updatedAt)}</div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 md:gap-x-16 gap-y-10 md:gap-y-12">
                                                <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-semibold text-slate-400 tracking-widest italic opacity-60 leading-none">Service Requested</p><p className="text-base md:text-xl font-semibold text-slate-900 dark:text-white italic leading-tight uppercase">{request.type?.name}</p></div>
                                                <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-semibold text-slate-400 tracking-widest italic opacity-60 leading-none">Date Submitted</p><p className="text-base md:text-xl font-semibold text-slate-900 dark:text-white italic leading-tight uppercase">{formatPHDate(request.createdAt)}</p></div>
                                                <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-semibold text-slate-400 tracking-widest italic opacity-60 leading-none">Logistics Phase</p><p className="text-base md:text-xl font-semibold text-slate-900 dark:text-white italic leading-tight uppercase">{request.fulfillmentType?.replace(/_/g, " ") || "PENDING EVALUATION"}</p></div>
                                                <div className="space-y-1"><p className="text-[8px] md:text-[10px] uppercase font-semibold text-slate-400 tracking-widest italic opacity-60 leading-none">Payment</p><p className="text-base md:text-xl font-semibold text-primary italic leading-tight uppercase">{((request.type?.code === "LCR_BIRTH" || request.type?.code?.startsWith("LCR_")) && ["FOR_REQUESTING", "UNDER_REVIEW"].includes(request.status)) ? "TBD" : (request.paymentType?.replace(/_/g, " ") || "PENDING ASSESSMENT")}</p></div>
                                            </div>
                                        </div>
                                    </Card>

                                    {request.status === "FOR_REVISION" ? (
                                        <Card className="p-6 md:p-8 border-primary/20 bg-primary/[0.02] shadow-2xl rounded-2xl md:rounded-[2rem] relative overflow-hidden flex flex-col justify-between" style={{ borderColor: `${themeColor}20`, backgroundColor: `${themeColor}05` }}>
                                            <div className="absolute top-0 right-0 p-4 opacity-5">
                                                <AlertCircle className="w-20 h-20" />
                                            </div>
                                            <div className="relative z-10 space-y-6">
                                                <div className="space-y-4">
                                                    <div className="flex flex-col gap-2">
                                                        <h3 className="text-sm md:text-base font-black uppercase tracking-widest italic flex items-center gap-2" style={{ color: themeColor }}>
                                                            <AlertCircle className="w-5 h-5 animate-pulse" /> Admin Assessment
                                                        </h3>
                                                        <Badge variant="outline" className="w-fit border-primary/20 text-[9px] font-black uppercase tracking-widest italic py-1 px-3.5 rounded-full" style={{ borderColor: `${themeColor}20`, color: themeColor, backgroundColor: `${themeColor}10` }}>
                                                            {remainingRevisions} {remainingRevisions === 1 ? "Revision Left" : "Revisions Left"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-slate-500 leading-relaxed font-semibold italic">
                                                        Remarks: <span className="font-bold" style={{ color: "#ef4444" }}>{request.rejectionRemarks}</span>
                                                    </p>
                                                    <p className="text-[8px] md:text-[9px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest flex items-center gap-1 bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 dark:border-red-500/10 rounded-lg px-2 py-1 w-fit">
                                                        ⚠️ Declines in {remainingRevisions} attempts
                                                    </p>
                                                </div>

                                                {isBusinessPermit || isCedula ? (
                                                    <div className="space-y-3 pt-4 border-t" style={{ borderTopColor: `${themeColor}15` }}>
                                                        <div className="space-y-1">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
                                                                ✨Note:
                                                            </span>
                                                            <p className="text-[9px] md:text-[10px] text-slate-400 font-bold leading-normal uppercase">
                                                                Touch only fields needing correction.
                                                            </p>
                                                        </div>
                                                        <Button
                                                            asChild
                                                            className="w-full h-11 rounded-xl hover:opacity-90 text-white font-black italic uppercase text-[9px] tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                                                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}30` }}
                                                        >
                                                            <Link href={isBusinessPermit ? `/user/services/business-permit?revisionId=${request.id}` : `/user/services/cedula?revisionId=${request.id}`}>
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                                Fix Application
                                                            </Link>
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 pt-4 border-t" style={{ borderTopColor: `${themeColor}15` }}>
                                                        <div className="space-y-3">
                                                            <div className="space-y-1">
                                                                <Label className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Valid ID</Label>
                                                                <Input type="file" onChange={(e) => handleRevisionFile("idFile", e.target.files?.[0] || null)} className="text-[9px] file:text-[9px] file:font-black file:uppercase file:bg-slate-100 dark:file:bg-white/10 file:text-slate-700 dark:file:text-white file:border-none file:rounded-md file:mr-2 file:px-1.5 file:py-0.5 h-auto py-1 rounded-lg border-slate-200 dark:border-white/10 cursor-pointer" />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <Label className="text-[8px] font-bold uppercase text-slate-500 tracking-widest">Proof Document</Label>
                                                                <Input type="file" onChange={(e) => handleRevisionFile("proofFile", e.target.files?.[0] || null)} className="text-[9px] file:text-[9px] file:font-black file:uppercase file:bg-slate-100 dark:file:bg-white/10 file:text-slate-700 dark:file:text-white file:border-none file:rounded-md file:mr-2 file:px-1.5 file:py-0.5 h-auto py-1 rounded-lg border-slate-200 dark:border-white/10 cursor-pointer" />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={handleResubmit}
                                                            disabled={isResubmitting || Object.values(revisionFiles).every(f => !f)}
                                                            className="w-full h-11 rounded-xl hover:opacity-90 text-white font-black italic uppercase text-[9px] transition-all active:scale-95 flex items-center justify-center gap-2"
                                                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}30` }}
                                                        >
                                                            {isResubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                                            Submit Revision
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    ) : (
                                        <Card className="p-6 md:p-10 border-none bg-slate-950 text-white shadow-2xl rounded-2xl md:rounded-[3rem] relative overflow-hidden flex flex-col justify-between group">
                                            <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10 group-hover:rotate-12 transition-transform duration-700"><Info className="w-20 h-20 md:w-24 md:h-24" /></div>
                                            <div className="space-y-6 md:space-y-10 relative z-10">
                                                <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-primary italic leading-none">Admin Assessment</h3>
                                                <p className="text-xs md:text-sm font-bold italic opacity-90 leading-relaxed tracking-tight">
                                                    &quot;{(request.status === "RELEASED" || request.status === "DELIVERED")
                                                        ? "Registry Process Complete. Thank you for utilizing Mapandan's digital governance portal. Records successfully finalized and archived."
                                                        : (request.status === "PAID"
                                                            ? `Standard professional assessment concludes within ${request.type?.slaDays || 3} business days. Our team is currently validating your documentary evidence.`
                                                            : (["REJECTED", "FOR_REVISION"].includes(request.status)
                                                                ? (request.rejectionRemarks || `Standard professional assessment concludes within ${request.type?.slaDays || 3} business days. Our team is currently validating your documentary evidence.`)
                                                                : `Standard professional assessment concludes within ${request.type?.slaDays || 3} business days. Our team is currently validating your documentary evidence.`))}&quot;
                                                </p>
                                            </div>
                                            <div className="space-y-3 md:space-y-4 pt-10 relative z-10">
                                                <Separator className="bg-white/10" />
                                                <div className="flex items-end justify-between">
                                                    {((request.type?.code === "LCR_BIRTH" || request.type?.code?.startsWith("LCR_")) && ["FOR_REQUESTING", "UNDER_REVIEW"].includes(request.status)) ? (
                                                        <div><p className="text-[8px] font-black uppercase tracking-widest text-primary/50 italic leading-none">Total Payable</p><p className="text-xl md:text-2xl font-black text-primary/60 italic leading-tight">TBD</p></div>
                                                    ) : (isCedula && request.status === "FOR_REQUESTING") ? (
                                                        <div><p className="text-[8px] font-black uppercase tracking-widest text-primary/50 italic leading-none">Total Payable (Estimated)</p><p className="text-xl md:text-2xl font-black text-primary italic leading-tight">₱{estimatedCedulaAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                                                    ) : (
                                                        <div><p className="text-[8px] font-black uppercase tracking-widest text-primary/50 italic leading-none">Total Payable</p><p className="text-xl md:text-2xl font-black text-primary italic leading-tight">₱{(request.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
                                                    )}
                                                    <ShieldCheck className="w-6 h-6 text-primary/40" />
                                                </div>
                                            </div>
                                        </Card>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="records" className="mt-0">
                                <Card className="p-6 md:p-10 border-slate-200 dark:border-white/5 bg-white dark:bg-slate-950/50 shadow-xl rounded-2xl md:rounded-3xl space-y-12">
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
                                </Card>
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
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                            {documentList.length > 0 ? documentList.map((doc, i) => {
                                                const isPdf = checkIsPdf(doc.url);
                                                if (isPdf) {
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleViewFile(doc.url, doc.label)}
                                                            className="relative aspect-[4/3] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden group/doc hover:shadow-xl transition-all w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-white/5 hover:border-red-500/50"
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
                                                        className="relative aspect-[4/3] rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden group/doc hover:shadow-xl transition-all w-full text-left"
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
                                                <div className="col-span-2 py-10 flex flex-col items-center justify-center text-slate-300 dark:text-white/20">
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
                                                                    const blob = await response.blob();
                                                                    const url = window.URL.createObjectURL(blob);
                                                                    const link = document.createElement("a");
                                                                    link.href = url;
                                                                    const ext = blob.type.includes("pdf") ? "pdf" : "png";
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
                                                                        const blob = await response.blob();
                                                                        const url = window.URL.createObjectURL(blob);
                                                                        const link = document.createElement("a");
                                                                        link.href = url;
                                                                        const ext = blob.type.includes("pdf") ? "pdf" : "png";
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

                                        {(isLcrBirth || isLcrDeath) && (request.status === "RELEASED" || request.status === "DELIVERED") && (
                                            (() => {
                                                const formType = additionalData.registryBookVerification || (isLcrDeath ? "FORM_2A" : "FORM_1A");
                                                const config = getVerificationConfig(formType);
                                                return (
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
                                                                            Registry Book Verification
                                                                        </p>
                                                                        <p className="text-xs md:text-sm font-black italic tracking-tight uppercase leading-none mt-1.5 text-slate-900 dark:text-white">
                                                                            {config.title}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    className="text-[8px] font-black uppercase tracking-widest italic px-3 py-1 rounded-full text-white border-transparent"
                                                                    style={{ backgroundColor: themeColor }}
                                                                >
                                                                    {formType.replace(/_/g, " ")}
                                                                </Badge>
                                                            </div>

                                                            <div className="p-5 bg-white/50 dark:bg-[#121620]/60 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                                                                <p className="text-xs md:text-sm font-bold italic text-slate-700 dark:text-slate-200 leading-relaxed">
                                                                    &ldquo;{config.description}&rdquo;
                                                                </p>
                                                            </div>

                                                            {(formType === "FORM_1B" || formType === "FORM_2B") && (
                                                                <div
                                                                    className="p-5 rounded-2xl border shadow-inner space-y-4 animate-in slide-in-from-top-2 duration-300 bg-white dark:bg-white/[0.02]"
                                                                    style={{ borderColor: `${themeColor}20` }}
                                                                >
                                                                    <div className="flex items-start gap-3">
                                                                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: themeColor }} />
                                                                        <div className="space-y-1">
                                                                            <h4 className="text-[10px] font-black uppercase tracking-widest leading-none" style={{ color: themeColor }}>MCR negative verification notice</h4>
                                                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-normal italic">
                                                                                MCR issued {formType} (Negative Result). Please proceed with Registration to create a record.
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <Button
                                                                        asChild
                                                                        className="w-full h-11 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center border-none hover:opacity-90"
                                                                        style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}30` }}
                                                                    >
                                                                        <Link href={isLcrDeath ? "/user/services/civil-registry/death-registration" : "/user/services/civil-registry/birth-registration"}>
                                                                            Proceed to Registration
                                                                        </Link>
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            {(formType === "FORM_1A" || formType === "FORM_2A") && (
                                                                <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5 shadow-inner space-y-4">
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="space-y-1">
                                                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 leading-none">Need to forward to Manila?</h4>
                                                                            <p className="text-[10px] text-slate-400 italic">Initiate {isLcrDeath ? "Death" : "Birth"} PSA endorsement to forward the certificate to PSA Main office.</p>
                                                                        </div>
                                                                        {additionalData.psaEndorsementRequested ? (
                                                                            <div
                                                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest italic mt-1 p-3 rounded-xl border"
                                                                                style={{ color: themeColor, backgroundColor: `${themeColor}10`, borderColor: `${themeColor}20` }}
                                                                            >
                                                                                <Check className="w-4 h-4 shrink-0" />
                                                                                <span>{isLcrDeath ? "Death" : "Birth"} PSA Endorsement Requested (₱200)</span>
                                                                            </div>
                                                                        ) : isLcrDeath ? (
                                                                            <Button
                                                                                asChild
                                                                                className="w-full h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all border-none"
                                                                                style={{
                                                                                    backgroundColor: themeColor,
                                                                                    boxShadow: `0 10px 20px -5px ${themeColor}30`
                                                                                }}
                                                                            >
                                                                                <Link href="/user/services/civil-registry/death-psa-endorsement">
                                                                                    Request Death PSA Endorsement (₱200)
                                                                                </Link>
                                                                            </Button>
                                                                        ) : (
                                                                            <Dialog open={psaEndorsementOpen} onOpenChange={setPsaEndorsementOpen}>
                                                                                <DialogTrigger asChild>
                                                                                    <Button
                                                                                        className="w-full h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                                                                        style={{
                                                                                            backgroundColor: themeColor,
                                                                                            boxShadow: `0 10px 20px -5px ${themeColor}30`
                                                                                        }}
                                                                                    >
                                                                                        Request Birth PSA Endorsement (₱200)
                                                                                    </Button>
                                                                                </DialogTrigger>
                                                                                <DialogContent className="max-w-[360px] w-full bg-white dark:bg-slate-950 border-none rounded-[1.5rem] shadow-2xl p-6 z-[150]">
                                                                                    <DialogHeader className="space-y-1">
                                                                                        <DialogTitle className="text-md font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                                                                            Birth PSA <span style={{ color: themeColor }}>Endorsement</span>
                                                                                        </DialogTitle>
                                                                                        <DialogDescription className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">
                                                                                            Official Manila Dispatch Protocol
                                                                                        </DialogDescription>
                                                                                    </DialogHeader>
                                                                                    <div className="space-y-4 py-3">
                                                                                        <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                                                                                            Please upload your PSA Negative Certification document to initiate the endorsement process. This service carries a government fee of ₱200.
                                                                                        </p>
                                                                                        <div className="space-y-1.5">
                                                                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic ml-1 leading-none">PSA Negative Cert (PDF/Image)</Label>
                                                                                            <div className="w-full aspect-[21/8] bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center relative overflow-hidden group">
                                                                                                {psaNegPreview ? (
                                                                                                    <>
                                                                                                        <div className="absolute inset-0 flex items-center justify-center font-bold text-xs uppercase text-slate-800 dark:text-white">
                                                                                                            File Selected
                                                                                                        </div>
                                                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                                                            <Button variant="secondary" size="sm" className="h-7 px-3 font-black italic uppercase text-[8px] tracking-widest rounded-lg relative overflow-hidden">
                                                                                                                Change
                                                                                                                <input
                                                                                                                    type="file"
                                                                                                                    accept=".pdf,image/*"
                                                                                                                    onChange={(e) => {
                                                                                                                        const file = e.target.files?.[0];
                                                                                                                        if (file) {
                                                                                                                            setPsaNegFile(file);
                                                                                                                            setPsaNegPreview(URL.createObjectURL(file));
                                                                                                                        }
                                                                                                                    }}
                                                                                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                                                                                />
                                                                                                            </Button>
                                                                                                        </div>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <div className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                                                                                        <Upload className="w-4 h-4 text-slate-350 mb-0.5" />
                                                                                                        <p className="text-[8px] font-black uppercase text-slate-400 italic">Upload Document</p>
                                                                                                        <input
                                                                                                            type="file"
                                                                                                            accept=".pdf,image/*"
                                                                                                            onChange={(e) => {
                                                                                                                const file = e.target.files?.[0];
                                                                                                                if (file) {
                                                                                                                    setPsaNegFile(file);
                                                                                                                    setPsaNegPreview(URL.createObjectURL(file));
                                                                                                                }
                                                                                                            }}
                                                                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                                                                        />
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                    <DialogFooter className="pt-2">
                                                                                        <Button
                                                                                            onClick={handlePsaEndorsementSubmit}
                                                                                            disabled={isSubmittingPsaEndorsement || !psaNegFile}
                                                                                            className="w-full h-11 text-white rounded-xl text-[9px] font-black uppercase tracking-widest italic transition-all active:scale-95 gap-2 hover:opacity-90 border-none"
                                                                                            style={{ backgroundColor: themeColor, boxShadow: `0 10px 15px -3px ${themeColor}30` }}
                                                                                        >
                                                                                            {isSubmittingPsaEndorsement ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                                                                            Submit Request
                                                                                        </Button>
                                                                                    </DialogFooter>
                                                                                </DialogContent>
                                                                            </Dialog>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {additionalData.scannedDocUrl && (
                                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                                    <Button
                                                                        onClick={async () => {
                                                                            if (!additionalData.scannedDocUrl) return;
                                                                            try {
                                                                                const response = await fetch(additionalData.scannedDocUrl);
                                                                                const blob = await response.blob();
                                                                                const url = window.URL.createObjectURL(blob);
                                                                                const link = document.createElement("a");
                                                                                link.href = url;
                                                                                const ext = blob.type.includes("pdf") ? "pdf" : "png";
                                                                                link.download = `Scanned_Verification_${id.slice(-6).toUpperCase()}.${ext}`;
                                                                                document.body.appendChild(link);
                                                                                link.click();
                                                                                document.body.removeChild(link);
                                                                                window.URL.revokeObjectURL(url);
                                                                                toast.success("Document downloaded!");
                                                                            } catch {
                                                                                toast.error("Download failed. Try opening in a new tab.");
                                                                            }
                                                                        }}
                                                                        className="h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                                                        style={{
                                                                            backgroundColor: themeColor,
                                                                            boxShadow: `0 10px 20px -5px ${themeColor}30`
                                                                        }}
                                                                    >
                                                                        <Download className="w-4 h-4" />
                                                                        Verification Form
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => {
                                                                            if (additionalData.scannedDocUrl) {
                                                                                handleViewFile(additionalData.scannedDocUrl, "Verification Document");
                                                                            }
                                                                        }}
                                                                        variant="outline"
                                                                        className="h-12 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-slate-50 dark:hover:bg-white/5 bg-transparent"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                        Preview Form
                                                                    </Button>
                                                                </div>
                                                            )}

                                                            {request.eCopyUrl && (
                                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                                    <Button
                                                                        onClick={handleECopyDownload}
                                                                        className="h-12 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all"
                                                                        style={{
                                                                            backgroundColor: config.themeColor,
                                                                            boxShadow: `0 10px 20px -5px ${config.themeColor}30`
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
                                                                        className="h-12 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-slate-50 dark:hover:bg-white/5 bg-transparent"
                                                                    >
                                                                        <Eye className="w-4 h-4" />
                                                                        Preview
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })()
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
                                                                Download Endorsement Copy
                                                            </Button>
                                                            <Button
                                                                onClick={() => {
                                                                    if (request.eCopyUrl) {
                                                                        handleViewFile(request.eCopyUrl, "Official Endorsement Copy");
                                                                    }
                                                                }}
                                                                variant="outline"
                                                                className="h-12 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2 hover:bg-slate-50 dark:hover:bg-white/5 bg-transparent"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                                Preview Copy
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {!isLcrBirth && !isPsaEndorsement && (request.status === "RELEASED" || request.status === "DELIVERED") && (request.eCopyUrl || request.cedula?.documentUrl || request.businessPermit?.documentUrl) && (
                                            <div className="bg-slate-950 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] text-white space-y-6 md:space-y-8 shadow-2xl relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12 group-hover:rotate-0 transition-transform"><ShieldCheck className="w-24 h-24" /></div>
                                                <div className="relative z-10 space-y-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center"><FileText className="w-5 h-5 text-white" /></div>
                                                        <div><p className="text-[8px] font-black uppercase text-primary tracking-widest italic opacity-70 leading-none">Issuance Secured</p><p className="text-xs font-bold italic tracking-tight uppercase leading-none mt-1">{isCedula ? "E-Copy of CEDULA" : "Official Digital Record"}</p></div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Button
                                                            onClick={handleECopyDownload}
                                                            className="h-12 bg-primary hover:opacity-90 text-white font-black italic uppercase tracking-widest text-[9px] rounded-xl gap-2"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                            Download
                                                        </Button>
                                                        <Button
                                                            onClick={() => {
                                                                const url = request.eCopyUrl || request.cedula?.documentUrl || request.businessPermit?.documentUrl;
                                                                if (url) {
                                                                    setViewerUrl(url);
                                                                    setViewerTitle(isCedula ? "E-Copy of CEDULA" : "Official Digital Record");
                                                                    setViewerOpen(true);
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

                                        {request?.status === "DELIVERED" && request?.podUrl && (
                                            <div className="bg-emerald-500/5 p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border border-emerald-500/20 space-y-6 md:space-y-8 shadow-xl">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20"><Camera className="w-5 h-5" /></div>
                                                        <div><p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest italic leading-none opacity-70">POD Protocol</p><p className="text-xs font-bold italic tracking-tight uppercase leading-none mt-1 text-slate-900 dark:text-white">Fulfillment Snapshot</p></div>
                                                    </div>
                                                    {isReportAllowed && (
                                                        <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
                                                            <DialogTrigger asChild><Button className="h-10 px-4 text-white rounded-xl text-[8px] font-black uppercase tracking-widest italic shadow-lg active:scale-95 gap-2" style={{ backgroundColor: themeColor, boxShadow: `0 10px 20px -5px ${themeColor}40` }}><AlertCircle className="w-4 h-4" /> Report Issue</Button></DialogTrigger>
                                                            <DialogContent className="max-w-[330px] w-full bg-white dark:bg-slate-950 border-none rounded-[1.25rem] shadow-2xl p-4 z-[150]">
                                                                <DialogHeader className="space-y-0.5"><DialogTitle className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Resolution <span style={{ color: themeColor }}>Center</span></DialogTitle><DialogDescription className="text-[7px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Submit formal dispute for validation</DialogDescription></DialogHeader>
                                                                <div className="space-y-3 py-1.5">
                                                                    <div className="flex items-center justify-between py-1 bg-slate-50 dark:bg-white/5 px-2.5 rounded-lg border border-slate-100 dark:border-white/5">
                                                                        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 italic">Protocol</span>
                                                                        <span className="text-[7px] font-black uppercase tracking-widest text-primary italic bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20" style={{ color: themeColor, borderColor: `${themeColor}20`, backgroundColor: `${themeColor}10` }}>RETURN ONLY</span>
                                                                    </div>
                                                                    <div className="space-y-1"><Label className="text-[7px] font-black uppercase tracking-widest text-slate-400 italic ml-1 leading-none">Core Reason</Label><Textarea placeholder="Describe the issue..." className="min-h-[50px] bg-slate-50 dark:bg-white/5 border-none rounded-xl font-bold italic text-[10px] p-2 focus:ring-1 focus-visible:ring-1 focus-visible:ring-offset-0 focus:outline-none placeholder:text-slate-400 text-slate-800 dark:text-white" style={{ "--tw-ring-color": `${themeColor}40` } as any} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} /></div>
                                                                    <div className="space-y-1"><Label className="text-[7px] font-black uppercase tracking-widest text-slate-400 italic ml-1 leading-none">Evidence JPG/PNG</Label><div className="w-full aspect-[21/6] bg-slate-50 dark:bg-white/5 rounded-xl border border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center relative overflow-hidden group">{disputePreview ? (<><Image src={disputePreview} alt="Proof" fill className="object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Button variant="secondary" size="sm" className="h-6 px-2 font-black italic uppercase text-[7px] tracking-widest rounded-lg relative overflow-hidden">Change<input type="file" onChange={handleDisputeFileChange} className="absolute inset-0 opacity-0 cursor-pointer" /></Button></div></>) : (<div className="relative w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"><Upload className="w-3.5 h-3.5 text-slate-300 mb-0.5" /><p className="text-[6px] font-black uppercase text-slate-400 italic">Upload Evidence</p><input type="file" onChange={handleDisputeFileChange} className="absolute inset-0 opacity-0 cursor-pointer" /></div>)}</div></div>
                                                                </div>
                                                                <DialogFooter><Button onClick={handleDispute} disabled={isDisputing || !disputeReason} className="w-full h-8 text-white rounded-xl text-[8px] font-black uppercase tracking-widest italic transition-all active:scale-95 gap-2" style={{ backgroundColor: themeColor, boxShadow: `0 10px 20px -5px ${themeColor}40` }}>{isDisputing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Submit</Button></DialogFooter>
                                                            </DialogContent>
                                                        </Dialog>
                                                    )}
                                                </div>
                                                <Button onClick={() => {
                                                    if (request.podUrl) {
                                                        handleViewFile(request.podUrl, "Fulfillment Snapshot");
                                                    }
                                                }} variant="outline" className="w-full h-12 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black italic uppercase tracking-widest text-[9px] rounded-xl hover:bg-emerald-500/10">
                                                    View Deployment Snapshot <Eye className="w-3.5 h-3.5 ml-2" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </div>

            {/* ============================================================ */}
            {/* PREMIUM LIGHTBOX MODAL                                        */}
            {/* ============================================================ */}
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
                                    href={documentList[lightboxIndex].url}
                                    download
                                    onClick={e => e.stopPropagation()}
                                    className="h-9 px-4 bg-white/10 hover:bg-primary/80 backdrop-blur-md rounded-xl text-white text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2 transition-all border border-white/10"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Download</span>
                                </a>
                                <a
                                    href={documentList[lightboxIndex].url}
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

