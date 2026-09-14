"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getArchivedOccupancyPermits, createArchivedOccupancyPermit, deleteArchivedOccupancyPermit } from "../actions";
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
    Link2,
    Layers,
    ShieldCheck,
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

    // Modal Form States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form inputs
    const [formData, setFormData] = useState({
        permitNumber: "",
        buildingPermitNumber: "",
        firstName: "",
        lastName: "",
        applicantName: "",
        barangay: "Poblacion",
        street: "",
        houseNumber: "",
        contactNumber: "",
        email: "",
        dateIssued: new Date().toISOString().split("T")[0],
        dateOfCompletion: "",
        projectType: "Two-Storey Residential House",
        occupancyUse: "Residential",
        estimatedCost: "",
        totalFloors: "1",
        remarks: "",
    });

    // Primary Certificate Scan
    const [mainPermitFile, setMainPermitFile] = useState<File | null>(null);
    const [mainPermitPreview, setMainPermitPreview] = useState<string | null>(null);
    const [mainPermitScannedAt, setMainPermitScannedAt] = useState<number | null>(null);

    // Supplementary Attachments
    const [additionalAttachments, setAdditionalAttachments] = useState<SupplementaryAttachmentItem[]>([
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
    ]);

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
    const scannerFolderInputRef = React.useRef<HTMLInputElement | null>(null);

    // Document Viewer for Archived Rows
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerDocuments, setViewerDocuments] = useState<{ url: string; label: string; fileName?: string }[]>([]);
    const [viewerTitle, setViewerTitle] = useState("");

    // Cleanup Object URLs on unmount or reset
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
                        scannedAt: Date.now(),
                    };
                }
                return item;
            }));
        }
    };

    // Scanner Folder Batch Ingestion
    const handleScannerFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawFiles = e.target.files;
        if (!rawFiles || rawFiles.length === 0) return;

        const files = Array.from(rawFiles).filter(f =>
            f.type.startsWith("image/") || f.name.toLowerCase().endsWith(".pdf")
        );

        if (files.length === 0) {
            toast.error("No image or PDF documents found in selected folder.");
            return;
        }

        const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        const firstFile = sortedFiles[0];
        try {
            const compressedMain = await compressDocumentScan(firstFile);
            const mainUrl = URL.createObjectURL(compressedMain);
            setMainPermitFile(compressedMain);
            setMainPermitPreview(mainUrl);
            setMainPermitScannedAt(Date.now());
        } catch {
            const mainUrl = URL.createObjectURL(firstFile);
            setMainPermitFile(firstFile);
            setMainPermitPreview(mainUrl);
            setMainPermitScannedAt(Date.now());
        }

        const newAttachments: SupplementaryAttachmentItem[] = [];
        for (let i = 1; i < sortedFiles.length; i++) {
            const f = sortedFiles[i];
            const guessedLabel = guessScanDocumentLabel(f.name);
            try {
                const comp = await compressDocumentScan(f);
                newAttachments.push({
                    id: `scan-${Date.now()}-${i}`,
                    label: guessedLabel,
                    file: comp,
                    previewUrl: URL.createObjectURL(comp),
                    isImage: comp.type.startsWith("image/"),
                    isPdf: comp.type.includes("pdf"),
                    scannedAt: Date.now(),
                });
            } catch {
                newAttachments.push({
                    id: `scan-${Date.now()}-${i}`,
                    label: guessedLabel,
                    file: f,
                    previewUrl: URL.createObjectURL(f),
                    isImage: f.type.startsWith("image/"),
                    isPdf: f.type.includes("pdf"),
                    scannedAt: Date.now(),
                });
            }
        }

        setAdditionalAttachments(prev => [...prev.filter(p => p.file !== null), ...newAttachments]);
        toast.success(`Imported ${sortedFiles.length} scanned documents from scanner folder!`);
        if (e.target) e.target.value = "";
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

        setSubmitting(true);
        try {
            const dataToSubmit = new FormData();
            dataToSubmit.append("permitNumber", formData.permitNumber.trim());
            dataToSubmit.append("buildingPermitNumber", formData.buildingPermitNumber.trim());
            dataToSubmit.append("firstName", formData.firstName.trim());
            dataToSubmit.append("lastName", formData.lastName.trim());
            dataToSubmit.append("applicantName", computedApplicant);
            dataToSubmit.append("barangay", formData.barangay);
            dataToSubmit.append("street", formData.street.trim());
            dataToSubmit.append("houseNumber", formData.houseNumber.trim());
            dataToSubmit.append("contactNumber", formData.contactNumber.trim());
            dataToSubmit.append("email", formData.email.trim());
            dataToSubmit.append("dateIssued", formData.dateIssued);
            dataToSubmit.append("dateOfCompletion", formData.dateOfCompletion);
            dataToSubmit.append("projectType", formData.projectType.trim());
            dataToSubmit.append("occupancyUse", formData.occupancyUse);
            dataToSubmit.append("estimatedCost", formData.estimatedCost || "0");
            dataToSubmit.append("totalFloors", formData.totalFloors || "1");
            dataToSubmit.append("remarks", formData.remarks.trim());

            if (mainPermitFile) {
                dataToSubmit.append("mainPermitScan", mainPermitFile);
            }

            const validAttachments = additionalAttachments.filter(item => item.file !== null);
            dataToSubmit.append("attachmentCount", validAttachments.length.toString());
            validAttachments.forEach((item, index) => {
                dataToSubmit.append(`attachmentFile_${index}`, item.file as File);
                dataToSubmit.append(`attachmentLabel_${index}`, item.label);
            });

            const res = await createArchivedOccupancyPermit(dataToSubmit);

            if (res.success) {
                toast.success(res.message || "Occupancy record archived successfully!");
                setIsCreateOpen(false);
                cleanupAttachmentUrls();
                setMainPermitFile(null);
                setMainPermitPreview(null);
                setAdditionalAttachments([
                    { id: "preset-fsic", label: "Fire Safety Inspection Certificate (FSIC - BFP)", file: null, isImage: false, isPdf: false },
                    { id: "preset-completion", label: "Certificate of Completion (Signed & Sealed)", file: null, isImage: false, isPdf: false },
                ]);
                setFormData({
                    permitNumber: "",
                    buildingPermitNumber: "",
                    firstName: "",
                    lastName: "",
                    applicantName: "",
                    barangay: "Poblacion",
                    street: "",
                    houseNumber: "",
                    contactNumber: "",
                    email: "",
                    dateIssued: new Date().toISOString().split("T")[0],
                    dateOfCompletion: "",
                    projectType: "Two-Storey Residential House",
                    occupancyUse: "Residential",
                    estimatedCost: "",
                    totalFloors: "1",
                    remarks: "",
                });
                fetchData();
            } else {
                toast.error(res.error || "Failed to archive occupancy permit.");
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

    // Soft delete action
    const handleDeleteRecord = async (id: string, permitNumber: string) => {
        if (!confirm(`Are you sure you want to cancel and remove archive record "${permitNumber}"?`)) {
            return;
        }
        try {
            const res = await deleteArchivedOccupancyPermit(id);
            if (res.success) {
                toast.success(res.message);
                fetchData();
            } else {
                toast.error(res.error || "Failed to cancel record.");
            }
        } catch {
            toast.error("Error cancelling record.");
        }
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
                    <Button
                        variant="outline"
                        onClick={() => window.print()}
                        className="h-10 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold gap-2 text-slate-700 dark:text-slate-200"
                    >
                        <Printer className="w-4 h-4" />
                        Print Masterlist
                    </Button>

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button
                                style={{ backgroundColor: themeColor }}
                                className="h-10 rounded-xl text-white font-bold text-xs uppercase tracking-wide gap-2 shadow-md hover:brightness-105 active:scale-95 transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Digitize Occupancy Permit
                            </Button>
                        </DialogTrigger>
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
                                        <UploadCloud className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>Encode Physical Certificate of Occupancy</span>
                                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                                                Archive Vault
                                            </span>
                                        </DialogTitle>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            Digitize walk-in physical Certificate of Occupancy hardcopies, associate with building permits, and archive clearances.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Form Body with 2-Column Grid */}
                            <form id="occupancy-encoding-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Left Column: Data & Project Metadata (7 Cols) */}
                                    <div className="lg:col-span-7 space-y-6">
                                        {/* Section 1: Permit & Identification */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <HardHat className="w-4 h-4 text-primary" />
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Permit & Linkages
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Occupancy Permit No. <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. OP-2023-0042"
                                                        value={formData.permitNumber}
                                                        onChange={(e) => setFormData({ ...formData, permitNumber: e.target.value })}
                                                        required
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                        <Link2 className="w-3.5 h-3.5 text-blue-500" />
                                                        Associated Building Permit No.
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. BP-2022-0118"
                                                        value={formData.buildingPermitNumber}
                                                        onChange={(e) => setFormData({ ...formData, buildingPermitNumber: e.target.value })}
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Occupancy Classification
                                                    </Label>
                                                    <Select
                                                        value={formData.occupancyUse}
                                                        onValueChange={(val) => setFormData({ ...formData, occupancyUse: val })}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {OCCUPANCY_TYPES.map((t) => (
                                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Date Issued (Official)
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.dateIssued}
                                                        onChange={(e) => setFormData({ ...formData, dateIssued: e.target.value })}
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Date of Completion
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.dateOfCompletion}
                                                        onChange={(e) => setFormData({ ...formData, dateOfCompletion: e.target.value })}
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Total Number of Storeys
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 2 Storeys"
                                                        value={formData.totalFloors}
                                                        onChange={(e) => setFormData({ ...formData, totalFloors: e.target.value })}
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: Applicant & Project Location */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <Building2 className="w-4 h-4 text-primary" />
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Applicant & Site Information
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="sm:col-span-2 space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Full Applicant / Owner Name <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. Engr. Juan Dela Cruz / ACME Commercial Corp."
                                                        value={formData.applicantName}
                                                        onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                                                        required
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Contact Number
                                                    </Label>
                                                    <Input
                                                        placeholder="0912-345-6789"
                                                        value={formData.contactNumber}
                                                        onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Barangay
                                                    </Label>
                                                    <Select
                                                        value={formData.barangay}
                                                        onValueChange={(val) => setFormData({ ...formData, barangay: val })}
                                                    >
                                                        <SelectTrigger className="h-10 rounded-xl text-sm">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {MAPANDAN_BARANGAYS.map((b) => (
                                                                <SelectItem key={b} value={b}>{b}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Street / Sitio / Purok
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. Rizal Street, Purok 3"
                                                        value={formData.street}
                                                        onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Estimated Construction Cost (₱)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 1500000"
                                                        value={formData.estimatedCost}
                                                        onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                                                        className="h-10 rounded-xl text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remarks */}
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                Archival Remarks & Hardcopy Filing Location
                                            </Label>
                                            <Textarea
                                                placeholder="e.g. Original physical copy filed in MEO Steel Cabinet A-4, Box 2023."
                                                value={formData.remarks}
                                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                                className="text-xs rounded-xl"
                                                rows={2}
                                            />
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
                                                                {formatFileSize(mainPermitFile.size)} • High-Res Official Scan
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
                                                            onChange={handleMainFileSelect}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    Upload clear scanned image or PDF copy of the official signed permit.
                                                </p>
                                            </div>

                                            {/* Quick Presets Bar */}
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

                                            {/* Supplementary Attachments List */}
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
                                                                                    onClick={() => {
                                                                                        setActiveDraftPreview({
                                                                                            url: att.previewUrl!,
                                                                                            title: att.label || "Scanned Document",
                                                                                            isPdf: false,
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
                                                                                {formatFileSize(att.file.size)} • {att.isImage ? "Image Scan" : "PDF Document"}
                                                                            </p>
                                                                        </div>

                                                                        <div className="flex items-center gap-1 shrink-0">
                                                                            {att.previewUrl && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        handleInspectDraftFile(
                                                                                            att.label || "Supplementary Clearance",
                                                                                            att.file,
                                                                                            att.previewUrl,
                                                                                            "attachment",
                                                                                            att.id
                                                                                        );
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
                                                Digitizing & Saving...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                Save & Digitize Record
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
                                                        onClick={() => handleDeleteRecord(item.id, item.permitNumber)}
                                                        className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-lg"
                                                        title="Cancel / Delete Physical Archive"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
