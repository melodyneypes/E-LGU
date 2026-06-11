"use client";

import React, { useState, useRef, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import Image from "next/image";
import { isValidUrl } from "@/utils/image";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    FileText,
    ArrowLeft,
    Upload,
    Camera,
    Hash,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    Copy
} from "lucide-react";
import { toast } from "sonner";
import {
    getTransactionById,
    rejectTransaction,
    sendForRevision,
    uploadECopyAction,
    resolveDispute,
    getSystemSettingAction
} from "@/app/admin/transactions/actions";
import {
    evaluateBusinessPermitTransaction,
    releaseBusinessPermit
} from "@/app/admin/transactions/bplo-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DocumentViewerModal from "@/app/admin/treasury/[id]/components/DocumentViewerModal";
import ResidentIdentityProfile from "../../treasury/[id]/components/ResidentIdentityProfile";
import TransactionInfoCard from "../../treasury/[id]/components/TransactionInfoCard";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface PageProps {
    params: Promise<{ id: string }>;
}

type FeeItem = {
    label: string;
    amount: string;
};

const documentExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "rtf"];
const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "svg"];

function getFileExtension(url: string) {
    try {
        const cleanPath = new URL(url).pathname;
        return cleanPath.split(".").pop()?.toLowerCase() || "";
    } catch {
        return url.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
    }
}

function isDocumentFile(url: string) {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:application/pdf")) return true;
    return documentExtensions.includes(getFileExtension(url));
}

function isImageFile(url: string) {
    const lower = url.toLowerCase();
    if (lower.startsWith("data:image/") || lower.startsWith("blob:")) return true;
    const extension = getFileExtension(url);
    if (imageExtensions.includes(extension)) return true;
    return !isDocumentFile(url);
}

