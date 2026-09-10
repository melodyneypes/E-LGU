"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getArchivedBuildingPermits, createArchivedBuildingPermit } from "../actions";
import {
    Search,
    Plus,
    FileText,
    Eye,
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
    DialogTrigger,
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
    "Coral",
    "Golden",
    "Jimenez",
    "Lambayan",
    "Luyan",
    "Nilombot",
    "Pias",
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
    "Street Furniture, Landscaping & Signboards",
    "Other Construction",
];

const DOCUMENT_PRESETS = [
    "Architectural Plans",
    "Structural / Civil Plans",
    "Sanitary & Plumbing Clearance",
    "Electrical Permit & Wiring Layout",
    "Tax Declaration / Land Title (TCT)",
    "Barangay Construction Clearance",
];

export interface SupplementaryAttachmentItem {
    id: string;
    label: string;
    file: File | null;
    previewUrl?: string;
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

function guessScanDocumentLabel(fileName: string, pageIndex: number): string {
    const lower = fileName.toLowerCase();
    if (lower.includes("plan") || lower.includes("arch") || lower.includes("blueprint") || lower.includes("draw")) {
        return "Approved Architectural / Blueprint Plan";
    }
    if (lower.includes("struct") || lower.includes("civil")) {
        return "Structural / Civil Plans";
    }
    if (lower.includes("plumb") || lower.includes("sanitary")) {
        return "Sanitary & Plumbing Clearance";
    }
    if (lower.includes("elect") || lower.includes("wiring")) {
        return "Electrical Permit & Wiring Layout";
    }
    if (lower.includes("tax") || lower.includes("title") || lower.includes("tct") || lower.includes("deed")) {
        return "Tax Declaration / Land Title (TCT)";
    }
    if (lower.includes("clearance") || lower.includes("brgy") || lower.includes("barangay")) {
        return "Barangay Construction Clearance";
    }
    return `Supplementary Attachment (Page ${pageIndex + 2})`;
}

export default function EngineerArchiveClient({
    themeColor = "#2563eb",
}: {
    themeColor?: string;
}) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sourceType, setSourceType] = useState<"ALL" | "PHYSICAL" | "ONLINE">("ALL");
    const [barangayFilter, setBarangayFilter] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Document Viewer Modal State
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [selectedDocuments, setSelectedDocuments] = useState<{ url: string; label: string }[]>([]);
    const [viewerTitle, setViewerTitle] = useState("");

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Form inputs state for physical encoding (Strictly First Name + Last Name)
    const [formData, setFormData] = useState({
        permitNumber: "",
        firstName: "",
        lastName: "",
        province: "Pangasinan",
        municipality: "Mapandan",
        barangay: "Poblacion",
        contactNumber: "",
        email: "",
        houseNumber: "",
        street: "",
        dateIssued: new Date().toISOString().split("T")[0],
        projectType: "",
        occupancyUse: "Residential",
        estimatedCost: "",
        totalFloors: "1",
        isLotOwner: "Yes",
        remarks: "",
    });

    // Primary Permit File & Instant Preview
    const [mainPermitFile, setMainPermitFile] = useState<File | null>(null);
    const [mainPermitPreview, setMainPermitPreview] = useState<string | null>(null);
    const [mainPermitScannedAt, setMainPermitScannedAt] = useState<number | null>(null);

    // Supplementary Attachments with rich metadata & previews
    const [additionalAttachments, setAdditionalAttachments] = useState<SupplementaryAttachmentItem[]>([
        {
            id: "preset-arch",
            label: "Approved Architectural Plans",
            file: null,
            isImage: false,
            isPdf: false,
        },
        {
            id: "preset-tax",
            label: "Tax Declaration / Land Title (TCT)",
            file: null,
            isImage: false,
            isPdf: false,
        },
    ]);

    // Local Inspection Lightbox State for Newly Selected Draft Files
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [activeDraftPreview, setActiveDraftPreview] = useState<{
        url: string;
        title: string;
        isPdf: boolean;
        targetType?: "main" | "attachment";
        targetId?: string;
        file?: File | null;
    } | null>(null);

    // Scanner Station Quick Ingestion State
    const [scannerGuideOpen, setScannerGuideOpen] = useState(false);
    const scannerFolderInputRef = React.useRef<HTMLInputElement | null>(null);

    // Clean up created object URLs on unmount or form reset
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

    useEffect(() => {
        return () => {
            cleanupAttachmentUrls();
        };
    }, [cleanupAttachmentUrls]);

    // Update main permit file and generate live preview
    const handleMainPermitChange = (file: File | null, scannedAt?: number) => {
        if (mainPermitPreview) {
            URL.revokeObjectURL(mainPermitPreview);
            setMainPermitPreview(null);
        }

        if (!file) {
            setMainPermitFile(null);
            setMainPermitScannedAt(null);
            return;
        }

        setMainPermitFile(file);
        setMainPermitScannedAt(scannedAt || file.lastModified || null);
        const url = URL.createObjectURL(file);
        setMainPermitPreview(url);
    };

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch archives
    const fetchArchives = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getArchivedBuildingPermits({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                sourceType,
                barangay: barangayFilter,
                startDate,
                endDate,
            });

            if (res.success && res.data) {
                setRecords(res.data);
                setTotalPages(res.totalPages || 1);
                setTotalCount(res.totalCount || 0);
            } else {
                toast.error(res.error || "Failed to load building permit records.");
            }
        } catch (error) {
            console.error(error);
            toast.error("An error occurred while fetching archives.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, debouncedSearch, sourceType, barangayFilter, startDate, endDate]);

    useEffect(() => {
        fetchArchives();
    }, [fetchArchives]);

    // Open Document Viewer Modal
    const handleOpenDocuments = (record: any) => {
        if (!record.documents || record.documents.length === 0) {
            toast.info("No scanned documents attached to this record.");
            return;
        }
        setSelectedDocuments(record.documents);
        setViewerTitle(`${record.permitNumber} - ${record.applicantName}`);
        setIsViewerOpen(true);
    };

    // Reset form helper
    const resetForm = () => {
        cleanupAttachmentUrls();
        setFormData({
            permitNumber: "",
            firstName: "",
            lastName: "",
            province: "Pangasinan",
            municipality: "Mapandan",
            barangay: "Poblacion",
            contactNumber: "",
            email: "",
            houseNumber: "",
            street: "",
            dateIssued: new Date().toISOString().split("T")[0],
            projectType: "",
            occupancyUse: "Residential",
            estimatedCost: "",
            totalFloors: "1",
            isLotOwner: "Yes",
            remarks: "",
        });
        setMainPermitFile(null);
        setMainPermitPreview(null);
        setAdditionalAttachments([
            {
                id: `init-${Date.now()}-1`,
                label: "Approved Architectural Plans",
                file: null,
                isImage: false,
                isPdf: false,
            },
            {
                id: `init-${Date.now()}-2`,
                label: "Tax Declaration / Land Title (TCT)",
                file: null,
                isImage: false,
                isPdf: false,
            },
        ]);
    };

    // Add extra document row with custom label
    const handleAddAttachmentRow = (defaultLabel = "") => {
        setAdditionalAttachments(prev => [
            ...prev,
            {
                id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                label: defaultLabel,
                file: null,
                isImage: false,
                isPdf: false,
            },
        ]);
    };

    // Remove extra document row
    const handleRemoveAttachmentRow = (id: string) => {
        setAdditionalAttachments(prev => {
            const target = prev.find(item => item.id === id);
            if (target?.previewUrl) {
                URL.revokeObjectURL(target.previewUrl);
            }
            return prev.filter(item => item.id !== id);
        });
    };

    // Handle file selection for a specific supplementary row
    const handleAttachmentFileChange = (id: string, file: File | null) => {
        setAdditionalAttachments(prev =>
            prev.map(item => {
                if (item.id !== id) return item;

                if (item.previewUrl) {
                    URL.revokeObjectURL(item.previewUrl);
                }

                if (!file) {
                    return {
                        ...item,
                        file: null,
                        previewUrl: undefined,
                        isImage: false,
                        isPdf: false,
                        fileSizeFormatted: undefined,
                    };
                }

                const isImg = file.type.startsWith("image/");
                const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                const previewUrl = URL.createObjectURL(file);

                return {
                    ...item,
                    file,
                    previewUrl,
                    isImage: isImg,
                    isPdf,
                    fileSizeFormatted: formatFileSize(file.size),
                };
            })
        );
    };

    // Open quick preview inspector
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

    // Callback when staff rotates image 90° in the inspection lightbox
    const handleSaveRotatedDraftFile = (newFile: File, newPreviewUrl: string) => {
        if (!activeDraftPreview) return;

        // Revoke the old preview URL to prevent browser memory leaks on repeated rotations
        const oldPreviewUrl = activeDraftPreview.url;

        if (activeDraftPreview.targetType === "main") {
            setMainPermitFile(newFile);
            setMainPermitPreview(newPreviewUrl);
            setActiveDraftPreview(prev => (prev ? { ...prev, url: newPreviewUrl, file: newFile } : null));

            if (oldPreviewUrl && oldPreviewUrl !== newPreviewUrl) {
                URL.revokeObjectURL(oldPreviewUrl);
            }
            toast.success("Main permit scan rotated 90° and saved!");
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

            if (oldPreviewUrl && oldPreviewUrl !== newPreviewUrl) {
                URL.revokeObjectURL(oldPreviewUrl);
            }
            toast.success("Attachment scan rotated 90° and saved!");
        }
    };

    // Submit Physical Record
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.permitNumber.trim()) {
            toast.error("Please enter the Official Permit Number.");
            return;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim()) {
            toast.error("Please enter both First Name and Last Name of the applicant.");
            return;
        }

        setIsSubmitting(true);
        try {
            const fd = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                fd.append(key, val);
            });

            // Phase 4: Client-side Auto-Compression for 300 DPI Scanner Imports
            // Preserves fine lines, dry seals, and signatures while cutting 10MB-20MB scans to ~800KB
            setIsCompressing(true);

            if (mainPermitFile) {
                const optimizedMain = await compressDocumentScan(mainPermitFile);
                fd.append("mainPermitFile", optimizedMain);
            }

            for (let idx = 0; idx < additionalAttachments.length; idx++) {
                const item = additionalAttachments[idx];
                if (item.file) {
                    const optimizedAttachment = await compressDocumentScan(item.file);
                    fd.append("attachedFiles", optimizedAttachment);
                    fd.append("attachedLabels", item.label.trim() || `Attachment ${idx + 1}`);
                }
            }

            setIsCompressing(false);

            const res = await createArchivedBuildingPermit(fd);

            if (res.success) {
                toast.success(`Permit #${res.permitNumber} successfully encoded to archives!`);
                setIsCreateOpen(false);
                resetForm();
                fetchArchives();
            } else {
                toast.error(res.error || "Failed to encode physical permit record.");
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to submit archive form.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Stat and Actions Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                <div className="flex items-center gap-4">
                    <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                        style={{ backgroundColor: themeColor, boxShadow: `0 8px 24px -4px ${themeColor}40` }}
                    >
                        <FolderArchive className="w-7 h-7" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Building Permit Document Vault
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {totalCount} Records
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Unified search and document repository for both digital online filings and paper archive records.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-auto">
                    <Button
                        onClick={() => fetchArchives()}
                        variant="outline"
                        size="icon"
                        className="rounded-2xl border-slate-200 dark:border-[#2a3040]"
                        title="Refresh list"
                    >
                        <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? "animate-spin" : ""}`} />
                    </Button>

                    <Dialog
                        open={isCreateOpen}
                        onOpenChange={open => {
                            setIsCreateOpen(open);
                            if (!open) resetForm();
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button
                                className="rounded-2xl text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Plus className="w-4 h-4" /> Encode Physical Permit
                            </Button>
                        </DialogTrigger>

                        <DialogContent
                            onPointerDownOutside={e => {
                                // Prevent dismissing the archive dialog if draft preview viewer is active or closing
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
                                        <UploadCloud className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>Encode Physical Building Permit</span>
                                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                Archive Vault
                                            </span>
                                        </DialogTitle>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            Digitize walk-in physical paper records, blueprints, and engineering clearances into the master database.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Form Body */}
                            <form id="archive-encoding-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
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

                                                 {/* First Name & Last Name */}
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

                                        {/* Section 2: Building Specifications & Cost */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <Building2 className="w-4 h-4 text-indigo-500" />
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Building Specifications & Scope
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Occupancy Classification
                                                    </Label>
                                                    <Select
                                                        value={formData.occupancyUse}
                                                        onValueChange={val => setFormData({ ...formData, occupancyUse: val })}
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
                                                    className="rounded-xl min-h-[70px] bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] text-xs"
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

                                                <div className="flex items-center gap-2 pt-0.5">
                                                    {/* Hidden File Input for Scanner Folder Trigger */}
                                                    <input
                                                        ref={scannerFolderInputRef}
                                                        type="file"
                                                        multiple
                                                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                                        onChange={(e) => {
                                                            const rawFiles = Array.from(e.target.files || []);
                                                            if (rawFiles.length === 0) return;

                                                            // Auto-detect and filter valid scanner documents (.pdf, .jpg, .jpeg, .png)
                                                            const validScannerFiles = rawFiles.filter((file) => {
                                                                const name = file.name.toLowerCase();
                                                                const type = file.type.toLowerCase();
                                                                return (
                                                                    name.endsWith(".pdf") ||
                                                                    name.endsWith(".jpg") ||
                                                                    name.endsWith(".jpeg") ||
                                                                    name.endsWith(".png") ||
                                                                    type === "application/pdf" ||
                                                                    type.startsWith("image/")
                                                                );
                                                            });

                                                            if (validScannerFiles.length === 0) {
                                                                toast.error("No valid scanner files found (.pdf, .jpg, .jpeg, .png required).");
                                                                e.target.value = "";
                                                                return;
                                                            }

                                                            // Sort by newest scan timestamp first (latest scan is first)
                                                            const sortedFiles = validScannerFiles.sort((a, b) => b.lastModified - a.lastModified);
                                                            const newestFile = sortedFiles[0];

                                                            // Automatically slot the first/newest scan as the Primary Signed Permit
                                                            handleMainPermitChange(newestFile, newestFile.lastModified);

                                                            // Slot supplementary pages as Blueprints / Clearances
                                                            if (sortedFiles.length > 1) {
                                                                const additionalScans = sortedFiles.slice(1);
                                                                setAdditionalAttachments((prev) => {
                                                                    const updated = [...prev];
                                                                    additionalScans.forEach((scanFile, idx) => {
                                                                        const isPdf = scanFile.type === "application/pdf" || scanFile.name.toLowerCase().endsWith(".pdf");
                                                                        const isImage = scanFile.type.startsWith("image/");
                                                                        const previewUrl = URL.createObjectURL(scanFile);
                                                                        const smartLabel = guessScanDocumentLabel(scanFile.name, idx);

                                                                        // Fill existing empty preset row if available, otherwise append new scan row
                                                                        const firstEmptyIdx = updated.findIndex((item) => !item.file);
                                                                        const newAttachment: SupplementaryAttachmentItem = {
                                                                            id: `scan-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
                                                                            label: smartLabel,
                                                                            file: scanFile,
                                                                            previewUrl,
                                                                            isPdf,
                                                                            isImage,
                                                                            fileSizeFormatted: formatFileSize(scanFile.size),
                                                                            scannedAt: scanFile.lastModified,
                                                                        };

                                                                        if (firstEmptyIdx !== -1) {
                                                                            updated[firstEmptyIdx] = {
                                                                                ...updated[firstEmptyIdx],
                                                                                label: updated[firstEmptyIdx].label.trim() ? updated[firstEmptyIdx].label : smartLabel,
                                                                                file: scanFile,
                                                                                previewUrl,
                                                                                isPdf,
                                                                                isImage,
                                                                                fileSizeFormatted: formatFileSize(scanFile.size),
                                                                                scannedAt: scanFile.lastModified,
                                                                            };
                                                                        } else {
                                                                            updated.push(newAttachment);
                                                                        }
                                                                    });
                                                                    return updated;
                                                                });

                                                                toast.success(
                                                                    `Auto-sorted ${sortedFiles.length} scans! Newest slotted as Primary Permit, ${sortedFiles.length - 1} slotted as attachments.`
                                                                );
                                                            } else {
                                                                toast.success(`Imported newest scan "${newestFile.name}" as Official Signed Permit!`);
                                                            }

                                                            // Reset input so same files can be re-scanned if needed
                                                            e.target.value = "";
                                                        }}
                                                        className="hidden"
                                                    />

                                                    <Button
                                                        type="button"
                                                        onClick={() => scannerFolderInputRef.current?.click()}
                                                        className="flex-1 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                                                    >
                                                        <FolderSearch className="w-4 h-4" />
                                                        <span>Fetch from Scanner Folder</span>
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => setScannerGuideOpen(true)}
                                                        className="h-9 px-3 rounded-xl border-indigo-500/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 text-xs font-bold shrink-0 cursor-pointer"
                                                    >
                                                        <Info className="w-3.5 h-3.5 mr-1" />
                                                        <span>Guide</span>
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
                                                                    onClick={() => handleInspectDraftFile("Official Signed Permit", mainPermitFile, mainPermitPreview, "main")}
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
                                                                {formatFileSize(mainPermitFile.size)} • High-Res Official Scan
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            {mainPermitPreview && (
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleInspectDraftFile("Official Signed Permit", mainPermitFile, mainPermitPreview, "main")}
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
                                                                onClick={() => handleMainPermitChange(null)}
                                                                className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                                                title="Remove file"
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
                                                                Choose Official Signed Permit Scan
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium truncate">
                                                                PDF, JPG, PNG (Click to browse file)
                                                            </p>
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept="image/*,application/pdf"
                                                            onChange={e => handleMainPermitChange(e.target.files?.[0] || null)}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    Upload clear scanned image or PDF copy of the official signed permit.
                                                </p>
                                            </div>

                                            {/* Presets Bar */}
                                            <div className="space-y-1.5 shrink-0">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Quick Preset Additions:
                                                </span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {DOCUMENT_PRESETS.map((preset, pIdx) => {
                                                        const isAlreadyAdded = additionalAttachments.some(a => a.label === preset);
                                                        return (
                                                            <button
                                                                key={pIdx}
                                                                type="button"
                                                                disabled={isAlreadyAdded}
                                                                onClick={() => handleAddAttachmentRow(preset)}
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

                                            {/* Supplementary Attachments List */}
                                            <div className="space-y-3 flex flex-col flex-1">
                                                <div className="flex items-center justify-between shrink-0">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Supplementary Plans & Clearances ({additionalAttachments.length})
                                                    </p>
                                                </div>

                                                {additionalAttachments.length === 0 ? (
                                                    <div
                                                        onClick={() => handleAddAttachmentRow("")}
                                                        className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-[#121622]/40 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 dark:hover:border-indigo-500/30 transition-all cursor-pointer text-center min-h-[220px]"
                                                    >
                                                        <UploadCloud className="w-8 h-8 text-indigo-400/80 mb-2" />
                                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                            No Supplementary Documents
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 mt-1">
                                                            Select one of the presets above or click here to add a custom attachment
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1.5 custom-scrollbar">
                                                        {additionalAttachments.map((att, idx) => (
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
                                                                            placeholder="Document Label (e.g. Architectural Plan)"
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
                                                                        onClick={() => handleRemoveAttachmentRow(att.id)}
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
                                                                        title="Remove item"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                </div>

                                                                {/* File Selection / Preview row */}
                                                                {att.file ? (
                                                                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/90 dark:bg-[#151b2b]/80 border border-slate-200/60 dark:border-[#2a3040]">
                                                                        {att.isImage && att.previewUrl ? (
                                                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 shrink-0 group">
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img
                                                                                    src={att.previewUrl}
                                                                                    alt="Preview"
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleInspectDraftFile(att.label || "Scanned Document", att.file, att.previewUrl, "attachment", att.id)}
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
                                                                                    {att.file.name}
                                                                                </p>
                                                                                {att.scannedAt && (
                                                                                    <span className="shrink-0 text-[8px] px-1.5 py-0.2 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
                                                                                        <Clock className="w-2.5 h-2.5" />
                                                                                        {formatScanTimeAgo(att.scannedAt)}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                                {att.fileSizeFormatted} • {att.isImage ? "Image Scan" : "PDF Document"}
                                                                            </p>
                                                                        </div>

                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            {att.previewUrl && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => handleInspectDraftFile(att.label || "Document Preview", att.file, att.previewUrl, "attachment", att.id)}
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
                                                                                onClick={() => handleAttachmentFileChange(att.id, null)}
                                                                                className="h-7 w-7 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                                                                title="Change file"
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
                                                        ))}

                                                        {/* Prominent Bottom Add Custom Button */}
                                                        <Button
                                                            type="button"
                                                            onClick={() => handleAddAttachmentRow("")}
                                                            variant="outline"
                                                            className="w-full h-10 rounded-xl border-dashed border-2 border-indigo-500/30 hover:border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/10 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all mt-1"
                                                        >
                                                            <Plus className="w-4 h-4" /> Add Another Document
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>

                            {/* Sticky Modal Action Footer */}
                            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/80 dark:bg-[#151b2b] flex items-center justify-between shrink-0">
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:inline-block">
                                    Records are stored as verified archived permits in the central ledger.
                                </span>

                                <div className="flex items-center gap-3 ml-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsCreateOpen(false);
                                            resetForm();
                                        }}
                                        className="rounded-2xl px-5"
                                        disabled={isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        form="archive-encoding-form"
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="rounded-2xl text-white font-bold px-7 shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>{isCompressing ? "Optimizing High-Res Scans..." : "Digitizing Record..."}</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>Save to Archive Vault</span>
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filter and Live Search Section */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search Bar */}
                <div className="sm:col-span-4 relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        placeholder="Search by Permit #, Applicant, or Project..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-10 h-11 rounded-2xl bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm font-medium"
                    />
                </div>

                {/* Source Filter */}
                <div className="sm:col-span-2">
                    <Select
                        value={sourceType}
                        onValueChange={(val: any) => {
                            setSourceType(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm">
                            <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Sources</SelectItem>
                            <SelectItem value="PHYSICAL">Paper Archives</SelectItem>
                            <SelectItem value="ONLINE">Online Portal</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Barangay Filter */}
                <div className="sm:col-span-2">
                    <Select
                        value={barangayFilter}
                        onValueChange={(val: string) => {
                            setBarangayFilter(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm">
                            <SelectValue placeholder="Filter Barangay" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All 15 Barangays</SelectItem>
                            {MAPANDAN_BARANGAYS.map(brgy => (
                                <SelectItem key={brgy} value={brgy}>
                                    Brgy. {brgy}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Date Range Start & End */}
                <div className="sm:col-span-4 flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={e => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-11 rounded-2xl bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm text-xs font-bold"
                            title="Start Date"
                        />
                    </div>
                    <span className="text-slate-400 text-xs font-black uppercase">to</span>
                    <div className="flex-1 relative">
                        <Input
                            type="date"
                            value={endDate}
                            onChange={e => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-11 rounded-2xl bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-sm text-xs font-bold"
                            title="End Date"
                        />
                    </div>
                    {(startDate || endDate || search || sourceType !== "ALL" || barangayFilter !== "ALL") && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setSearch("");
                                setSourceType("ALL");
                                setBarangayFilter("ALL");
                                setStartDate("");
                                setEndDate("");
                                setCurrentPage(1);
                            }}
                            className="h-11 px-3 rounded-2xl text-xs font-bold text-slate-500 hover:text-rose-500 hover:bg-rose-500/10"
                            title="Reset all filters"
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Archives Table */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-[#121622] border-b border-slate-100 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4">
                                Permit Details
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4">
                                Applicant Name
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4">
                                Location / Barangay
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4">
                                Record Source
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4">
                                Date Issued
                            </TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 py-4 text-right">
                                Scanned Documents & Action
                            </TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-44 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                                        <p className="text-xs font-bold uppercase tracking-wider">
                                            Loading Permit Archives...
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-44 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <FolderArchive className="w-8 h-8 opacity-40" />
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            No Building Permit records found
                                        </p>
                                        <p className="text-xs text-slate-500 max-w-sm">
                                            Try adjusting your search terms or encode a new physical permit paper copy.
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((record) => {
                                const docCount = record.documents ? record.documents.length : 0;

                                return (
                                    <TableRow
                                        key={record.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors border-b border-slate-100 dark:border-[#2a3040]"
                                    >
                                        {/* Permit # & Project Type */}
                                        <TableCell className="py-4">
                                            <div className="space-y-1">
                                                <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 block">
                                                    {record.permitNumber}
                                                </span>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                                                    {record.projectType} • {record.occupancyUse}
                                                </p>
                                            </div>
                                        </TableCell>

                                        {/* Applicant Name */}
                                        <TableCell className="py-4">
                                            <span className="font-bold text-sm text-slate-900 dark:text-white block">
                                                {record.applicantName}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                ID: {record.id.slice(-8)}
                                            </span>
                                        </TableCell>

                                        {/* Location */}
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                <span className="line-clamp-1">{record.location}</span>
                                            </div>
                                        </TableCell>

                                        {/* Source Badge */}
                                        <TableCell className="py-4">
                                            {record.isPhysical ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                                                    Paper Archive
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-sm">
                                                    Online Portal
                                                </span>
                                            )}
                                        </TableCell>

                                        {/* Date Issued */}
                                        <TableCell className="py-4">
                                            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                {new Date(record.dateIssued).toLocaleDateString("en-PH", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </div>
                                        </TableCell>

                                        {/* Action: Open Shared Document Viewer */}
                                        <TableCell className="py-4 text-right">
                                            <Button
                                                onClick={() => handleOpenDocuments(record)}
                                                disabled={docCount === 0}
                                                size="sm"
                                                variant="outline"
                                                className="rounded-2xl text-xs font-bold uppercase tracking-wider border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 shadow-sm active:scale-95"
                                            >
                                                <Eye className="w-3.5 h-3.5 mr-1.5" /> View {docCount} Doc{docCount !== 1 ? "s" : ""}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#121622]">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                        <span>Rows per page:</span>
                        <Select
                            value={itemsPerPage.toString()}
                            onValueChange={(val) => {
                                setItemsPerPage(Number(val));
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="h-8 w-[72px] rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#151b2b] text-xs font-bold">
                                <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b]">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}–{Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} total permits
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                            >
                                Previous
                            </Button>
                            <Button
                                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                variant="outline"
                                size="sm"
                                className="h-9 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shared Document Viewer Modal for All Attached Records */}
            <DocumentViewerModal
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                file={null}
                fileUrl={selectedDocuments[0]?.url || null}
                title={viewerTitle}
                themeColor={themeColor}
                documents={selectedDocuments}
                showPrint={true}
            />

            {/* Quick Inspection Modal for Newly Selected Draft Files with In-Browser Rotate Support */}
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
                                    3 simple steps to scan permits directly into EMapandan
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
                                        Place the building permit or blueprint on the scanner glass or feeder tray and press the physical <strong className="text-slate-700 dark:text-slate-300">Scan</strong> button. Recommended: <strong>200–300 DPI (Color / Grayscale PDF or JPEG)</strong>.
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
                                        In this modal, click the button and select your scanner folder. EMapandan will automatically sort and attach the newest scan instantly!
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="button"
                            onClick={() => setScannerGuideOpen(false)}
                            className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                        >
                            Understood, Got it!
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
