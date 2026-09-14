"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getArchivedOccupancyPermits, createArchivedOccupancyPermit, updateArchivedOccupancyPermit } from "../actions";
import {
    Search,
    Plus,
    FileText,
    Eye,
    Pencil,
    FolderArchive,
    Calendar,
    MapPin,
    Building2,
    RefreshCw,
    HardHat,
    CheckCircle2,
    Trash2,
    UploadCloud,
    Loader2,
    ZoomIn,
    FileUp,
    Printer,
    Info,
    HelpCircle,
    FolderSearch,
    Clock,
    Link2,
    ShieldCheck,
    RotateCcw,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { compressDocumentScan } from "@/lib/image-compression";

const MAPANDAN_BARANGAYS = [
    "Amanoaoac",
    "Apaya",
    "Aserda",
    "Baloling",
    "Bogaoan",
    "Bolo",
    "Coliling",
    "Golden",
    "Jimenez",
    "Nilombot",
    "Poblacion",
    "Primicias",
    "Santa Maria",
    "Torres",
];

const OCCUPANCY_TYPES = [
    "Residential",
    "Commercial",
    "Industrial",
    "Institutional",
    "Agricultural",
    "Other Construction",
];

const OCCUPANCY_DOCUMENT_PRESETS = [
    "Fire Safety Inspection Certificate (FSIC - BFP)",
    "Certificate of Final Electrical Inspection (CFEI)",
    "Certificate of Completion (Signed & Sealed)",
    "As-Built Architectural / Civil Plans",
    "Sanitary & Plumbing Final Inspection",
    "Approved Building Permit Copy",
];

export interface SupplementaryAttachmentItem {
    id: string;
    label: string;
    file: File | null;
    previewUrl?: string;
    existingUrl?: string;
    isImage: boolean;
    isPdf: boolean;
    fileSizeFormatted?: string;
    scannedAt?: number;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatScanTimeAgo(timestamp?: number): string {
    if (!timestamp) return "";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 10) return "Just scanned now";
    if (seconds < 60) return `Scanned ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Scanned ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Scanned ${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
}

function guessScanDocumentLabel(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.includes("fsic") || lower.includes("fire")) {
        return "Fire Safety Inspection Certificate (FSIC - BFP)";
    }
    if (lower.includes("cfei") || lower.includes("elect")) {
        return "Certificate of Final Electrical Inspection (CFEI)";
    }
    if (lower.includes("complet")) {
        return "Certificate of Completion (Signed & Sealed)";
    }
    if (lower.includes("plan") || lower.includes("built") || lower.includes("arch")) {
        return "As-Built Architectural / Civil Plans";
    }
    if (lower.includes("sanitary") || lower.includes("plumb")) {
        return "Sanitary & Plumbing Final Inspection";
    }
    if (lower.includes("bp") || lower.includes("building")) {
        return "Approved Building Permit Copy";
    }
    return "Official Supplementary Document";
}

const INITIAL_FORM_STATE = {
    permitNumber: "",
    buildingPermitNumber: "",
    firstName: "",
    lastName: "",
    applicantName: "",
    contactNumber: "",
    email: "",
    province: "Pangasinan",
    municipality: "Mapandan",
    barangay: "Poblacion",
    street: "",
    houseNumber: "",
    occupancyUse: "Residential",
    projectType: "",
    estimatedCost: "",
    totalFloors: "1",
    isLotOwner: "Yes",
    remarks: "",
    dateIssued: new Date().toISOString().split("T")[0],
    dateOfCompletion: "",
};

interface OccupancyArchiveClientProps {
    themeColor?: string;
}

export default function OccupancyArchiveClient({ themeColor = "#2563eb" }: OccupancyArchiveClientProps) {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [search, setSearch] = useState("");
    const [sourceType, setSourceType] = useState<"ALL" | "PHYSICAL" | "ONLINE">("ALL");
    const [barangay, setBarangay] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Modal Form Lifecycle & Mode States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Existing Documents in Edit Mode
    const [existingMainPermitUrl, setExistingMainPermitUrl] = useState<string | null>(null);

    const [isCustomOccupancy, setIsCustomOccupancy] = useState(false);

    // Form inputs
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    // Primary Certificate Scan
    const [mainPermitFile, setMainPermitFile] = useState<File | null>(null);
    const [mainPermitPreview, setMainPermitPreview] = useState<string | null>(null);
    const [mainPermitScannedAt, setMainPermitScannedAt] = useState<number | null>(null);

    const DEFAULT_PRESETS: SupplementaryAttachmentItem[] = [
        {
            id: "preset-fsic",
            label: "Fire Safety Inspection Certificate (FSIC - BFP)",
            file: null,
            isImage: false,
            isPdf: false,
        },
        {
            id: "preset-completion",
            label: "Certificate of Completion (Signed & Sealed)",
            file: null,
            isImage: false,
            isPdf: false,
        },
    ];

    // Supplementary Attachments
    const [additionalAttachments, setAdditionalAttachments] = useState<SupplementaryAttachmentItem[]>(DEFAULT_PRESETS);

    // Clean up created object URLs to avoid memory leaks
    const cleanupAttachmentUrls = useCallback(() => {
        if (mainPermitPreview) {
            URL.revokeObjectURL(mainPermitPreview);
        }
        additionalAttachments.forEach(att => {
            if (att.previewUrl) {
                URL.revokeObjectURL(att.previewUrl);
            }
        });
    }, [mainPermitPreview, additionalAttachments]);

    // STRICT MODAL TERMINATION: Clean state slate when modal closes or switches records
    const resetModalState = useCallback(() => {
        cleanupAttachmentUrls();
        setFormData(INITIAL_FORM_STATE);
        setIsCustomOccupancy(false);
        setMainPermitFile(null);
        setMainPermitPreview(null);
        setMainPermitScannedAt(null);
        setExistingMainPermitUrl(null);
        setAdditionalAttachments([
            {
                id: `preset-fsic-${Date.now()}`,
                label: "Fire Safety Inspection Certificate (FSIC - BFP)",
                file: null,
                isImage: false,
                isPdf: false,
            },
            {
                id: `preset-completion-${Date.now()}`,
                label: "Certificate of Completion (Signed & Sealed)",
                file: null,
                isImage: false,
                isPdf: false,
            },
        ]);
        setEditingRecordId(null);
        setModalMode("CREATE");
    }, [cleanupAttachmentUrls]);

    // Open Create Modal
    const handleOpenCreateModal = () => {
        resetModalState();
        setIsCustomOccupancy(false);
        setModalMode("CREATE");
        setIsCreateOpen(true);
    };

    // Open Edit Modal with strict population
    const handleOpenEditModal = (item: any) => {
        resetModalState();
        setModalMode("EDIT");
        setEditingRecordId(item.id);

        const standardTypes = ["Residential", "Commercial", "Industrial", "Institutional", "Agricultural"];
        const currentUse = (item.occupancyUse || "Residential").trim();
        const isStandard = standardTypes.includes(currentUse);

        setIsCustomOccupancy(!isStandard);

        setFormData({
            permitNumber: item.permitNumber || "",
            buildingPermitNumber: item.buildingPermitNumber && item.buildingPermitNumber !== "N/A" ? item.buildingPermitNumber : "",
            firstName: item.firstName || "",
            lastName: item.lastName || "",
            applicantName: item.applicantName || "",
            contactNumber: item.contactNumber && item.contactNumber !== "N/A" ? item.contactNumber : "",
            email: item.email || "",
            province: item.province || "Pangasinan",
            municipality: item.municipality || "Mapandan",
            barangay: item.barangay || "Poblacion",
            street: item.street || "",
            houseNumber: item.houseNumber || "",
            dateIssued: item.dateIssued ? new Date(item.dateIssued).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            dateOfCompletion: item.dateOfCompletion ? new Date(item.dateOfCompletion).toISOString().split("T")[0] : "",
            projectType: item.projectType || "",
            occupancyUse: currentUse === "Other Construction" ? "" : currentUse,
            estimatedCost: item.estimatedCost ? String(item.estimatedCost) : "",
            totalFloors: item.totalFloors || "1",
            isLotOwner: item.isLotOwner || "Yes",
            remarks: item.remarks || "",
        });

        // Set existing primary document
        if (item.primaryDocumentUrl) {
            setExistingMainPermitUrl(item.primaryDocumentUrl);
        }

        // Map existing supplementary documents directly into unified additionalAttachments list
        const remainingDocs = (item.documents || []).filter((d: any) => d.url !== item.primaryDocumentUrl);
        const mappedAttachments: SupplementaryAttachmentItem[] = remainingDocs.map((doc: any, idx: number) => {
            const url = doc.url || "";
            const isPdf = url.toLowerCase().endsWith(".pdf") || (doc.fileName || "").toLowerCase().endsWith(".pdf");
            return {
                id: `existing-doc-${idx}-${Date.now()}`,
                label: doc.label || doc.title || `Supplementary Document ${idx + 1}`,
                file: null,
                previewUrl: url,
                existingUrl: url,
                isImage: !isPdf,
                isPdf: isPdf,
                fileSizeFormatted: doc.fileName || "Archived Document",
            };
        });

        setAdditionalAttachments(mappedAttachments);
        setIsCreateOpen(true);
    };

    // Local Inspection Lightbox State for Newly Selected Draft Files (with Rotate & DocumentViewerModal support)
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [activeDraftPreview, setActiveDraftPreview] = useState<{
        url: string;
        title: string;
        isPdf: boolean;
        targetType?: "main" | "attachment";
        targetId?: string;
        file?: File | null;
    } | null>(null);

    // Open rich DocumentViewerModal for draft scans
    const handleInspectDraftFile = (
        title: string,
        file: File | null,
        previewUrl?: string,
        targetType?: "main" | "attachment",
        targetId?: string
    ) => {
        if (!file || !previewUrl) return;
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        setActiveDraftPreview({
            url: previewUrl,
            title,
            isPdf,
            targetType,
            targetId,
            file,
        });
        setPreviewModalOpen(true);
    };

    // Callback when user rotates the draft image 90° in DocumentViewerModal
    const handleSaveRotatedDraftFile = (newFile: File, newPreviewUrl: string) => {
        if (!activeDraftPreview) return;

        const oldPreviewUrl = activeDraftPreview.url;

        if (activeDraftPreview.targetType === "main") {
            setMainPermitFile(newFile);
            setMainPermitPreview(newPreviewUrl);
            setActiveDraftPreview(prev => (prev ? { ...prev, url: newPreviewUrl, file: newFile } : null));

            if (oldPreviewUrl && oldPreviewUrl !== newPreviewUrl) {
                URL.revokeObjectURL(oldPreviewUrl);
            }
            toast.success("Certificate scan rotated 90° and saved!");
        } else if (activeDraftPreview.targetType === "attachment" && activeDraftPreview.targetId) {
            const targetId = activeDraftPreview.targetId;
            setAdditionalAttachments(prev =>
                prev.map(att => {
                    if (att.id !== targetId) return att;
                    if (att.previewUrl && att.previewUrl !== newPreviewUrl) {
                        URL.revokeObjectURL(att.previewUrl);
                    }
                    return {
                        ...att,
                        file: newFile,
                        previewUrl: newPreviewUrl,
                        fileSizeFormatted: formatFileSize(newFile.size),
                    };
                })
            );
            setActiveDraftPreview(prev => (prev ? { ...prev, url: newPreviewUrl, file: newFile } : null));
            toast.success("Attachment scan rotated 90° and saved!");
        }
    };

    // Folder Scanner Upload ref
    const [scannerGuideOpen, setScannerGuideOpen] = useState(false);

    // Document Viewer for Archived Rows
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerDocuments, setViewerDocuments] = useState<{ url: string; label: string; fileName?: string }[]>([]);
    const [viewerTitle, setViewerTitle] = useState("");

    // Unmount cleanup
    useEffect(() => {
        return () => {
            cleanupAttachmentUrls();
        };
    }, [cleanupAttachmentUrls]);

    // Fetch Records
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getArchivedOccupancyPermits({
                page,
                limit: 10,
                search,
                sourceType,
                barangay,
                startDate,
                endDate,
            });

            if (res.success && res.data) {
                setData(res.data);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalCount(res.pagination?.totalCount || 0);
            } else {
                toast.error(res.error || "Failed to load occupancy archives.");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error("An error occurred while loading occupancy archives.");
        } finally {
            setLoading(false);
        }
    }, [page, search, sourceType, barangay, startDate, endDate]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timeout);
    }, [fetchData]);

    // Handle File Drop / Selection with Compression
    const handleMainFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const compressed = await compressDocumentScan(file);
            const preview = URL.createObjectURL(compressed);
            setMainPermitFile(compressed);
            setMainPermitPreview(preview);
            setMainPermitScannedAt(Date.now());
            toast.success(`Loaded Certificate of Occupancy scan`);
        } catch (err) {
            console.error("Compression error:", err);
            const preview = URL.createObjectURL(file);
            setMainPermitFile(file);
            setMainPermitPreview(preview);
            setMainPermitScannedAt(Date.now());
        }
    };

    // Add Attachment Row
    const handleAddAttachment = () => {
        setAdditionalAttachments(prev => [
            ...prev,
            {
                id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                label: "Additional Clearance / Plan",
                file: null,
                isImage: false,
                isPdf: false,
            }
        ]);
    };

    const handleRemoveAttachment = (id: string) => {
        setAdditionalAttachments(prev => {
            const item = prev.find(i => i.id === id);
            if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
            return prev.filter(i => i.id !== id);
        });
    };

    // Detach attached file/scan from row while preserving the custom label/title
    const handleDetachAttachmentFile = (id: string) => {
        setAdditionalAttachments(prev =>
            prev.map(item => {
                if (item.id !== id) return item;
                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }
                return {
                    ...item,
                    file: null,
                    previewUrl: undefined,
                    existingUrl: undefined,
                    isImage: false,
                    isPdf: false,
                    fileSizeFormatted: undefined,
                    scannedAt: undefined,
                };
            })
        );
    };

    const handleAttachmentFileChange = async (id: string, file: File | null) => {
        if (!file) return;
        try {
            const compressed = await compressDocumentScan(file);
            const preview = URL.createObjectURL(compressed);
            setAdditionalAttachments(prev => prev.map(item => {
                if (item.id === id) {
                    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                    return {
                        ...item,
                        file: compressed,
                        previewUrl: preview,
                        isImage: compressed.type.startsWith("image/"),
                        isPdf: compressed.type.includes("pdf"),
                        label: (!item.label || item.label.startsWith("Additional Clearance") || item.label.startsWith("Supplementary Document"))
                            ? guessScanDocumentLabel(file.name)
                            : item.label,
                        scannedAt: Date.now(),
                    };
                }
                return item;
            }));
        } catch (err) {
            console.error("Compression err:", err);
            const preview = URL.createObjectURL(file);
            setAdditionalAttachments(prev => prev.map(item => {
                if (item.id === id) {
                    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
                    return {
                        ...item,
                        file,
                        previewUrl: preview,
                        isImage: file.type.startsWith("image/"),
                        isPdf: file.type.includes("pdf"),
                        label: (!item.label || item.label.startsWith("Additional Clearance") || item.label.startsWith("Supplementary Document"))
                            ? guessScanDocumentLabel(file.name)
                            : item.label,
                        scannedAt: Date.now(),
                    };
                }
                return item;
            }));
        }
    };

    // Submit Digitize Form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.permitNumber.trim()) {
            toast.error("Occupancy Permit Number is required.");
            return;
        }

        const computedApplicant = formData.applicantName.trim() || `${formData.firstName} ${formData.lastName}`.trim();
        if (!computedApplicant) {
            toast.error("Applicant Name is required.");
            return;
        }

        const finalOccupancyUse = formData.occupancyUse.trim();
        if (!finalOccupancyUse || finalOccupancyUse === "Other Construction") {
            toast.error("Please specify the Occupancy Classification.");
            return;
        }

        setSubmitting(true);
        try {
            const dataToSubmit = new FormData();
            dataToSubmit.append("permitNumber", formData.permitNumber.trim());
            dataToSubmit.append("buildingPermitNumber", formData.buildingPermitNumber.trim());
            dataToSubmit.append("firstName", formData.firstName.trim());
            dataToSubmit.append("lastName", formData.lastName.trim());
            dataToSubmit.append("province", formData.province.trim() || "Pangasinan");
            dataToSubmit.append("municipality", formData.municipality.trim() || "Mapandan");
            dataToSubmit.append("barangay", formData.barangay);
            dataToSubmit.append("street", formData.street.trim());
            dataToSubmit.append("houseNumber", formData.houseNumber.trim());
            dataToSubmit.append("contactNumber", formData.contactNumber.trim());
            dataToSubmit.append("email", formData.email.trim());
            dataToSubmit.append("dateIssued", formData.dateIssued);
            dataToSubmit.append("dateOfCompletion", formData.dateOfCompletion);
            dataToSubmit.append("projectType", formData.projectType.trim() || finalOccupancyUse);
            dataToSubmit.append("occupancyUse", finalOccupancyUse);
            dataToSubmit.append("estimatedCost", formData.estimatedCost || "0");
            dataToSubmit.append("totalFloors", formData.totalFloors || "1");
            dataToSubmit.append("isLotOwner", formData.isLotOwner || "Yes");
            dataToSubmit.append("remarks", formData.remarks.trim());

            if (mainPermitFile) {
                dataToSubmit.append("mainPermitScan", mainPermitFile);
            }

            if (modalMode === "EDIT") {
                dataToSubmit.append("transactionId", editingRecordId || "");
                if (existingMainPermitUrl) {
                    dataToSubmit.append("existingMainUrl", existingMainPermitUrl);
                }
                // Retain all existing attachments from the unified additionalAttachments list
                const retainedExistingDocs = additionalAttachments
                    .filter(item => item.existingUrl && item.file === null)
                    .map(item => ({
                        title: item.label,
                        url: item.existingUrl,
                        fileName: item.fileSizeFormatted || item.existingUrl?.split("/").pop() || "document.webp"
                    }));
                dataToSubmit.append("existingDocuments", JSON.stringify(retainedExistingDocs));
            }

            const validAttachments = additionalAttachments.filter(item => item.file !== null);
            dataToSubmit.append("attachmentCount", validAttachments.length.toString());
            validAttachments.forEach((item, index) => {
                dataToSubmit.append(`attachmentFile_${index}`, item.file as File);
                dataToSubmit.append(`attachmentLabel_${index}`, item.label);
            });

            const res = modalMode === "EDIT"
                ? await updateArchivedOccupancyPermit(dataToSubmit)
                : await createArchivedOccupancyPermit(dataToSubmit);

            if (res.success) {
                toast.success(res.message || (modalMode === "EDIT" ? "Record updated successfully!" : "Occupancy record archived successfully!"));
                setIsCreateOpen(false);
                resetModalState();
                fetchData();
            } else {
                toast.error(res.error || "Failed to save occupancy permit record.");
            }
        } catch (error: any) {
            console.error("Submit error:", error);
            toast.error(error.message || "An error occurred while saving.");
        } finally {
            setSubmitting(false);
        }
    };

    // Open Document Viewer Modal
    const handleOpenViewer = (item: any) => {
        setViewerTitle(`Occupancy Permit: ${item.permitNumber} — ${item.applicantName}`);
        setViewerDocuments(item.documents || []);
        setViewerOpen(true);
    };

    // Calculate Stats
    const physicalCount = data.filter(d => d.isPhysicalArchive).length;
    const onlineCount = data.filter(d => !d.isPhysicalArchive).length;
    const barangaysCovered = new Set(data.map(d => d.location)).size;

    return (
        <div className="space-y-6">
            {/* Top Stat Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Total Occupancy Records
                        </span>
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <FolderArchive className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {totalCount}
                        </span>
                        <span className="text-xs font-medium text-slate-400">Total Archival Pool</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Physical Paper Scans
                        </span>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <FolderSearch className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                            {physicalCount}
                        </span>
                        <span className="text-xs font-medium text-slate-400">Digitized Vault</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                            Online Released
                        </span>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                            {onlineCount}
                        </span>
                        <span className="text-xs font-medium text-slate-400">Portal Applications</span>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            Barangays Recorded
                        </span>
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                            {barangaysCovered}
                        </span>
                        <span className="text-xs font-medium text-slate-400">Municipal Scope</span>
                    </div>
                </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white dark:bg-[#121624] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex flex-1 flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative min-w-[240px] max-w-sm flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search Occupancy No, BP No, Applicant..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 h-10 rounded-xl text-sm"
                        />
                    </div>

                    {/* Source Filter */}
                    <Select
                        value={sourceType}
                        onValueChange={(val: any) => {
                            setSourceType(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[150px] h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                            <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Sources</SelectItem>
                            <SelectItem value="PHYSICAL">Physical Scans</SelectItem>
                            <SelectItem value="ONLINE">Online Portal</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Barangay Filter */}
                    <Select
                        value={barangay}
                        onValueChange={(val) => {
                            setBarangay(val);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[160px] h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-sm">
                            <SelectValue placeholder="Barangay" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Barangays</SelectItem>
                            {MAPANDAN_BARANGAYS.map((b) => (
                                <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Date Range Filter */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 h-10 shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div className="flex items-center gap-1 text-xs">
                            <span className="text-[10px] font-bold uppercase text-slate-400">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-transparent border-0 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer py-1"
                                title="Filter from date"
                            />
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                            <span className="text-[10px] font-bold uppercase text-slate-400">To</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setPage(1);
                                }}
                                className="bg-transparent border-0 text-xs text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer py-1"
                                title="Filter to date"
                            />
                        </div>

                        {(startDate || endDate) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setStartDate("");
                                    setEndDate("");
                                    setPage(1);
                                }}
                                className="ml-1 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title="Clear date filter"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchData}
                        className="h-10 w-10 rounded-xl border-slate-200 dark:border-slate-700"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
                    </Button>
                </div>

                {/* Digitize Action Trigger */}
                <div className="flex items-center gap-2">
                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={open => {
                            if (!open) resetModalState();
                            setIsCreateOpen(open);
                        }}
                    >
                        <Button
                            onClick={handleOpenCreateModal}
                            style={{ backgroundColor: themeColor }}
                            className="h-10 rounded-xl text-white font-bold text-xs uppercase tracking-wide gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4" />
                            Digitize Occupancy Permit
                        </Button>
                        <DialogContent 
                            onPointerDownOutside={e => {
                                if (previewModalOpen || activeDraftPreview) {
                                    e.preventDefault();
                                }
                            }}
                            onInteractOutside={e => {
                                if (previewModalOpen || activeDraftPreview) {
                                    e.preventDefault();
                                }
                            }}
                            className="sm:max-w-[95vw] lg:max-w-7xl w-[95vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden rounded-3xl bg-white dark:bg-[#0f1422] border-slate-200 dark:border-[#2a3040] flex flex-col shadow-2xl"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b] flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3.5">
                                    <div
                                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md shrink-0"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        {modalMode === "EDIT" ? <Pencil className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>
                                                {modalMode === "EDIT" ? `Edit Occupancy Archive — ${formData.permitNumber || "Record"}` : "Encode Physical Certificate of Occupancy"}
                                            </span>
                                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                                                {modalMode === "EDIT" ? "Edit Mode" : "Archive Vault"}
                                            </span>
                                        </DialogTitle>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {modalMode === "EDIT"
                                                ? "Correct applicant details, update building specifications, and manage attached scanned documents."
                                                : "Digitize walk-in physical Certificate of Occupancy hardcopies, associate with building permits, and archive clearances."
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Form Body with 2-Column Grid */}
                            <form id="occupancy-encoding-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Left Column: Data & Project Metadata (7 Cols) */}
                                    <div className="lg:col-span-7 space-y-6">
                                        {/* Section 1: Permit & Applicant Information */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <HardHat className="w-4 h-4 text-indigo-500" />
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Permit & Applicant Details
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5 sm:col-span-1">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Official Permit Number <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        required
                                                        placeholder="e.g. BP-2024-00123"
                                                        value={formData.permitNumber}
                                                        onChange={e => setFormData({ ...formData, permitNumber: e.target.value })}
                                                        className="rounded-xl h-11 font-mono font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5 sm:col-span-1">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Official Date Issued
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.dateIssued}
                                                        onChange={e => setFormData({ ...formData, dateIssued: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* First Name & Last Name (Required) */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        First Name <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        required
                                                        placeholder="Enter applicant's first name"
                                                        value={formData.firstName}
                                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                                        className="rounded-xl h-11 font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Last Name <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        required
                                                        placeholder="Enter applicant's last name"
                                                        value={formData.lastName}
                                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                                        className="rounded-xl h-11 font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* Contact Number & Email */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Contact Number
                                                    </Label>
                                                    <Input
                                                        placeholder="+63 9XX XXX XXXX"
                                                        value={formData.contactNumber}
                                                        onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Email Address
                                                    </Label>
                                                    <Input
                                                        type="email"
                                                        placeholder="e.g. applicant@email.com"
                                                        value={formData.email}
                                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* Address Hierarchy */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Province
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. Pangasinan"
                                                        value={formData.province}
                                                        onChange={e => setFormData({ ...formData, province: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Municipality / City
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. Mapandan"
                                                        value={formData.municipality}
                                                        onChange={e => setFormData({ ...formData, municipality: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Barangay
                                                    </Label>
                                                    <Select
                                                        value={formData.barangay}
                                                        onValueChange={val => setFormData({ ...formData, barangay: val })}
                                                    >
                                                        <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]">
                                                            <SelectValue placeholder="Select Barangay" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {MAPANDAN_BARANGAYS.map(brgy => (
                                                                <SelectItem key={brgy} value={brgy}>
                                                                    Brgy. {brgy}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        House / Lot & Street
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. Lot 4 Block 2, Rizal St."
                                                        value={formData.street}
                                                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Building Specifications & Scope */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <Building2 className="w-4 h-4 text-indigo-500" />
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Building Specifications & Scope
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {!isCustomOccupancy ? (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Occupancy Classification <span className="text-rose-500">*</span>
                                                        </Label>
                                                        <Select
                                                            value={formData.occupancyUse}
                                                            onValueChange={val => {
                                                                if (val === "Other Construction") {
                                                                    setIsCustomOccupancy(true);
                                                                    setFormData({ ...formData, occupancyUse: "" });
                                                                } else {
                                                                    setFormData({ ...formData, occupancyUse: val });
                                                                }
                                                            }}
                                                        >
                                                            <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]">
                                                                <SelectValue placeholder="Select Occupancy" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {OCCUPANCY_TYPES.map(occ => (
                                                                    <SelectItem key={occ} value={occ}>
                                                                        {occ}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <div className="flex items-center justify-between">
                                                            <Label className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                                                <Building2 className="w-3.5 h-3.5" />
                                                                Occupancy Classification <span className="text-rose-500">*</span>
                                                            </Label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsCustomOccupancy(false);
                                                                    setFormData({ ...formData, occupancyUse: "Residential" });
                                                                }}
                                                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                                                                title="Switch back to preset dropdown choices"
                                                            >
                                                                <RotateCcw className="w-3 h-3" />
                                                                Select from list
                                                            </button>
                                                        </div>
                                                        <Input
                                                            placeholder="Type specific classification (e.g. Grain Silo, Telecom Tower, Guardhouse)..."
                                                            value={formData.occupancyUse}
                                                            onChange={e => setFormData({ ...formData, occupancyUse: e.target.value })}
                                                            required
                                                            autoFocus
                                                            className="h-11 rounded-xl text-sm border-amber-300 dark:border-amber-700/60 focus:ring-amber-500 bg-amber-50/20 dark:bg-amber-950/10 font-medium"
                                                        />
                                                    </div>
                                                )}

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Work Scope / Project Type
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 2-Storey Commercial Building"
                                                        value={formData.projectType}
                                                        onChange={e => setFormData({ ...formData, projectType: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Estimated Cost (₱)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 750000"
                                                        value={formData.estimatedCost}
                                                        onChange={e => setFormData({ ...formData, estimatedCost: e.target.value })}
                                                        className="rounded-xl h-11 font-mono bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Total Floors
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        min="1"
                                                        placeholder="1"
                                                        value={formData.totalFloors}
                                                        onChange={e => setFormData({ ...formData, totalFloors: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5 sm:col-span-2">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Is Applicant the Lot Owner?
                                                    </Label>
                                                    <Select
                                                        value={formData.isLotOwner}
                                                        onValueChange={val => setFormData({ ...formData, isLotOwner: val })}
                                                    >
                                                        <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]">
                                                            <SelectValue placeholder="Select Lot Ownership" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Yes">Yes (Owner of the Land / TCT)</SelectItem>
                                                            <SelectItem value="No">No (Tenant / With Consent / Lease)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 pt-2">
                                                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    Archive Notes / Remarks
                                                </Label>
                                                <Textarea
                                                    placeholder="Add any specific physical folder tags, notes, or archive box reference..."
                                                    value={formData.remarks}
                                                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                                    className="text-xs rounded-xl bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    rows={3}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Document Scans & Uploads (5 Cols) */}
                                    <div className="lg:col-span-5 flex flex-col">
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm flex flex-col">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-[#2a3040] shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        Scanned Documents
                                                    </h3>
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Digital Archiving
                                                </span>
                                            </div>

                                            {/* Phase 1: Direct Scanner Ingestion Bar */}
                                            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-violet-500/10 border border-indigo-500/20 shadow-sm shrink-0 space-y-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-sm">
                                                            <Printer className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                                                <span>Scanner Station</span>
                                                                <span className="text-[9px] px-2 py-0.2 rounded-full font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                                    Direct Ingest
                                                                </span>
                                                            </h4>
                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                                Quickly import newly scanned paper permits from your office printer.
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setScannerGuideOpen(true)}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer shrink-0"
                                                        title="Office Scanner Setup Guide"
                                                    >
                                                        <HelpCircle className="w-4 h-4" />
                                                    </button>
                                                </div>

                                                <div className="pt-0.5">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setScannerGuideOpen(true)}
                                                        className="w-full h-9 rounded-xl border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                                                    >
                                                        <Info className="w-3.5 h-3.5" />
                                                        <span>Scanner Setup Guide</span>
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Primary Signed Permit Upload Box with Live Preview */}
                                            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-3 shrink-0">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Official Signed Permit (Primary)
                                                    </Label>
                                                    {mainPermitFile && (
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3" /> Ready
                                                        </span>
                                                    )}
                                                </div>

                                                {mainPermitFile ? (
                                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040]">
                                                        {mainPermitFile.type.startsWith("image/") && mainPermitPreview ? (
                                                            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shrink-0 group">
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={mainPermitPreview}
                                                                    alt="Permit Scan"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveDraftPreview({
                                                                            url: mainPermitPreview,
                                                                            title: "Official Signed Permit",
                                                                            isPdf: false,
                                                                        });
                                                                        setPreviewModalOpen(true);
                                                                    }}
                                                                    className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                                    title="Inspect Image"
                                                                >
                                                                    <ZoomIn className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="w-14 h-14 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 flex flex-col items-center justify-center shrink-0">
                                                                <FileText className="w-6 h-6" />
                                                                <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">PDF</span>
                                                            </div>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5">
                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                    {mainPermitFile.name}
                                                                </p>
                                                                {mainPermitScannedAt && (
                                                                    <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                                                        <Clock className="w-2.5 h-2.5" />
                                                                        {formatScanTimeAgo(mainPermitScannedAt)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                {formatFileSize(mainPermitFile.size)} • High-Res Official Scan (New)
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {mainPermitPreview && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => {
                                                                        handleInspectDraftFile(
                                                                            "Official Signed Permit",
                                                                            mainPermitFile,
                                                                            mainPermitPreview,
                                                                            "main"
                                                                        );
                                                                    }}
                                                                    className="h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                                                                    title="Preview scan"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    if (mainPermitPreview) URL.revokeObjectURL(mainPermitPreview);
                                                                    setMainPermitFile(null);
                                                                    setMainPermitPreview(null);
                                                                    setMainPermitScannedAt(null);
                                                                }}
                                                                className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                                                title="Remove file"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : existingMainPermitUrl ? (
                                                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040]">
                                                        <div className="w-12 h-12 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 flex items-center justify-center shrink-0">
                                                            <FileText className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                Official Signed Permit (Archived)
                                                            </p>
                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                                Stored in Cloud Archives
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => {
                                                                    setActiveDraftPreview({
                                                                        url: existingMainPermitUrl,
                                                                        title: "Official Signed Permit (Archived)",
                                                                        isPdf: existingMainPermitUrl.toLowerCase().endsWith(".pdf"),
                                                                    });
                                                                    setPreviewModalOpen(true);
                                                                }}
                                                                className="h-8 w-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                                                                title="View Document"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => setExistingMainPermitUrl(null)}
                                                                className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                                                title="Replace / Remove File"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <label className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#121622] border border-dashed border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                                                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                            <UploadCloud className="w-5 h-5" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                                {modalMode === "EDIT" ? "Upload New Replacement Permit Scan" : "Choose Official Signed Permit Scan"}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium truncate">
                                                                PDF, JPG, PNG (Click to browse file)
                                                            </p>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={handleMainFileSelect}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    Upload clear scanned image or PDF copy of the official signed permit.
                                                </p>
                                            </div>

                                            {/* Quick Presets Bar - Only displayed when creating a new record */}
                                            {modalMode === "CREATE" && (
                                                <div className="space-y-1.5 shrink-0">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                        QUICK PRESET ADDITIONS:
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {OCCUPANCY_DOCUMENT_PRESETS.map((preset, pIdx) => {
                                                            const isAlreadyAdded = additionalAttachments.some(a => a.label === preset);
                                                            return (
                                                                <button
                                                                    key={pIdx}
                                                                    type="button"
                                                                    disabled={isAlreadyAdded}
                                                                    onClick={() => {
                                                                        setAdditionalAttachments(prev => [
                                                                            ...prev,
                                                                            {
                                                                                id: `preset-${Date.now()}-${pIdx}`,
                                                                                label: preset,
                                                                                file: null,
                                                                                isImage: false,
                                                                                isPdf: false,
                                                                            }
                                                                        ]);
                                                                    }}
                                                                    className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                                                                        isAlreadyAdded
                                                                            ? "bg-slate-100 dark:bg-[#121622] text-slate-400 cursor-not-allowed opacity-50"
                                                                            : "bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040] text-slate-700 dark:text-slate-300 hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-2xs cursor-pointer"
                                                                    }`}
                                                                >
                                                                    <Plus className="w-3 h-3" /> {preset}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Supplementary Attachments List (Matching Image 1) */}
                                            <div className="space-y-3 flex flex-col flex-1">
                                                <div className="flex items-center justify-between shrink-0">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        SUPPLEMENTARY PLANS & CLEARANCES ({additionalAttachments.length})
                                                    </p>
                                                </div>

                                                {additionalAttachments.length === 0 ? (
                                                    <div
                                                        onClick={handleAddAttachment}
                                                        className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-[#121622]/40 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all cursor-pointer text-center min-h-[220px]"
                                                    >
                                                        <UploadCloud className="w-8 h-8 text-indigo-400/80 mb-2" />
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                            No Supplementary Documents
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 mt-1">
                                                            Click here or use the button below to add an attachment
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1.5 custom-scrollbar">
                                                        {additionalAttachments.map((att, idx) => {
                                                            const hasFileOrExisting = att.file !== null || Boolean(att.existingUrl);
                                                            const isImageFile = att.isImage;
                                                            const previewSrc = att.previewUrl || att.existingUrl;
                                                            const displayName = att.file ? att.file.name : (att.fileSizeFormatted || "Archived Document");

                                                            return (
                                                                <div
                                                                    key={att.id}
                                                                    className="p-3.5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040] space-y-2.5 shadow-2xs transition-all hover:border-indigo-500/30"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                                                            <span className="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] flex items-center justify-center shrink-0">
                                                                                {idx + 1}
                                                                            </span>
                                                                            <Input
                                                                                placeholder="Document Label (e.g. FSIC Clearance)"
                                                                                value={att.label}
                                                                                onChange={e => {
                                                                                    const updated = [...additionalAttachments];
                                                                                    updated[idx].label = e.target.value;
                                                                                    setAdditionalAttachments(updated);
                                                                                }}
                                                                                className="h-8 rounded-lg text-xs font-bold bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]"
                                                                            />
                                                                        </div>
                                                                        <Button
                                                                            type="button"
                                                                            onClick={() => handleRemoveAttachment(att.id)}
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
                                                                            title="Remove item"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>

                                                                    {/* File Preview or Upload Dropzone */}
                                                                    {hasFileOrExisting ? (
                                                                        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/90 dark:bg-[#151b2b]/80 border border-slate-200/60 dark:border-[#2a3040]">
                                                                            {isImageFile && previewSrc ? (
                                                                                <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 shrink-0 group">
                                                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                    <img
                                                                                        src={previewSrc}
                                                                                        alt="Preview"
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => {
                                                                                            setActiveDraftPreview({
                                                                                                url: previewSrc,
                                                                                                title: att.label || "Supplementary Document",
                                                                                                isPdf: false,
                                                                                                file: att.file,
                                                                                            });
                                                                                            setPreviewModalOpen(true);
                                                                                        }}
                                                                                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                                                                        title="View Image"
                                                                                    >
                                                                                        <ZoomIn className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="w-12 h-12 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-600 flex flex-col items-center justify-center shrink-0">
                                                                                    <FileText className="w-5 h-5" />
                                                                                    <span className="text-[8px] font-black uppercase tracking-tighter mt-0.5">PDF</span>
                                                                                </div>
                                                                            )}

                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                                                        {displayName}
                                                                                    </p>
                                                                                    {att.scannedAt && (
                                                                                        <span className="shrink-0 text-[8px] px-1.5 py-0.2 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                                                                            <Clock className="w-2.5 h-2.5" />
                                                                                            {formatScanTimeAgo(att.scannedAt)}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                                    {att.file ? `${formatFileSize(att.file.size)} • ` : ""}
                                                                                    {att.isImage ? "Image Scan" : "PDF Document"}
                                                                                </p>
                                                                            </div>

                                                                            <div className="flex items-center gap-1 shrink-0">
                                                                                {previewSrc && (
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="ghost"
                                                                                        size="icon"
                                                                                        onClick={() => {
                                                                                            if (att.file) {
                                                                                                handleInspectDraftFile(
                                                                                                    att.label || "Supplementary Clearance",
                                                                                                    att.file,
                                                                                                    previewSrc,
                                                                                                    "attachment",
                                                                                                    att.id
                                                                                                );
                                                                                            } else {
                                                                                                setActiveDraftPreview({
                                                                                                    url: previewSrc,
                                                                                                    title: att.label || "Supplementary Clearance",
                                                                                                    isPdf: att.isPdf,
                                                                                                });
                                                                                                setPreviewModalOpen(true);
                                                                                            }
                                                                                        }}
                                                                                        className="h-7 w-7 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                                                                                        title="Inspect Document"
                                                                                    >
                                                                                        <Eye className="w-3.5 h-3.5" />
                                                                                    </Button>
                                                                                )}
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => handleDetachAttachmentFile(att.id)}
                                                                                    className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                                                                    title="Remove file (keep document title)"
                                                                                >
                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <label className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/60 dark:bg-[#151b2b]/60 border border-dashed border-slate-300 dark:border-[#2a3040] hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                                                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                                                                <FileUp className="w-4 h-4" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                                                                                    Choose Document / Plan
                                                                                </p>
                                                                                <p className="text-[10px] text-slate-400 font-medium truncate">
                                                                                    PDF, PNG, JPG (Click to browse file)
                                                                                </p>
                                                                            </div>
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*,application/pdf"
                                                                                onChange={e => handleAttachmentFileChange(att.id, e.target.files?.[0] || null)}
                                                                                className="hidden"
                                                                            />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Prominent Bottom Add Custom Button */}
                                                        <Button
                                                            type="button"
                                                            onClick={handleAddAttachment}
                                                            variant="outline"
                                                            className="w-full h-10 rounded-xl border-dashed border-2 border-indigo-500/30 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all mt-1"
                                                        >
                                                            <Plus className="w-4 h-4" /> ADD ANOTHER DOCUMENT
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Modal Footer */}
                                <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-slate-200/80 dark:border-[#2a3040]">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsCreateOpen(false)}
                                        disabled={submitting}
                                        className="rounded-2xl h-11 px-6 font-bold text-xs uppercase"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        style={{ backgroundColor: themeColor }}
                                        className="text-white font-bold rounded-2xl h-11 px-8 shadow-lg shadow-primary/20 gap-2 text-xs uppercase tracking-wider"
                                    >
                                        {submitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                {modalMode === "EDIT" ? "Updating Record..." : "Digitizing & Saving..."}
                                            </>
                                        ) : (
                                            <>
                                                {modalMode === "EDIT" ? <Pencil className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                                {modalMode === "EDIT" ? "Update Archive Record" : "Save & Digitize Record"}
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Records Table */}
            <div className="bg-white dark:bg-[#121624] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/80 dark:bg-slate-900/50">
                            <TableRow className="border-slate-200/80 dark:border-slate-800">
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 py-4 pl-6">
                                    Permit Numbers
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Applicant & Project
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Classification & Site
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                    Date Issued
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 text-center">
                                    Type
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 text-center">
                                    Documents
                                </TableHead>
                                <TableHead className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 text-right pr-6">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                            <span className="text-sm font-medium">Loading occupancy archives...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                            <FolderSearch className="w-10 h-10 stroke-[1.5]" />
                                            <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                No occupancy archive records found
                                            </span>
                                            <span className="text-xs">
                                                Try adjusting search keywords, source filter, or barangay criteria.
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        className="border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                                    >
                                        <TableCell className="pl-6 py-4">
                                            <div className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                                                {item.permitNumber}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                                <Link2 className="w-3 h-3 text-blue-500" />
                                                BP: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.buildingPermitNumber}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                                {item.applicantName}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                                {item.projectType}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {item.occupancyUse}
                                            </span>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 line-clamp-1">
                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                {item.location}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(item.dateIssued).toLocaleDateString("en-US", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </div>
                                            {item.dateOfCompletion && (
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    Completed: {new Date(item.dateOfCompletion).toLocaleDateString()}
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            {item.isPhysicalArchive ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    <FolderSearch className="w-3 h-3" />
                                                    Physical Scan
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    Online
                                                </span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleOpenViewer(item)}
                                                className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                {item.totalDocumentsCount} Files
                                            </Button>
                                        </TableCell>

                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenViewer(item)}
                                                    className="h-8 w-8 text-slate-500 hover:text-blue-600 rounded-lg"
                                                    title="Inspect Scanned Documents"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>

                                                {item.isPhysicalArchive && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEditModal(item)}
                                                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg cursor-pointer transition-colors"
                                                        title="Edit Archive Record & Documents"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <div>
                        Showing page <span className="font-bold text-slate-700 dark:text-slate-300">{page}</span> of{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-300">{totalPages}</span> ({totalCount} total)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="rounded-lg h-8 px-3 text-xs"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-lg h-8 px-3 text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Document Viewer Modal for Archived Records */}
            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                title={viewerTitle}
                documents={viewerDocuments}
            />

            {/* Quick Inspection Modal for Newly Selected Draft Files with In-Browser Rotate & Zoom Support */}
            {activeDraftPreview && (
                <DocumentViewerModal
                    isOpen={previewModalOpen}
                    onClose={() => {
                        setPreviewModalOpen(false);
                        setTimeout(() => {
                            setActiveDraftPreview(null);
                        }, 200);
                    }}
                    file={activeDraftPreview.file || null}
                    fileUrl={activeDraftPreview.url}
                    title={activeDraftPreview.title}
                    themeColor={themeColor}
                    documents={[{ url: activeDraftPreview.url, label: activeDraftPreview.title }]}
                    showPrint={false}
                    onSaveRotatedFile={handleSaveRotatedDraftFile}
                />
            )}

            {/* Office Scanner Station Setup Guide Dialog */}
            <Dialog open={scannerGuideOpen} onOpenChange={setScannerGuideOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl p-6 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-2xl">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <Printer className="w-6 h-6" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Office Scanner Setup Guide
                                </DialogTitle>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    3 simple steps to scan certificates directly into EMapandan
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 text-xs">
                            {/* Step 1 */}
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040] flex items-start gap-3">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                    1
                                </span>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                        Set Default Scanner Destination
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                        In your printer software (Epson Scan, Canon IJ, HP Smart, or Brother ControlCenter), set the target folder to:
                                        <code className="block mt-1 font-mono text-[11px] px-2 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold">
                                            Desktop\Scanned_Permits
                                        </code>
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040] flex items-start gap-3">
                                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                    2
                                </span>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                        Press &quot;Scan&quot; on your Printer
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Place the Certificate of Occupancy or clearance on the scanner glass or feeder tray and press the physical <strong className="text-slate-700 dark:text-slate-300">Scan</strong> button. Recommended: <strong>200–300 DPI (Color / Grayscale PDF or JPEG)</strong>.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#121622] border border-slate-200/80 dark:border-[#2a3040] flex items-start gap-3">
                                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                                    3
                                </span>
                                <div className="space-y-0.5">
                                    <p className="font-bold text-slate-800 dark:text-slate-200">
                                        Click &quot;Fetch from Scanner Folder&quot;
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Click the button above to import your newly scanned files. The newest file will be automatically slotted as the official signed Certificate of Occupancy!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="button"
                                onClick={() => setScannerGuideOpen(false)}
                                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider"
                            >
                                Got it, Close Guide
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