export default function BploDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();


    const [transaction, setTransaction] = useState<any>(null);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [viewerDocs, setViewerDocs] = useState<{ url?: string | null; label: string }[]>([]);
    const [viewerIndex, setViewerIndex] = useState<number>(0);

    const handleViewFile = (url: string | null, title: string, docs?: { url?: string | null; label: string }[], index?: number) => {
        setViewerUrl(url);
        setViewerTitle(title);
        setViewerDocs(docs || (url ? [{ url, label: title }] : []));
        setViewerIndex(index ?? 0);
        setViewerOpen(true);
    };

    const safeFormatDate = (dateStr: any) => {
        if (!dateStr) return "—";
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return "—";
            return format(d, "MMMM d, yyyy");
        } catch {
            return "—";
        }
    };
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [remarks, setRemarks] = useState("");
    const remarksRef = useRef<HTMLTextAreaElement>(null);
    const [permitNumberInput, setPermitNumberInput] = useState("");
    const [stickerNumber, setStickerNumber] = useState("");
    const [isRejecting, setIsRejecting] = useState(false);
    const [isRequestingRevision, setIsRequestingRevision] = useState(false);
    const [eCopyFile, setECopyFile] = useState<File | null>(null);
    const [eCopyPreview, setECopyPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!eCopyFile) {
            setECopyPreview(null);
            return;
        }
        const objectUrl = URL.createObjectURL(eCopyFile);
        setECopyPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [eCopyFile]);
    const [isResolvingDispute, setIsResolvingDispute] = useState(false);
    const [disputeModalOpen, setDisputeModalOpen] = useState(false);
    const [disputeAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');

    const [themeColor, setThemeColor] = useState<string>("#2563eb");
    const [branding, setBranding] = useState({
        word1: "Mapandan",
        word2: "Express",
        logo: ""
    });
    const [isBusinessRecordExpanded, setIsBusinessRecordExpanded] = useState(true);
    const [isRequirementsExpanded, setIsRequirementsExpanded] = useState(true);
    const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(true);
    const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
    const isReadOnly = transaction
        ? ["PAID", "FOR_REQUESTING", "REJECTED", "EVALUATED", "UNPAID", "FOR_PICKING", "RELEASED", "DELIVERED"].includes(transaction.status)
        : false;

    const fetchTransaction = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTransactionById(id);
            if (res.success && res.data) {
                setTransaction(res.data);
                const addData = res.data.additionalData || {};
                const prevPermit = res.data.businessPermit?.permitNumber || addData.permitNumber || addData.existingPermitNumber || addData.existingPermitNo || "";
                setPermitNumberInput(prevPermit);
                const prevSticker = res.data.businessPermit?.stickerNumber || addData.stickerNumber || "";
                setStickerNumber(prevSticker);
                // Initialize editable fee items from fiscalSnapshot.lineItems first,
                // then fall back to transaction type defaultFees.
                const rawFiscal = res.data.fiscalSnapshot;
                const snap = (typeof rawFiscal === "string" ? JSON.parse(rawFiscal) : rawFiscal) as any || {};
                const existingItems: any[] = snap.lineItems || [];
                const defaults: any[] = res.data.type?.defaultFees || [];
                const initFees: FeeItem[] = existingItems.length > 0
                    ? existingItems.map((i: any) => ({ label: i.label, amount: String(i.amount ?? "") }))
                    : defaults.length > 0
                        ? defaults.map((f: any) => ({ label: f.label, amount: "" }))
                        : [{ label: "Mayor's Permit Fee", amount: "" }];
                setFeeItems(initFees);
            } else {
                toast.error(res.error || "Failed to load transaction details.");
            }
        } catch {
            toast.error("Failed to load transaction.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTransaction();
        getSystemSettingAction("theme_color", "#2563eb").then(res => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });
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

    const handleEvaluate = async () => {
        const isReinspection = transaction.status === "FOR_REINSPECTION";
        if (!isReinspection) {
            const hasIncompleteFee = feeItems.some(f => f.label.trim() && f.amount.trim() === "");
            const hasAmountWithoutLabel = feeItems.some(f => !f.label.trim() && f.amount.trim() !== "");
            if (hasIncompleteFee) {
                toast.error("Please enter an amount for every fee line, or remove empty additional fees.");
                return;
            }
            if (hasAmountWithoutLabel) {
                toast.error("Please add a label for every additional fee amount.");
                return;
            }
        }

        setActionLoading(true);
        try {
            const deliveryFee = transaction.fulfillmentType === "DELIVERY" ? (transaction.type.deliveryFee || 0) : 0;

            // Send only valid positive line items. If none exist, the server computes
            // the business permit assessment from the declared capital/gross sales.
            const itemsToSend = feeItems
                .filter(f => f.label.trim() && Number(f.amount) > 0)
                .map(f => ({ label: f.label.trim(), amount: Number(f.amount) || 0 }));

            const res = await evaluateBusinessPermitTransaction(
                transaction.id,
                deliveryFee,
                remarks || (isReinspection ? "Business Permit Re-inspection Approved" : "Business Permit Assessment"),
                itemsToSend.length > 0 ? itemsToSend : undefined
            );
            if (res.success) {
                toast.success(isReinspection ? "Re-inspection approved! Transaction status is now FOR PROCESSING." : "Assessment details updated and submitted successfully!");
                router.push("/admin/bplo");
            } else {
                toast.error(res.error || "Evaluation failed.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!remarks) { toast.error("Remarks required"); return; }
        setActionLoading(true);
        try {
            const res = await rejectTransaction(transaction.id, remarks);
            if (res.success) {
                toast.success("Permit request successfully declined.");
                router.push("/admin/bplo");
            } else toast.error(res.error || "Decline failed.");
        } finally { setActionLoading(false); }
    };

    const handleRequestRevision = async () => {
        if (!remarks) { toast.error("Remarks required"); return; }
        setActionLoading(true);
        try {
            const res = await sendForRevision(transaction.id, remarks);
            if (res.success) {
                toast.success("Permit application returned to citizen for revisions.");
                router.push("/admin/bplo");
            } else toast.error(res.error || "Revision request failed.");
        } finally { setActionLoading(false); }
    };

    const handleRelease = useCallback(async () => {
        const isRenewal = (transaction?.additionalData as any)?.businessType === "RENEWAL" || (transaction?.additionalData as any)?.businessType === "RENEW";
        if (!isRenewal && !permitNumberInput) {
            toast.error("License Business Permit Number is required.");
            return;
        }

        setActionLoading(true);
        try {
            let eCopyUrl = transaction.eCopyUrl || "";
            if (eCopyFile) {
                const formData = new FormData();
                formData.append("file", eCopyFile);
                const uploadRes = await uploadECopyAction(formData);
                if (uploadRes.success) eCopyUrl = uploadRes.data as string;
                else { toast.error("E-Permit upload failed"); setActionLoading(false); return; }
            }

            const res = await releaseBusinessPermit(transaction.id, permitNumberInput, eCopyUrl, stickerNumber);
            if (res.success) {
                const resultStatus = res.data?.status;
                const message = resultStatus === "FOR_PICKING"
                    ? "Business Permit is now ready for rider pick-up! 🚀"
                    : resultStatus === "FOR_CLAIM"
                        ? "Business Permit is now ready for claiming at the office! 📋"
                        : resultStatus === "RELEASED"
                            ? "Business Permit has been officially released to citizen! 📁"
                            : resultStatus === "FOR_REINSPECTION"
                                ? "Sent to BPLO for Re-Inspection."
                                : "Business Permit updated successfully!";
                toast.success(message);
                setECopyFile(null);
                setStickerNumber("");
                router.push("/admin/bplo");
            } else toast.error(res.error || "Failed to release permit.");
        } finally { setActionLoading(false); }
    }, [transaction, permitNumberInput, eCopyFile, stickerNumber, router]);

    const handlePrintWaybill = () => {
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

        const deliveryAddr = typeof transaction.deliveryAddress === 'string'
            ? JSON.parse(transaction.deliveryAddress || '{}')
            : transaction.deliveryAddress;

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

        const rawFiscal = transaction.fiscalSnapshot;
        const fiscalSnapshot = (typeof rawFiscal === "string" ? JSON.parse(rawFiscal) : rawFiscal) as any || {};
        const amountDue = (Number(transaction.totalAmount) || Number(fiscalSnapshot.totalAmount) || 0).toLocaleString();

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
                                    If document is damaged, please report immediately to the BPLO Office.
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

        iframe.onload = () => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
    };

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

    const updateFeeItem = (index: number, field: keyof Pick<FeeItem, "label" | "amount">, value: string) => {
        setFeeItems(items => items.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addFeeItem = () => {
        setFeeItems(items => [...items, { label: "", amount: "" }]);
    };

    const removeFeeItem = (index: number) => {
        setFeeItems(items => items.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (isRejecting || isRequestingRevision) {
            remarksRef.current?.focus();
        }
    }, [isRejecting, isRequestingRevision]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (!transaction) return <div className="p-20 text-center dark:text-white">Transaction details unavailable.</div>;

    const additional = transaction.additionalData || {};
    const resident = transaction.user?.residentProfile || transaction.residentSnapshot || {};
    const isRenewal = additional.businessType === "RENEWAL" || additional.businessType === "RENEW";

    const isProcessing = transaction.status === "FOR_PROCESSING";
    const hasFile = !!eCopyFile || (transaction.eCopyUrl && transaction.eCopyUrl !== "null" && transaction.eCopyUrl !== "undefined" && transaction.eCopyUrl !== "");
    const isButtonDisabled = isProcessing ? (
        (!isRenewal && !permitNumberInput.trim()) ||
        !hasFile ||
        !stickerNumber.trim()
    ) : false;
    const isDelivery = transaction.fulfillmentType === "DELIVERY";
    const buttonText = transaction.status === "FOR_CLAIM"
        ? "Release the Document"
        : isProcessing
            ? (isDelivery ? "Proceed for Picking" : "Proceed for claim")
            : "Update & Release Permit";

    const evidenceDocs = [
        { url: additional.ownerIdUrl, label: "Owner's Valid ID" },
        { url: additional.ctcUrl, label: "Cedula (CTC) Copy" },
        { url: additional.dtiSecUrl, label: "DTI / SEC Registry" },
        { url: additional.brgyClearanceUrl, label: "Barangay Clearance" },
        { url: additional.locationPhotoUrl, label: "Location Photo" },
        { url: additional.sanitaryPermitUrl, label: "Sanitary Permit" },
        { url: additional.fireSafetyUrl, label: "Fire Safety Certificate" },
        { url: additional.birCorUrl, label: "BIR Certificate (COR)" },
        { url: additional.previousPermitUrl, label: "Previous Business Permit" }
    ].filter(doc => doc.url);

    const baseSteps = [
        { id: "FOR_INSPECTION", label: "INSPECTION" },
        { id: "FOR_REQUESTING", label: "EVALUATION" },
        { id: "EVALUATED", label: "ASSESSMENT" },
        { id: "PAID", label: "PAID" },
        { id: "FOR_REINSPECTION", label: "RE-INSPECTION" },
        { id: "FOR_PROCESSING", label: "PROCESSING" },
        {
            id: transaction.fulfillmentType === "DELIVERY" ? "FOR_PICKING" : "FOR_CLAIM",
            label: transaction.fulfillmentType === "DELIVERY" ? "FOR PICKING" : "CLAIMING"
        },
        {
            id: transaction.fulfillmentType === "DELIVERY" ? "DELIVERED" : "RELEASED",
            label: transaction.fulfillmentType === "DELIVERY" ? "DELIVERED" : "RELEASED"
        }
    ];

    let steps = [...baseSteps];
    const status = transaction.status as string;

    if (status === "REJECTED") {
        steps = [
            { id: "FOR_REQUESTING", label: "EVALUATION" },
            { id: "REJECTED", label: "REJECTED" }
        ];
    } else if (status === "FOR_REVISION") {
        steps = [
            { id: "FOR_REQUESTING", label: "EVALUATION" },
            { id: "FOR_REVISION", label: "REVISION REQ." }
        ];
    } else if (status.includes("RETURN") || status.includes("REFUND") || status === "DISPUTE_REJECTED") {
        const disputeLabel = status === "DISPUTE_REJECTED" ? "RETURN REJECTED" : status.replace(/_/g, " ");
        steps.push({ id: status, label: disputeLabel });
    }

    steps = steps.filter(step => {
        // Business Permits always need the PROCESSING step — do NOT filter it out
        if (step.id === "PAID" &&
            transaction.fulfillmentType === "PICK_UP" &&
            transaction.paymentType === "CASH") {
            return false;
        }
        return true;
    });

    const currentStepIdx = steps.findIndex(s => s.id === transaction.status);
    return (
        <div
            className="min-h-screen bg-[#f8fafd] dark:bg-[#0c111d] text-[#0f172a] dark:text-[#f8fafc] pb-20 font-sans transition-colors duration-500"
            style={{ "--theme_color": themeColor, "--primary-theme": themeColor } as React.CSSProperties}
        >
            {/* Minimal Header */}
            <header className="h-16 px-8 flex items-center justify-between border-b border-transparent dark:border-white/5">
                <Link href="/admin/bplo">
                    <Button variant="ghost" className="gap-2 text-slate-400 dark:text-slate-500 font-bold hover:text-primary">
                        <ArrowLeft className="w-4 h-4" /> BACK TO DASHBOARD
                    </Button>
                </Link>
                <Badge variant="outline" className="font-black italic uppercase tracking-widest text-[10px] border-primary/20 text-primary bg-primary/5 px-4 py-1">
                    Type Of Request: {transaction.fulfillmentType?.replace("_", " ") || "Processing"}
                </Badge>
            </header>

            <main className="max-w-[1400px] mx-auto px-8 grid grid-cols-12 gap-8 mt-4">
                {/* LEFT COLUMN: Identity & Business Details */}
                <div className="col-span-12 lg:col-span-8 space-y-8">
                    {/* TRANSACTION INFORMATION CARD */}
                    <TransactionInfoCard
                        transactionName={transaction.type?.requiresBusinessName
                            ? (transaction.businessName || additional?.businessName || "UNNAMED ENTITY")
                            : `${resident?.firstName || ''} ${resident?.lastName || ''}`}
                        themeColor={themeColor}
                        categoryLabel={transaction.type?.name || "Business Permit"}
                    />

                    {/* METRICS + BREAKDOWN CARD */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                        {/* TOP METRICS — 4-col white/grey grid */}
                        {(() => {
                            const declaredValue = Number(additional?.grossSales || additional?.capitalInvestment || 0);
                            const declaredLabel = additional?.businessType === "NEW" ? "CAPITAL" : "DECLARED GROSS";
                            const paymentType = transaction.paymentType?.replace(/_/g, " ") || "—";
                            const fulfillment = transaction.fulfillmentType?.replace(/_/g, " ") || "—";
                            const rawFiscal = transaction.fiscalSnapshot;
                            const fiscalSnapshot = (typeof rawFiscal === "string" ? JSON.parse(rawFiscal) : rawFiscal) as any || {};

                            // Use transaction.totalAmount as the authoritative total — it is always
                            // written by evaluateCedulaTransaction regardless of fiscalSnapshot state.
                            const totalAmountAssessed =
                                Number(transaction.totalAmount) ||
                                Number(fiscalSnapshot.totalAmount) ||
                                (Array.isArray(transaction.type?.defaultFees)
                                    ? transaction.type.defaultFees.reduce((acc: number, curr: any) => acc + (Number(curr.amount) || 0), 0)
                                    : 0);
                            return (
                                <div className="grid grid-cols-4 gap-3">
                                    {/* Declared */}
                                    <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/10 flex flex-col justify-between min-h-[100px]">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{declaredLabel}</span>
                                        <p className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white mt-2">
                                            ₱{declaredValue.toLocaleString()}
                                        </p>
                                    </div>
                                    {/* Payment Mode */}
                                    <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/10 flex flex-col justify-between min-h-[100px]">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">PAYMENT MODE</span>
                                        <p className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase mt-2">
                                            {paymentType === "—" ? <span className="w-6 h-1.5 bg-slate-400 rounded-sm inline-block" /> : paymentType}
                                        </p>
                                    </div>
                                    {/* Fulfillment */}
                                    <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/10 flex flex-col justify-between min-h-[100px]">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">FULFILLMENT</span>
                                        <p className="text-xl font-black italic tracking-tighter text-slate-900 dark:text-white uppercase mt-2">
                                            {fulfillment === "—" ? <span className="w-6 h-1.5 bg-slate-400 rounded-sm inline-block" /> : fulfillment}
                                        </p>
                                    </div>
                                    {/* Total Amount */}
                                    <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl border border-slate-100 dark:border-white/10 flex flex-col justify-between min-h-[100px]">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/80">Total Amount</span>
                                        <p className="text-xl font-black italic tracking-tighter text-emerald-500 mt-2">
                                            ₱{totalAmountAssessed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* FEE ASSESSMENT BREAKDOWN — Accordion */}
                        <div className="border-t border-slate-100 dark:border-white/5 pt-6">
                            <button
                                type="button"
                                onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                                className="flex items-center justify-between w-full text-left focus:outline-none group"
                            >
                                <div>
                                    <h2 className="text-xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                        Permit <span className="text-primary">Assessment Breakdown</span>
                                    </h2>
                                    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-1">
                                        Approved and Assessed Fees
                                    </p>
                                </div>
                                <div className="text-slate-400 group-hover:text-primary transition-colors">
                                    <div className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:border-primary/40 transition-all">
                                        {isBreakdownExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>
                            </button>

                            {isBreakdownExpanded && (() => {
                                const rawFiscal = transaction.fiscalSnapshot;
                                const fiscalSnapshot = (typeof rawFiscal === "string" ? JSON.parse(rawFiscal) : rawFiscal) as any || {};
                                const isInspectionAssessment = transaction.status === "FOR_INSPECTION";
                                const lineItems: any[] = fiscalSnapshot.lineItems || [];
                                const defaultFees: any[] = transaction.type?.defaultFees || [];
                                const positiveLineItems = lineItems.filter((i: any) => Number(i.amount) > 0);
                                const positiveDefaultFees = defaultFees.filter((f: any) => Number(f.amount) > 0);
                                const computedItems = [
                                    { label: "Mayor's Permit Fee", amount: Number(fiscalSnapshot.basicTax) || 0 },
                                    { label: "Business Tax", amount: Number(fiscalSnapshot.additionalTax) || 0 }
                                ].filter(item => item.amount > 0);

                                // Authoritative total: prefer transaction.totalAmount (always written by server),
                                // then fiscalSnapshot.totalAmount, then sum of line items / defaultFees.
                                const authTotal =
                                    Number(transaction.totalAmount) ||
                                    Number(fiscalSnapshot.totalAmount) ||
                                    (positiveLineItems.length > 0
                                        ? positiveLineItems.reduce((a: number, i: any) => a + (Number(i.amount) || 0), 0)
                                        : (computedItems.length > 0
                                            ? computedItems.reduce((a: number, item: any) => a + item.amount, 0)
                                            : positiveDefaultFees.reduce((a: number, f: any) => a + (Number(f.amount) || 0), 0)));

                                // Determine which set of line items to display
                                const displayItems: { label: string; amount: number }[] =
                                    positiveLineItems.length > 0
                                        ? positiveLineItems.map((i: any) => ({ label: i.label, amount: Number(i.amount) || 0 }))
                                        : computedItems.length > 0
                                            ? computedItems
                                            : positiveDefaultFees.map((f: any) => ({ label: f.label, amount: Number(f.amount) || 0 }));

                                if (isInspectionAssessment) {
                                    const editableTotal = feeItems.reduce((total, item) => total + (Number(item.amount) || 0), 0);

                                    return (
                                        <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] p-4 space-y-3">
                                                {feeItems.map((item, idx) => (
                                                    <div key={idx} className="grid grid-cols-12 gap-3 items-end">
                                                        <div className="col-span-12 md:col-span-7 space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                                Fee label
                                                            </Label>
                                                            <Input
                                                                value={item.label}
                                                                onChange={(e) => updateFeeItem(idx, "label", e.target.value)}
                                                                placeholder="Enter additional fee label"
                                                                className="h-11 rounded-xl bg-white dark:bg-[#101725] text-xs font-black"
                                                            />
                                                        </div>
                                                        <div className="col-span-9 md:col-span-4 space-y-1.5">
                                                            <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                                Amount
                                                            </Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={item.amount}
                                                                onChange={(e) => updateFeeItem(idx, "amount", e.target.value)}
                                                                placeholder="0.00"
                                                                className="h-11 rounded-xl bg-white dark:bg-[#101725] text-xs font-black"
                                                            />
                                                        </div>
                                                        <div className="col-span-3 md:col-span-1">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => removeFeeItem(idx)}
                                                                className="h-11 w-full rounded-xl border-slate-200 dark:border-white/10 text-slate-400 hover:text-red-500 hover:border-red-200"
                                                                title="Remove fee"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}

                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={addFeeItem}
                                                    className="w-full h-11 rounded-xl border-dashed border-slate-300 dark:border-white/15 text-xs font-black uppercase tracking-wider"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Additional Fee
                                                </Button>
                                            </div>

                                            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-white/10 text-base font-black text-primary italic">
                                                <span>Total Amount</span>
                                                <span>₱{editableTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="mt-6 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                        {displayItems.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>{item.label}</span>
                                                <span className="dark:text-slate-200">₱{item.amount.toFixed(2)}</span>
                                            </div>
                                        ))}

                                        {Number(fiscalSnapshot.deliveryFee) > 0 && (
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-white/5 text-sm font-bold text-slate-600 dark:text-slate-400 italic">
                                                <span>Delivery Fee</span>
                                                <span className="dark:text-slate-200">₱{Number(fiscalSnapshot.deliveryFee).toFixed(2)}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-white/10 text-base font-black text-primary italic">
                                            <span>Total Amount Assessed</span>
                                            <span>₱{authTotal.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* RESIDENT IDENTITY PROFILE */}
                    <ResidentIdentityProfile
                        resident={resident}
                        safeFormatDate={safeFormatDate}
                        themeColor={themeColor}
                    />

                    {/* BUSINESS RECORD ACCORDION */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-10 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 animate-in fade-in duration-300">
                        <button
                            type="button"
                            onClick={() => setIsBusinessRecordExpanded(!isBusinessRecordExpanded)}
                            className="flex items-center justify-between w-full text-left focus:outline-none group"
                        >
                            <div>
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter text-[#1e293b] dark:text-white leading-none">
                                    Business <span className="text-primary">Record</span>
                                </h2>
                                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] italic mt-2">
                                    BPLO Registration Details
                                </p>
                            </div>
                            <div className="text-slate-400 group-hover:text-primary transition-colors">
                                <div className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:border-primary/40 transition-all">
                                    {isBusinessRecordExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>
                        </button>

                        {isBusinessRecordExpanded && (
                            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-8 animate-in fade-in duration-300">
                                <div className="grid grid-cols-12 gap-x-6 gap-y-6">
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

                                    <div className="col-span-12 md:col-span-6 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Line of Business</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.lineOfBusiness || "General"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-6 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">
                                            {isRenewal ? "Existing Permit License" : "Registration / Permit No."}
                                        </label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-primary truncate">
                                            {transaction.businessPermit?.permitNumber || additional?.existingPermitNumber || additional?.permitNumber || additional?.dtiSecNumber || "--"}
                                        </div>
                                    </div>

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

                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Branch Type</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase truncate">
                                            {additional?.businessBranch || "MAIN"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">TIN Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.tinNumber || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">PhilHealth Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.philhealthNumber || "--"}
                                        </div>
                                    </div>

                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Pag-Ibig MID Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.pagibigNumber || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">SSS Number</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                            {additional?.sssNumber || "--"}
                                        </div>
                                    </div>
                                    <div className="col-span-12 md:col-span-4 space-y-2">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">Registration Type</label>
                                        <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 uppercase">
                                            {additional?.registrationType || "DTI"}
                                        </div>
                                    </div>

                                    {additional?.businessType === "NEW" && (
                                        <>
                                            <div className="col-span-12 md:col-span-6 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">{additional?.registrationType || "DTI"} Registration Number</label>
                                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-primary truncate">
                                                    {additional?.dtiSecNumber || "--"}
                                                </div>
                                            </div>
                                            <div className="col-span-12 md:col-span-6 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 ml-1">{additional?.registrationType || "DTI"} Registration Date</label>
                                                <div className="h-12 flex items-center px-5 bg-[#f8fafd] dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
                                                    {additional?.dtiSecDate || "--"}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ALL REQUIREMENTS — Accordion */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border-slate-50 dark:border-white/5 border animate-in fade-in duration-300">
                        <button
                            type="button"
                            onClick={() => setIsRequirementsExpanded(!isRequirementsExpanded)}
                            className="flex items-center justify-between w-full text-left focus:outline-none group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg"><FileText className="text-primary w-4 h-4" /></div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">All the Requirements</span>
                                    <span className="text-[9px] text-slate-400 dark:text-slate-600 italic font-bold">{evidenceDocs.length} document{evidenceDocs.length !== 1 ? 's' : ''} submitted</span>
                                </div>
                            </div>
                            <div className="text-slate-400 group-hover:text-primary transition-colors">
                                <div className="w-9 h-9 rounded-full border border-slate-200 dark:border-white/10 flex items-center justify-center hover:border-primary/40 transition-all">
                                    {isRequirementsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                            </div>
                        </button>

                        {isRequirementsExpanded && (
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                {evidenceDocs.map((doc, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                            if (doc.url) {
                                                handleViewFile(doc.url, doc.label, evidenceDocs, i);
                                            }
                                        }}
                                        className="group relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 cursor-pointer hover:border-primary/50 transition-all select-none aspect-video text-left w-full block"
                                    >
                                        {doc.url ? (
                                            isImageFile(doc.url) ? (
                                                <>
                                                    <Image src={isValidUrl(doc.url) ? doc.url : "/placeholder.png"} alt={doc.label} fill className="object-cover group-hover:scale-105 transition-all" />
                                                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-white font-black italic uppercase tracking-wider text-[8px] truncate">
                                                        {doc.label}
                                                    </div>
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                        <div
                                                            style={{ backgroundColor: themeColor }}
                                                            className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px]"
                                                        >
                                                            <span>View</span>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-white dark:from-[#111827] dark:to-[#0b1220]" />
                                                    <div className="relative h-full w-full flex flex-col items-center justify-center gap-3 p-6">
                                                        <div className="w-14 h-14 rounded-2xl bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center">
                                                            <FileText className="w-7 h-7 text-primary" />
                                                        </div>
                                                        <div className="text-center min-w-0">
                                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                                                {getFileExtension(doc.url).toUpperCase() || "DOC"} File
                                                            </p>
                                                            <p className="mt-1 text-sm font-black italic uppercase tracking-tight text-slate-800 dark:text-white truncate max-w-[220px]">
                                                                {doc.label}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="absolute inset-x-3 bottom-3 rounded-xl bg-slate-950/75 backdrop-blur-md px-3 py-2 text-center text-white font-black italic uppercase tracking-widest text-[9px] opacity-90 group-hover:opacity-100 transition-opacity">
                                                        Open Document
                                                    </div>
                                                </>
                                            )
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 gap-1.5 p-4">
                                                <Camera className="w-6 h-6 mx-auto" />
                                                <span className="text-[8px] font-black uppercase text-center tracking-widest leading-none block">{doc.label}</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Workflow Tracking & Executive Controls */}
                <div className="col-span-12 lg:col-span-4 space-y-8 sticky top-16 self-start">
                    {/* WORKFLOW TRACKING */}
                    <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-10 border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-8">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Status Tracking</span>
                            <h2 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white mt-1 leading-none">Timeline</h2>
                        </div>

                        <div className="relative pl-6 border-l-2 border-slate-100 dark:border-white/5 space-y-8">
                            {steps.map((step, idx) => {
                                // When status is FOR_PROCESSING, mark PROCESSING as checked (green)
                                // but do NOT highlight the next step — it stays grey as a future step.
                                const isForProcessing = transaction.status === "FOR_PROCESSING";
                                const effectiveStepIdx = isForProcessing
                                    ? currentStepIdx + 1
                                    : currentStepIdx;
                                const isCompleted = idx < effectiveStepIdx;
                                const isActive = !isForProcessing && idx === currentStepIdx;
                                return (
                                    <div key={idx} className="relative">
                                        <div className={cn(
                                            "absolute w-4 h-4 rounded-full -left-[33px] border-4 transition-all duration-500",
                                            isActive
                                                ? "bg-primary border-white dark:border-[#151b28] ring-4 ring-primary/20 scale-110"
                                                : isCompleted
                                                    ? "bg-emerald-500 border-white dark:border-[#151b28] scale-100"
                                                    : "bg-slate-200 dark:bg-slate-800 border-white dark:border-[#151b28] scale-95"
                                        )} />
                                        <div className="space-y-1">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-widest",
                                                isActive
                                                    ? "text-primary"
                                                    : isCompleted
                                                        ? "text-emerald-500"
                                                        : "text-slate-400 dark:text-slate-600"
                                            )}>
                                                {step.label}
                                            </span>
                                            {isActive && (
                                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight italic">
                                                    Current processing status.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    {/* END WORKFLOW TRACKING CARD */}

                    {/* CITIZEN PAYMENT PROOF CARD */}
                    {(() => {
                        const hasImage = transaction.paymentReference && (transaction.paymentReference.startsWith("http") || transaction.paymentReference.startsWith("/"));
                        const gcashRef = (transaction.additionalData as any)?.gcashReferenceNo;
                        const paymentRef = transaction.paymentReference && !isValidUrl(transaction.paymentReference) ? transaction.paymentReference : null;
                        const additionalPaymentId = (transaction.additionalData as any)?.paymentId || (transaction.additionalData as any)?.id || (transaction.additionalData as any)?.payment_id;
                        const refNo = gcashRef || paymentRef || additionalPaymentId;

                        if (!hasImage && !refNo) return null;

                        return (
                            <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-8 border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
                                        <Camera className="w-4 h-4" style={{ color: themeColor }} />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Citizen Payment</span>
                                        <span className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Proof of Payment</span>
                                    </div>
                                </div>

                                {hasImage ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleViewFile(transaction.paymentReference, "Proof of Payment");
                                        }}
                                        className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block cursor-zoom-in animate-in fade-in"
                                    >
                                        <Image
                                            src={isValidUrl(transaction.paymentReference) ? transaction.paymentReference : "/placeholder.png"}
                                            alt="Payment Proof"
                                            fill
                                            className="object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                                            <div
                                                style={{ backgroundColor: themeColor }}
                                                className="backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px]"
                                            >
                                                <span>View</span>
                                            </div>
                                        </div>
                                    </button>
                                ) : null}

                                {refNo ? (
                                    <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-2 mt-2 group/ref relative overflow-hidden transition-all hover:border-primary/20 shadow-sm animate-in fade-in">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Hash className="w-3.5 h-3.5 text-primary" />
                                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Payment Reference No.</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(refNo);
                                                    toast.success("Reference number copied!");
                                                }}
                                                className="text-slate-400 hover:text-primary transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-white/5"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                        <p className="text-sm font-black italic tracking-widest font-mono text-slate-800 dark:text-slate-200 select-all">
                                            {refNo}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })()}

                    {/* EXECUTIVE ACTIONS */}
                    <div className="space-y-4 pt-4">
                        {/* Inspection phase actions */}
                        {(transaction.status === "FOR_INSPECTION" || transaction.status === "FOR_REINSPECTION") && (
                            <div className="space-y-4">
                                {transaction.status === "FOR_REINSPECTION" && (() => {
                                    const orNo = additional?.orSeriesNumber || transaction.orSeriesNumber || additional?.orNumber || additional?.orNo;
                                    const orDocUrl = additional?.orDocumentUrl || transaction.orUrl || additional?.orUrl;

                                    if (!orNo && !orDocUrl) return null;

                                    return (
                                        <div className="bg-white dark:bg-[#151b28] rounded-[2rem] p-8 md:p-10 shadow-[0_2px_40px_rgba(0,0,0,0.02)] border border-slate-50 dark:border-white/5 space-y-4 animate-in fade-in duration-300">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-xl bg-green-500/10 text-green-500">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Treasury Official Receipt</span>
                                                    <span className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">O.R. Details</span>
                                                </div>
                                            </div>

                                            {orNo && (
                                                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 space-y-1">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block leading-none">O.R. Series Number</span>
                                                    <p className="text-xs font-black uppercase italic tracking-wider text-slate-800 dark:text-slate-200">
                                                        {orNo}
                                                    </p>
                                                </div>
                                            )}

                                            {orDocUrl && (
                                                <div className="space-y-2">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 block leading-none">Scanned O.R. Copy</span>
                                                    {(() => {
                                                        const isPdf = orDocUrl.toLowerCase().endsWith(".pdf") || orDocUrl.includes("application/pdf") || orDocUrl.includes(".pdf?");
                                                        if (isPdf) {
                                                            return (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleViewFile?.(orDocUrl, "Official Treasury Receipt PDF")}
                                                                    className="w-full flex items-center justify-between p-4 bg-[#151b28]/60 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-lg shrink-0 group-hover:scale-110 transition-transform">
                                                                            📕
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Receipt PDF</p>
                                                                            <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic mt-0.5 leading-none">Click to view</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="h-8 px-3 rounded-lg border border-primary/20 text-primary font-black italic uppercase tracking-widest text-[8px] group-hover:bg-primary/10 flex items-center gap-1 transition-all shrink-0">
                                                                        Open PDF ➔
                                                                    </div>
                                                                </button>
                                                            );
                                                        }

                                                        return (
                                                            <div
                                                                onClick={() => handleViewFile?.(orDocUrl, "Official Treasury Receipt")}
                                                                className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block cursor-pointer select-none"
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={orDocUrl}
                                                                    alt="OR Preview"
                                                                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                                                />
                                                                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                                                                    <div
                                                                        style={{ backgroundColor: themeColor }}
                                                                        className="backdrop-blur-md px-4 py-2 rounded-xl border border-white/25 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px] shadow-lg animate-in zoom-in-75 duration-200"
                                                                    >
                                                                        <span>View</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <Button
                                    onClick={handleEvaluate}
                                    disabled={actionLoading}
                                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider"
                                >
                                    Process The Request
                                </Button>

                                {transaction.status !== "FOR_REINSPECTION" && (
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => { setIsRequestingRevision(true); setRemarks(""); }}
                                            className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase"
                                        >
                                            Request Revision
                                        </Button>
                                        <Button
                                            onClick={() => { setIsRejecting(true); setRemarks(""); }}
                                            className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase"
                                        >
                                            Decline
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}

                        {["PAID", "FOR_CLAIM", "FOR_PICKING", "FOR_PROCESSING"].includes(transaction.status) && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-[#151b28] rounded-[2.5rem] p-8 border border-slate-50 dark:border-white/5 shadow-2xl shadow-slate-900/5 space-y-6">
                                    {/* Card header */}
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl" style={{ backgroundColor: `${themeColor}15` }}>
                                            <FileText className="w-4 h-4" style={{ color: themeColor }} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 block italic leading-none">Permit Issuance</span>
                                            <span className="text-sm font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Release Details</span>
                                        </div>
                                    </div>

                                    {isRenewal ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300">
                                            <span className="font-bold">Renewal Auto-Carried:</span> Existing Permit Number <span className="font-mono font-black">#{additional.permitNumber || additional.existingPermitNumber || "—"}</span> carries over.
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                License Business Permit Number {isProcessing && <span className="text-rose-500 font-bold">*</span>}
                                            </Label>
                                            <Input
                                                value={permitNumberInput}
                                                onChange={(e) => setPermitNumberInput(e.target.value)}
                                                placeholder={isReadOnly ? "No Permit Number" : "Enter Permit Number..."}
                                                className="h-12 rounded-xl text-sm font-bold"
                                                readOnly={isReadOnly}
                                                disabled={isReadOnly}
                                            />
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Digital Permit Upload {isProcessing ? <span className="text-rose-500 font-bold">*</span> : "(Optional)"}
                                        </Label>

                                        {isReadOnly && !hasFile ? (
                                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl p-4 bg-slate-50/50 dark:bg-white/[0.02] text-center text-xs text-slate-400 font-bold italic">
                                                No digital permit copy uploaded.
                                            </div>
                                        ) : !hasFile ? (
                                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center">
                                                <label className="cursor-pointer block space-y-2">
                                                    <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 block">Select Digital PDF/Image</span>
                                                    <Input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={(e) => setECopyFile(e.target.files?.[0] || null)}
                                                        className="hidden"
                                                    />
                                                </label>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end">
                                                {!isReadOnly && transaction.status !== "FOR_CLAIM" && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setECopyFile(null);
                                                            setTransaction((prev: any) => prev ? { ...prev, eCopyUrl: "" } : null);
                                                        }}
                                                        className="text-xs font-black text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 px-3 py-1 rounded-xl h-auto"
                                                    >
                                                        ✕ Clear / Change File
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {/* PREVIEW CONTAINER */}
                                        {hasFile && (
                                            <div className="mt-4">
                                                {(() => {
                                                    const isPdf = eCopyFile
                                                        ? (eCopyFile.type === "application/pdf" || eCopyFile.name.toLowerCase().endsWith(".pdf"))
                                                        : (transaction.eCopyUrl?.toLowerCase()?.includes(".pdf") || false);

                                                    const targetUrl = eCopyPreview || transaction.eCopyUrl;

                                                    if (isPdf) {
                                                        return (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleViewFile(targetUrl, "Digital Permit PDF");
                                                                }}
                                                                className="w-full flex items-center justify-between p-5 bg-slate-900/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all text-left animate-in fade-in duration-300 group"
                                                            >
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 text-xl shrink-0 group-hover:scale-110 transition-transform">
                                                                        📕
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <p className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 leading-none">Digital Permit PDF</p>
                                                                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic leading-none">Click to View Document in Modal</p>
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    style={{ color: themeColor, borderColor: `${themeColor}40` }}
                                                                    className="h-9 px-4 rounded-xl border text-primary font-black italic uppercase tracking-widest text-[9px] group-hover:bg-primary/10 flex items-center gap-1.5 transition-all shrink-0"
                                                                >
                                                                    Open PDF ➔
                                                                </div>
                                                            </button>
                                                        );
                                                    }
                                                    return (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleViewFile(targetUrl, "Digital Permit Document");
                                                            }}
                                                            className="relative aspect-[16/9] w-full rounded-2xl bg-slate-950 overflow-hidden border border-slate-100 dark:border-white/5 group hover:border-primary/50 transition-all text-left block cursor-zoom-in"
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={targetUrl}
                                                                alt="Digital Permit Preview"
                                                                className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                                                            />
                                                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300 backdrop-blur-[2px]">
                                                                <div
                                                                    style={{ backgroundColor: themeColor }}
                                                                    className="backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center justify-center text-white font-black italic uppercase tracking-widest text-[9px]"
                                                                >
                                                                    <span>View</span>
                                                                </div>
                                                            </div>
                                                        </button>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                            Sticker Number {isProcessing ? <span className="text-rose-500 font-bold">*</span> : "(Optional)"}
                                        </Label>
                                        <Input
                                            value={stickerNumber}
                                            onChange={(e) => setStickerNumber(e.target.value)}
                                            placeholder={isReadOnly ? "No Sticker Number" : "Enter Sticker Number..."}
                                            className="h-12 rounded-xl text-sm font-bold"
                                            readOnly={isReadOnly}
                                            disabled={isReadOnly}
                                        />
                                    </div>
                                </div>

                                {(transaction.status === "FOR_PROCESSING" || transaction.status === "FOR_PICKING") && transaction.fulfillmentType === "DELIVERY" && (
                                    <Button
                                        type="button"
                                        onClick={handlePrintWaybill}
                                        variant="outline"
                                        className="w-full h-12 rounded-xl border-2 border-primary/20 text-primary font-black italic uppercase tracking-widest text-[10px] hover:bg-primary/5 transition-all"
                                    >
                                        Generate & Print Waybill
                                    </Button>
                                )}

                                {!isReadOnly && (
                                    <Button
                                        onClick={handleRelease}
                                        disabled={actionLoading || isButtonDisabled}
                                        className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg font-black uppercase text-xs tracking-wider"
                                    >
                                        {buttonText}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Dispute Resolution Modal */}
            <Dialog open={disputeModalOpen} onOpenChange={setDisputeModalOpen}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#0f1117] rounded-3xl border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight">
                            Resolve Dispute for Business Permit
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Label className="text-xs font-black text-rose-500 uppercase">Resolution / Dispute Details</Label>
                        <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Provide resolution description..."
                            className="min-h-[100px] rounded-xl"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={handleResolveDispute}
                                disabled={isResolvingDispute}
                                className="flex-1 h-11 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold"
                            >
                                Confirm Resolution
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setDisputeModalOpen(false)}
                                className="flex-1 h-11 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Request Revision Modal */}
            <Dialog open={isRequestingRevision} onOpenChange={setIsRequestingRevision}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#0f1117] rounded-3xl border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight">
                            Request Revision
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Label className="text-xs font-black text-amber-500 uppercase">Reason for Revision Request</Label>
                        <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Provide details about the required revision..."
                            className="min-h-[100px] rounded-xl"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={handleRequestRevision}
                                disabled={actionLoading}
                                className="flex-1 h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                            >
                                Send Request
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsRequestingRevision(false)}
                                className="flex-1 h-11 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Decline/Reject Modal */}
            <Dialog open={isRejecting} onOpenChange={setIsRejecting}>
                <DialogContent className="sm:max-w-md bg-white dark:bg-[#0f1117] rounded-3xl border-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-rose-600">
                            Decline Request
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Label className="text-xs font-black text-rose-500 uppercase">Reason for Decline / Rejection</Label>
                        <Textarea
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Explain reason for decline..."
                            className="min-h-[100px] rounded-xl"
                        />
                        <div className="flex gap-2">
                            <Button
                                onClick={handleReject}
                                disabled={actionLoading}
                                className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                            >
                                Decline Request
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsRejecting(false)}
                                className="flex-1 h-11 rounded-xl text-xs font-bold"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Document Viewer Modal for premium visual quality previews */}
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
        </div>
    );
}
