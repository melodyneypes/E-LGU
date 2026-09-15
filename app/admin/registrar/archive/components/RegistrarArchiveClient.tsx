"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    getArchivedRegistrarRecords,
    createArchivedRegistrarRecord,
    updateArchivedRegistrarRecord,
    RegistryCategory
} from "../actions";
import {
    Search,
    Plus,
    FileText,
    Eye,
    Pencil,
    FolderArchive,
    Baby,
    HeartHandshake,
    Cross,
    RefreshCw,
    CheckCircle2,
    Sparkles,
    Trash2,
    UploadCloud,
    Loader2,
    Filter,
    FileUp,
    HelpCircle,
    BookOpen
} from "lucide-react";
import { compressDocumentScan } from "@/lib/image-compression";
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

export interface RegistrarAttachmentItem {
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

const REGISTRY_TYPES: Array<{ value: RegistryCategory; label: string; icon: any }> = [
    { value: "ALL", label: "All Registries", icon: BookOpen },
    { value: "BIRTH", label: "Birth Records", icon: Baby },
    { value: "DEATH", label: "Death Records", icon: Cross },
    { value: "MARRIAGE", label: "Marriage Records", icon: HeartHandshake },
];

const BIRTH_DOC_PRESETS = [
    "Certificate of Live Birth (Form 102)",
    "Registry Book Page Scan",
    "Marriage Certificate of Parents",
    "Affidavit of Delayed Registration",
    "Valid ID of Informant / Parent",
];

const DEATH_DOC_PRESETS = [
    "Certificate of Death (Form 103)",
    "Registry Book Page Scan",
    "Burial / Cremation Permit",
    "Medical Certificate / Cause of Death",
    "Affidavit of Delayed Registration",
];

const MARRIAGE_DOC_PRESETS = [
    "Certificate of Marriage (Form 97)",
    "Marriage License Application",
    "Registry Book Page Scan",
    "Certificate of No Marriage (CENOMAR)",
    "Solemnizing Officer Authority / License",
];

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function RegistrarArchiveClient({
    themeColor = "#2563eb",
}: {
    themeColor?: string;
}) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [registryTypeFilter, setRegistryTypeFilter] = useState<RegistryCategory>("ALL");
    const [sourceType, setSourceType] = useState<"ALL" | "PHYSICAL" | "ONLINE">("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [metrics, setMetrics] = useState({
        totalArchived: 0,
        totalBirth: 0,
        totalDeath: 0,
        totalMarriage: 0
    });

    // Form Modal states
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRecordId, setEditRecordId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Detail Modal states
    const [viewRecord, setViewRecord] = useState<any | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);

    // Document Viewer Lightbox
    const [viewerOpen, setViewerOpen] = useState(false);
    const [activeViewerDoc, setActiveViewerDoc] = useState<{ url: string; title: string; isPdf?: boolean } | null>(null);

    // Form Data State
    const [formType, setFormType] = useState<"BIRTH" | "DEATH" | "MARRIAGE">("BIRTH");
    const [formData, setFormData] = useState({
        registryNo: "",
        bookNo: "",
        pageNo: "",
        dateRegistered: new Date().toISOString().split("T")[0],

        // Birth fields
        childName: "",
        sex: "MALE",
        dateOfBirth: "",
        placeOfBirth: "Mapandan, Pangasinan",
        fatherName: "",
        motherMaidenName: "",

        // Death fields
        deceasedName: "",
        dateOfDeath: "",
        placeOfDeath: "Mapandan, Pangasinan",
        ageAtDeath: "",
        causeOfDeath: "",

        // Marriage fields
        husbandName: "",
        wifeName: "",
        dateOfMarriage: "",
        placeOfMarriage: "Mapandan, Pangasinan",
        solemnizingOfficer: "",

        remarks: ""
    });

    // Scanned Certificate & Attachments
    const [mainCertFile, setMainCertFile] = useState<File | null>(null);
    const [mainCertPreview, setMainCertPreview] = useState<string | null>(null);
    const [mainCertExistingUrl, setMainCertExistingUrl] = useState<string | null>(null);

    const [attachments, setAttachments] = useState<RegistrarAttachmentItem[]>([]);
    const [scannerGuideOpen, setScannerGuideOpen] = useState(false);

    // Debounce search input (400ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    // Fetch archives from server action
    const fetchRecords = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getArchivedRegistrarRecords({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                registryType: registryTypeFilter,
                sourceType,
                startDate,
                endDate
            });

            if (res.success && res.records) {
                setRecords(res.records);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalCount(res.pagination?.total || 0);
                if (res.metrics) {
                    setMetrics(res.metrics);
                }
            } else {
                toast.error(res.error || "Failed to load Civil Registry records.");
            }
        } catch (err: any) {
            console.error("Error fetching registrar records:", err);
            toast.error("Network error while retrieving records.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, debouncedSearch, registryTypeFilter, sourceType, startDate, endDate]);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // Reset Form
    const resetForm = () => {
        setFormData({
            registryNo: "",
            bookNo: "",
            pageNo: "",
            dateRegistered: new Date().toISOString().split("T")[0],
            childName: "",
            sex: "MALE",
            dateOfBirth: "",
            placeOfBirth: "Mapandan, Pangasinan",
            fatherName: "",
            motherMaidenName: "",
            deceasedName: "",
            dateOfDeath: "",
            placeOfDeath: "Mapandan, Pangasinan",
            ageAtDeath: "",
            causeOfDeath: "",
            husbandName: "",
            wifeName: "",
            dateOfMarriage: "",
            placeOfMarriage: "Mapandan, Pangasinan",
            solemnizingOfficer: "",
            remarks: ""
        });
        if (mainCertPreview) URL.revokeObjectURL(mainCertPreview);
        attachments.forEach(att => {
            if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
        });
        setMainCertFile(null);
        setMainCertPreview(null);
        setMainCertExistingUrl(null);
        setAttachments([]);
        setIsEditMode(false);
        setEditRecordId(null);
    };

    const openCreateModal = (type: "BIRTH" | "DEATH" | "MARRIAGE" = "BIRTH") => {
        resetForm();
        setFormType(type);
        setIsEditMode(false);
        setIsCreateOpen(true);
    };

    const openEditModal = (rec: any) => {
        resetForm();
        setIsEditMode(true);
        setEditRecordId(rec.id);
        const inferredType = (rec.archiveType || "BIRTH") as "BIRTH" | "DEATH" | "MARRIAGE";
        setFormType(inferredType);

        setFormData({
            registryNo: rec.registryNo || "",
            bookNo: rec.bookNo || "",
            pageNo: rec.pageNo || "",
            dateRegistered: rec.dateRegistered || "",
            childName: rec.childName || "",
            sex: rec.sex || "MALE",
            dateOfBirth: rec.eventDate || "",
            placeOfBirth: rec.eventPlace || "Mapandan, Pangasinan",
            fatherName: rec.fatherName || "",
            motherMaidenName: rec.motherMaidenName || "",
            deceasedName: rec.deceasedName || "",
            dateOfDeath: rec.eventDate || "",
            placeOfDeath: rec.eventPlace || "Mapandan, Pangasinan",
            ageAtDeath: rec.ageAtDeath || "",
            causeOfDeath: rec.causeOfDeath || "",
            husbandName: rec.husbandName || "",
            wifeName: rec.wifeName || "",
            dateOfMarriage: rec.eventDate || "",
            placeOfMarriage: rec.eventPlace || "Mapandan, Pangasinan",
            solemnizingOfficer: rec.solemnizingOfficer || "",
            remarks: rec.remarks || ""
        });

        if (rec.primaryDocumentUrl) {
            setMainCertExistingUrl(rec.primaryDocumentUrl);
        }

        if (Array.isArray(rec.scannedDocs)) {
            const existingItems: RegistrarAttachmentItem[] = rec.scannedDocs
                .filter((d: any) => d.url !== rec.primaryDocumentUrl)
                .map((d: any, idx: number) => ({
                    id: `existing-${idx}-${Date.now()}`,
                    label: d.label || "Registry Attachment",
                    file: null,
                    existingUrl: d.url,
                    isImage: /\.(webp|jpg|jpeg|png|gif)$/i.test(d.url),
                    isPdf: /\.pdf$/i.test(d.url)
                }));
            setAttachments(existingItems);
        }

        setIsCreateOpen(true);
    };

    // Primary scan file upload handler with compression
    const handleMainCertUpload = async (file: File) => {
        try {
            let processedFile = file;
            if (file.type.startsWith("image/")) {
                toast.info("Optimizing certificate scan resolution...", { duration: 1500 });
                processedFile = await compressDocumentScan(file);
            }
            if (mainCertPreview) URL.revokeObjectURL(mainCertPreview);
            setMainCertFile(processedFile);
            setMainCertPreview(URL.createObjectURL(processedFile));
            toast.success(`Loaded scan: ${processedFile.name} (${formatFileSize(processedFile.size)})`);
        } catch (err) {
            console.error("Image processing error:", err);
            setMainCertFile(file);
            setMainCertPreview(URL.createObjectURL(file));
        }
    };

    // Supplementary attachment upload handler with compression
    const handleAddAttachmentFiles = async (files: FileList | File[]) => {
        const fileArr = Array.from(files);
        if (fileArr.length === 0) return;

        const newItems: RegistrarAttachmentItem[] = [];
        for (const f of fileArr) {
            let processedFile = f;
            if (f.type.startsWith("image/")) {
                try {
                    processedFile = await compressDocumentScan(f);
                } catch {
                    processedFile = f;
                }
            }
            newItems.push({
                id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                label: processedFile.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "),
                file: processedFile,
                previewUrl: URL.createObjectURL(processedFile),
                isImage: processedFile.type.startsWith("image/"),
                isPdf: processedFile.type === "application/pdf",
                fileSizeFormatted: formatFileSize(processedFile.size),
                scannedAt: Date.now()
            });
        }
        setAttachments(prev => [...prev, ...newItems]);
        toast.success(`Added ${newItems.length} scan attachment(s).`);
    };

    const removeAttachment = (id: string) => {
        setAttachments(prev => {
            const target = prev.find(item => item.id === id);
            if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
            return prev.filter(item => item.id !== id);
        });
    };

    // Save or Update handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formType === "BIRTH" && !formData.childName.trim()) {
            toast.error("Child Full Name is required for Birth Registry.");
            return;
        }
        if (formType === "DEATH" && !formData.deceasedName.trim()) {
            toast.error("Deceased Full Name is required for Death Registry.");
            return;
        }
        if (formType === "MARRIAGE" && (!formData.husbandName.trim() || !formData.wifeName.trim())) {
            toast.error("Both Husband and Wife names are required for Marriage Registry.");
            return;
        }

        setSubmitting(true);
        try {
            const submission = new FormData();
            submission.append("archiveType", formType);
            submission.append("registryNo", formData.registryNo.trim());
            submission.append("bookNo", formData.bookNo.trim());
            submission.append("pageNo", formData.pageNo.trim());
            submission.append("dateRegistered", formData.dateRegistered);
            submission.append("remarks", formData.remarks.trim());

            if (formType === "BIRTH") {
                submission.append("childName", formData.childName.trim());
                submission.append("sex", formData.sex);
                submission.append("dateOfBirth", formData.dateOfBirth);
                submission.append("placeOfBirth", formData.placeOfBirth.trim());
                submission.append("fatherName", formData.fatherName.trim());
                submission.append("motherMaidenName", formData.motherMaidenName.trim());
            } else if (formType === "DEATH") {
                submission.append("deceasedName", formData.deceasedName.trim());
                submission.append("dateOfDeath", formData.dateOfDeath);
                submission.append("placeOfDeath", formData.placeOfDeath.trim());
                submission.append("ageAtDeath", formData.ageAtDeath.trim());
                submission.append("causeOfDeath", formData.causeOfDeath.trim());
            } else if (formType === "MARRIAGE") {
                submission.append("husbandName", formData.husbandName.trim());
                submission.append("wifeName", formData.wifeName.trim());
                submission.append("dateOfMarriage", formData.dateOfMarriage);
                submission.append("placeOfMarriage", formData.placeOfMarriage.trim());
                submission.append("solemnizingOfficer", formData.solemnizingOfficer.trim());
            }

            // Primary Certificate Scan
            if (mainCertFile) {
                submission.append("mainCertFile", mainCertFile);
            }
            if (isEditMode) {
                submission.append("existingMainUrl", mainCertExistingUrl || "");
            }

            // Supplementary Attachments
            const existingDocsToKeep = attachments
                .filter(a => a.existingUrl && !a.file)
                .map(a => ({ label: a.label, url: a.existingUrl }));
            submission.append("existingDocuments", JSON.stringify(existingDocsToKeep));

            attachments.forEach(att => {
                if (att.file) {
                    submission.append("attachedFiles", att.file);
                    submission.append("attachedLabels", att.label || "Registry Attachment");
                }
            });

            let res;
            if (isEditMode && editRecordId) {
                res = await updateArchivedRegistrarRecord(editRecordId, submission);
            } else {
                res = await createArchivedRegistrarRecord(submission);
            }

            if (res.success) {
                toast.success(res.message);
                setIsCreateOpen(false);
                resetForm();
                fetchRecords();
            } else {
                toast.error(res.error || "Failed to save archive record.");
            }
        } catch (err: any) {
            console.error("Submission error:", err);
            toast.error("A network or server error occurred.");
        } finally {
            setSubmitting(false);
        }
    };

    // Lightbox helper
    const openLightbox = (url: string, title: string) => {
        const isPdf = /\.pdf$/i.test(url);
        setActiveViewerDoc({ url, title, isPdf });
        setViewerOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Archived */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-all">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                            Total Digitized
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                            <FolderArchive className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {metrics.totalArchived}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">records in vault</span>
                    </div>
                    <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Preserved Physical Books</span>
                    </div>
                </div>

                {/* Birth Registry */}
                <div
                    onClick={() => setRegistryTypeFilter("BIRTH")}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${
                        registryTypeFilter === "BIRTH"
                            ? "border-emerald-500 ring-2 ring-emerald-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                            Birth Records
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                            <Baby className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {metrics.totalBirth}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">entries</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Form 102 & Live Birth Books
                    </div>
                </div>

                {/* Death Registry */}
                <div
                    onClick={() => setRegistryTypeFilter("DEATH")}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${
                        registryTypeFilter === "DEATH"
                            ? "border-slate-500 ring-2 ring-slate-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-500/50"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                            Death Records
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                            <Cross className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {metrics.totalDeath}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">entries</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Form 103 & Registers
                    </div>
                </div>

                {/* Marriage Registry */}
                <div
                    onClick={() => setRegistryTypeFilter("MARRIAGE")}
                    className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm cursor-pointer transition-all ${
                        registryTypeFilter === "MARRIAGE"
                            ? "border-rose-500 ring-2 ring-rose-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-rose-500/50"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
                            Marriage Records
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                            <HeartHandshake className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="mt-3 flex items-baseline gap-2">
                        <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                            {metrics.totalMarriage}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">entries</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Form 97 & Marriage Licenses
                    </div>
                </div>
            </div>

            {/* Filter & Action Toolbar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                    {/* Search Input */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search archive records..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-11 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-sm"
                        />
                    </div>

                    {/* Filter Badges / Selects */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Registry Type Filter */}
                        <Select
                            value={registryTypeFilter}
                            onValueChange={(val: RegistryCategory) => {
                                setRegistryTypeFilter(val);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[180px] h-11 rounded-xl border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder="Registry Type" />
                            </SelectTrigger>
                            <SelectContent>
                                {REGISTRY_TYPES.map(t => (
                                    <SelectItem key={t.value} value={t.value}>
                                        <div className="flex items-center gap-2">
                                            <t.icon className="w-4 h-4 text-slate-500" />
                                            <span>{t.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Source Filter */}
                        <Select
                            value={sourceType}
                            onValueChange={(val: "ALL" | "PHYSICAL" | "ONLINE") => {
                                setSourceType(val);
                                setCurrentPage(1);
                            }}
                        >
                            <SelectTrigger className="w-[170px] h-11 rounded-xl border-slate-200 dark:border-slate-700">
                                <SelectValue placeholder="Source" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Sources</SelectItem>
                                <SelectItem value="PHYSICAL">Physical Vault Only</SelectItem>
                                <SelectItem value="ONLINE">Online Portal</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Refresh Button */}
                        <Button
                            variant="outline"
                            onClick={() => fetchRecords()}
                            disabled={loading}
                            className="h-11 px-3 rounded-xl border-slate-200 dark:border-slate-700"
                            title="Refresh registry list"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>

                        {/* Primary Action Button: Archive Document */}
                        <Button
                            onClick={() => openCreateModal("BIRTH")}
                            className="h-11 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 font-bold gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Archive Document
                        </Button>
                    </div>
                </div>

                {/* Second Row: Date Filter & Active Filters Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-300">
                            <Filter className="w-3.5 h-3.5" /> Date Registered:
                        </span>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                            className="h-8 w-36 text-xs rounded-lg"
                        />
                        <span>to</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                            className="h-8 w-36 text-xs rounded-lg"
                        />
                        {(startDate || endDate || debouncedSearch || registryTypeFilter !== "ALL" || sourceType !== "ALL") && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearch("");
                                    setDebouncedSearch("");
                                    setRegistryTypeFilter("ALL");
                                    setSourceType("ALL");
                                    setStartDate("");
                                    setEndDate("");
                                    setCurrentPage(1);
                                }}
                                className="h-8 text-xs text-rose-500 hover:text-rose-600"
                            >
                                Reset Filters
                            </Button>
                        )}
                    </div>
                    <div>
                        Showing <strong className="text-slate-900 dark:text-white">{records.length}</strong> of {totalCount} total entries
                    </div>
                </div>
            </div>

            {/* Records Table View */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-50/70">
                                <TableHead className="w-[80px] font-bold text-xs uppercase tracking-wider text-center">
                                    No.
                                </TableHead>
                                <TableHead className="w-[130px] font-bold text-xs uppercase tracking-wider">
                                    Type
                                </TableHead>
                                <TableHead className="min-w-[220px] font-bold text-xs uppercase tracking-wider">
                                    Subject / Parties
                                </TableHead>
                                <TableHead className="w-[160px] font-bold text-xs uppercase tracking-wider">
                                    Event Date
                                </TableHead>
                                <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider">
                                    Date Registered
                                </TableHead>
                                <TableHead className="w-[120px] font-bold text-xs uppercase tracking-wider text-center">
                                    Scanned Files
                                </TableHead>
                                <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                            <p className="text-sm font-medium">Loading archived registry records...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : records.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                                            <FolderArchive className="w-12 h-12 text-slate-300 stroke-1" />
                                            <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
                                                No records found
                                            </p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                {debouncedSearch
                                                    ? `No documents matched "${debouncedSearch}". Try another query or clear filters.`
                                                    : "The digital vault does not contain records matching the selected filter criteria."}
                                            </p>
                                            <Button
                                                onClick={() => openCreateModal("BIRTH")}
                                                variant="outline"
                                                size="sm"
                                                className="mt-2 rounded-xl"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" /> Digitize First Document
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                records.map((rec, index) => {
                                    const isBirth = rec.archiveType === "BIRTH";
                                    const isDeath = rec.archiveType === "DEATH";
                                    const isMarriage = rec.archiveType === "MARRIAGE";
                                    const rowNumber = (currentPage - 1) * itemsPerPage + index + 1;

                                    return (
                                        <TableRow
                                            key={rec.id}
                                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            {/* Sequential Row Number */}
                                            <TableCell className="font-mono text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {rowNumber}
                                                    </span>
                                                    {rec.isPhysical && (
                                                        <span className="inline-block mt-0.5 text-[9px] font-sans font-semibold tracking-wider uppercase px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
                                                            Physical
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Type Badge */}
                                            <TableCell>
                                                {isBirth && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                                        <Baby className="w-3 h-3" /> Birth
                                                    </span>
                                                )}
                                                {isDeath && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                                        <Cross className="w-3 h-3" /> Death
                                                    </span>
                                                )}
                                                {isMarriage && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                                                        <HeartHandshake className="w-3 h-3" /> Marriage
                                                    </span>
                                                )}
                                                {!isBirth && !isDeath && !isMarriage && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                                                        <FileText className="w-3 h-3" /> Legal Inst.
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Subject / Citizen Details */}
                                            <TableCell>
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {rec.citizenFullName}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {isDeath && rec.causeOfDeath ? `Cause: ${rec.causeOfDeath}` : null}
                                                    {isMarriage && rec.solemnizingOfficer ? `Officer: ${rec.solemnizingOfficer}` : null}
                                                </div>
                                            </TableCell>

                                            {/* Event Date */}
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                                {rec.eventDate ? new Date(rec.eventDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }) : "N/A"}
                                                {rec.eventPlace && (
                                                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                                        {rec.eventPlace}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* Date Registered */}
                                            <TableCell className="text-xs text-slate-600 dark:text-slate-300">
                                                {rec.dateRegistered || "N/A"}
                                            </TableCell>

                                            {/* Scanned Files Badge */}
                                            <TableCell className="text-center">
                                                {rec.documentCount > 0 ? (
                                                    <button
                                                        onClick={() => {
                                                            const primary = rec.scannedDocs[0];
                                                            if (primary) openLightbox(primary.url, primary.label);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-xs font-bold transition-colors"
                                                    >
                                                        <FileText className="w-3.5 h-3.5" />
                                                        <span>{rec.documentCount} scan{rec.documentCount > 1 ? "s" : ""}</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400">No scan</span>
                                                )}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {/* View Detail Modal (Available for both Physical & Online) */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setViewRecord(rec);
                                                            setIsViewOpen(true);
                                                        }}
                                                        className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                                                        title="View Record Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>

                                                    {/* Edit Modal (Available for Physical Archive) */}
                                                    {rec.isPhysical && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openEditModal(rec)}
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-950/50"
                                                            title="Edit Physical Record"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination & Rows-Per-Page Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                    {/* Left: Range and Rows Per Page Selector */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <span>
                            {totalCount > 0 ? (
                                <>
                                    Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{" "}
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">{totalCount}</span> records
                                </>
                            ) : (
                                "No records"
                            )}
                        </span>

                        <div className="flex items-center gap-2">
                            <span className="text-slate-400">Rows per page:</span>
                            <Select
                                value={String(itemsPerPage)}
                                onValueChange={(val) => {
                                    setItemsPerPage(Number(val));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[72px] text-xs rounded-lg border-slate-200 dark:border-slate-700">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Right: Page Indicator & Navigation Buttons */}
                    <div className="flex items-center gap-3">
                        <span>
                            Page <span className="font-semibold text-slate-700 dark:text-slate-300">{currentPage}</span> of{" "}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">{totalPages}</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage <= 1 || loading}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="h-8 px-3 rounded-lg text-xs"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage >= totalPages || loading}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="h-8 px-3 rounded-lg text-xs"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE / EDIT ARCHIVE MODAL */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent
                    onPointerDownOutside={(e) => {
                        // Prevent dismissing the create/edit dialog if document viewer lightbox is active or closing
                        if (viewerOpen || activeViewerDoc) {
                            e.preventDefault();
                        }
                    }}
                    onInteractOutside={(e) => {
                        if (viewerOpen || activeViewerDoc) {
                            e.preventDefault();
                        }
                    }}
                    className="sm:max-w-[95vw] lg:max-w-6xl w-[95vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden rounded-3xl border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl bg-white dark:bg-slate-900"
                >
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                                    <FolderArchive className="w-6 h-6 text-blue-600" />
                                    <span>{isEditMode ? "Edit Archived Record" : "Digitize Physical Registry Record"}</span>
                                </DialogTitle>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {isEditMode
                                        ? "Update registry entries, replace document scans, or add new supplementary affidavits."
                                        : "Encode historical paper records and preserve scans into the digital vault."}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setScannerGuideOpen(true)}
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                            >
                                <HelpCircle className="w-4 h-4" /> Scanner Guide
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                            {/* Registry Type Selection Pills (Create Mode Only) */}
                            {!isEditMode && (
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        Select Registry Category
                                    </Label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setFormType("BIRTH")}
                                            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                                                formType === "BIRTH"
                                                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20 font-bold"
                                                    : "border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            <Baby className="w-5 h-5" />
                                            <span className="text-xs">Birth Registry (Form 102)</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setFormType("DEATH")}
                                            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                                                formType === "DEATH"
                                                    ? "border-slate-600 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white ring-2 ring-slate-600/20 font-bold"
                                                    : "border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            <Cross className="w-5 h-5" />
                                            <span className="text-xs">Death Registry (Form 103)</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setFormType("MARRIAGE")}
                                            className={`p-3.5 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                                                formType === "MARRIAGE"
                                                    ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 ring-2 ring-rose-500/20 font-bold"
                                                    : "border-slate-200 dark:border-slate-800 text-slate-600 hover:border-slate-300"
                                            }`}
                                        >
                                            <HeartHandshake className="w-5 h-5" />
                                            <span className="text-xs">Marriage Registry (Form 97)</span>
                                        </button>
                                    </div>
                                </div>
                            )}


                            {/* Section 2: Dynamic Registry Specific Information */}
                            {formType === "BIRTH" && (
                                <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 space-y-4">
                                    <div className="text-xs font-bold tracking-wider text-emerald-800 dark:text-emerald-300 uppercase flex items-center gap-2">
                                        <Baby className="w-4 h-4" />
                                        <span>Birth Certificate Details</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-2">
                                            <Label className="text-xs">Full Name of Child *</Label>
                                            <Input
                                                required
                                                placeholder="First Name, Middle Name, Last Name"
                                                value={formData.childName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, childName: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl font-medium"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Sex</Label>
                                            <Select
                                                value={formData.sex}
                                                onValueChange={(val) => setFormData(prev => ({ ...prev, sex: val }))}
                                            >
                                                <SelectTrigger className="h-10 mt-1 rounded-xl">
                                                    <SelectValue placeholder="Sex" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="MALE">Male</SelectItem>
                                                    <SelectItem value="FEMALE">Female</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs">Date of Birth</Label>
                                            <Input
                                                type="date"
                                                value={formData.dateOfBirth}
                                                onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Place of Birth</Label>
                                            <Input
                                                placeholder="Mapandan, Pangasinan"
                                                value={formData.placeOfBirth}
                                                onChange={(e) => setFormData(prev => ({ ...prev, placeOfBirth: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs">Father&apos;s Full Name</Label>
                                            <Input
                                                placeholder="Father&apos;s Name"
                                                value={formData.fatherName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, fatherName: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Mother&apos;s Maiden Name</Label>
                                            <Input
                                                placeholder="Mother&apos;s Maiden Name"
                                                value={formData.motherMaidenName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, motherMaidenName: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {formType === "DEATH" && (
                                <div className="bg-slate-100/60 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                                    <div className="text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase flex items-center gap-2">
                                        <Cross className="w-4 h-4" />
                                        <span>Death Record Information</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div className="sm:col-span-2">
                                            <Label className="text-xs">Full Name of Deceased *</Label>
                                            <Input
                                                required
                                                placeholder="Deceased Full Name"
                                                value={formData.deceasedName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, deceasedName: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl font-medium"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Age at Death</Label>
                                            <Input
                                                placeholder="e.g. 74"
                                                value={formData.ageAtDeath}
                                                onChange={(e) => setFormData(prev => ({ ...prev, ageAtDeath: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs">Date of Death</Label>
                                            <Input
                                                type="date"
                                                value={formData.dateOfDeath}
                                                onChange={(e) => setFormData(prev => ({ ...prev, dateOfDeath: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Place of Death</Label>
                                            <Input
                                                placeholder="Mapandan, Pangasinan"
                                                value={formData.placeOfDeath}
                                                onChange={(e) => setFormData(prev => ({ ...prev, placeOfDeath: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Cause of Death</Label>
                                        <Input
                                            placeholder="e.g. Acute Myocardial Infarction / Natural Causes"
                                            value={formData.causeOfDeath}
                                            onChange={(e) => setFormData(prev => ({ ...prev, causeOfDeath: e.target.value }))}
                                            className="h-10 mt-1 rounded-xl"
                                        />
                                    </div>
                                </div>
                            )}

                            {formType === "MARRIAGE" && (
                                <div className="bg-rose-50/30 dark:bg-rose-950/10 p-5 rounded-2xl border border-rose-200/60 dark:border-rose-800/40 space-y-4">
                                    <div className="text-xs font-bold tracking-wider text-rose-800 dark:text-rose-300 uppercase flex items-center gap-2">
                                        <HeartHandshake className="w-4 h-4" />
                                        <span>Marriage Record Information</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs">Husband Full Name *</Label>
                                            <Input
                                                required
                                                placeholder="Husband Full Name"
                                                value={formData.husbandName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, husbandName: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl font-medium"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Wife Full Name *</Label>
                                            <Input
                                                required
                                                placeholder="Wife Full Name (Maiden)"
                                                value={formData.wifeName}
                                                onChange={(e) => setFormData(prev => ({ ...prev, wifeName: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl font-medium"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs">Date of Marriage</Label>
                                            <Input
                                                type="date"
                                                value={formData.dateOfMarriage}
                                                onChange={(e) => setFormData(prev => ({ ...prev, dateOfMarriage: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl text-xs"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Place of Marriage</Label>
                                            <Input
                                                placeholder="Mapandan, Pangasinan"
                                                value={formData.placeOfMarriage}
                                                onChange={(e) => setFormData(prev => ({ ...prev, placeOfMarriage: e.target.value }))}
                                                className="h-10 mt-1 rounded-xl"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="text-xs">Solemnizing Officer / Judge / Priest</Label>
                                        <Input
                                            placeholder="Name of Solemnizing Officer"
                                            value={formData.solemnizingOfficer}
                                            onChange={(e) => setFormData(prev => ({ ...prev, solemnizingOfficer: e.target.value }))}
                                            className="h-10 mt-1 rounded-xl"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Section 3: Document Uploads & Compression */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2">
                                        <UploadCloud className="w-4 h-4 text-blue-600" />
                                        <span>Official Certificate Scans & Attachments</span>
                                    </div>
                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                        Auto-compression enabled (Max 2200px)
                                    </span>
                                </div>

                                {/* Primary Certificate Dropzone */}
                                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 hover:border-blue-500 transition-colors bg-slate-50/50 dark:bg-slate-800/20">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                                                <FileText className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                    Primary Certificate Scan (Form 102/103/97)
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    Official civil registry form or primary registry book page scan.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-sm transition-all">
                                                <FileUp className="w-3.5 h-3.5 text-blue-600" />
                                                <span>{mainCertFile || mainCertExistingUrl ? "Replace Scan" : "Upload Scan"}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleMainCertUpload(file);
                                                    }}
                                                />
                                            </label>

                                            {(mainCertPreview || mainCertExistingUrl) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openLightbox(mainCertPreview || mainCertExistingUrl!, "Primary Certificate Scan")}
                                                    className="h-8 px-2.5 text-xs text-blue-600"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" /> Preview
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {(mainCertFile || mainCertExistingUrl) && (
                                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                            <div className="flex items-center gap-2 truncate">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                <span className="truncate font-medium">
                                                    {mainCertFile ? mainCertFile.name : "Loaded existing vault certificate scan"}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    if (mainCertPreview) URL.revokeObjectURL(mainCertPreview);
                                                    setMainCertFile(null);
                                                    setMainCertPreview(null);
                                                    setMainCertExistingUrl(null);
                                                }}
                                                className="h-6 text-rose-500 hover:text-rose-600 px-2 text-xs"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Supplementary Attachments */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                            Supplementary Documents & Affidavits ({attachments.length})
                                        </Label>
                                        <label className="cursor-pointer text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                            <Plus className="w-3.5 h-3.5" /> Add Attachments
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*,application/pdf"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files) handleAddAttachmentFiles(e.target.files);
                                                }}
                                            />
                                        </label>
                                    </div>

                                    {/* Quick Presets Pills (Create Mode only) */}
                                    {!isEditMode && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            <span className="text-[11px] text-slate-400 self-center mr-1">Suggested:</span>
                                            {(formType === "BIRTH" ? BIRTH_DOC_PRESETS : formType === "DEATH" ? DEATH_DOC_PRESETS : MARRIAGE_DOC_PRESETS).map((preset) => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => {
                                                        setAttachments(prev => [
                                                            ...prev,
                                                            {
                                                                id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                                                label: preset,
                                                                file: null,
                                                                isImage: false,
                                                                isPdf: false
                                                            }
                                                        ]);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition-colors"
                                                >
                                                    + {preset}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Attachment list */}
                                    <div className="space-y-2">
                                        {attachments.map((att) => (
                                            <div
                                                key={att.id}
                                                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                                            >
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <Input
                                                        value={att.label}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setAttachments(prev => prev.map(item => item.id === att.id ? { ...item, label: val } : item));
                                                        }}
                                                        className="h-8 text-xs rounded-lg max-w-[280px]"
                                                        placeholder="Document Label"
                                                    />
                                                    {att.file && (
                                                        <span className="text-[11px] text-slate-400 truncate">
                                                            {att.file.name} ({formatFileSize(att.file.size)})
                                                        </span>
                                                    )}
                                                    {att.existingUrl && !att.file && (
                                                        <span className="text-[11px] text-emerald-600 truncate">
                                                            Existing vault scan attached
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {!att.file && !att.existingUrl && (
                                                        <label className="cursor-pointer px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors">
                                                            Attach File
                                                            <input
                                                                type="file"
                                                                accept="image/*,application/pdf"
                                                                className="hidden"
                                                                onChange={async (e) => {
                                                                    const f = e.target.files?.[0];
                                                                    if (f) {
                                                                        let pf = f;
                                                                        if (f.type.startsWith("image/")) {
                                                                            try {
                                                                                pf = await compressDocumentScan(f);
                                                                            } catch {
                                                                                pf = f;
                                                                            }
                                                                        }
                                                                        setAttachments(prev => prev.map(item => item.id === att.id ? {
                                                                            ...item,
                                                                            file: pf,
                                                                            previewUrl: URL.createObjectURL(pf),
                                                                            isImage: pf.type.startsWith("image/"),
                                                                            isPdf: pf.type === "application/pdf"
                                                                        } : item));
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    )}

                                                    {(att.previewUrl || att.existingUrl) && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => openLightbox(att.previewUrl || att.existingUrl!, att.label)}
                                                            className="h-7 w-7 p-0"
                                                        >
                                                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                                                        </Button>
                                                    )}

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeAttachment(att.id)}
                                                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Archival Remarks */}
                            <div>
                                <Label className="text-xs">Archival Notes & Remarks</Label>
                                <Textarea
                                    rows={2}
                                    placeholder="Condition of paper record, annotations, court decrees, or registry remarks..."
                                    value={formData.remarks}
                                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                                    className="mt-1 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateOpen(false)}
                                disabled={submitting}
                                className="rounded-xl px-5"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="rounded-xl px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Saving Vault Record...
                                    </>
                                ) : (
                                    isEditMode ? "Save Changes" : "Digitize into Vault"
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DETAIL VIEW MODAL */}
            <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                <DialogContent
                    onPointerDownOutside={(e) => {
                        if (viewerOpen || activeViewerDoc) {
                            e.preventDefault();
                        }
                    }}
                    onInteractOutside={(e) => {
                        if (viewerOpen || activeViewerDoc) {
                            e.preventDefault();
                        }
                    }}
                    className="sm:max-w-[90vw] lg:max-w-3xl p-6 md:p-8 rounded-3xl"
                >
                    {viewRecord && (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between border-b pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                            #{viewRecord.registryNo}
                                        </DialogTitle>
                                        <span className="text-xs px-2 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-700">
                                            {viewRecord.archiveType}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Book {viewRecord.bookNo} • Page {viewRecord.pageNo} • Registered on {viewRecord.dateRegistered}
                                    </p>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl">
                                <div>
                                    <span className="text-xs text-slate-400 block">Primary Subject / Party</span>
                                    <strong className="text-slate-800 dark:text-slate-200">{viewRecord.citizenFullName}</strong>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block">Event Date</span>
                                    <strong className="text-slate-800 dark:text-slate-200">{viewRecord.eventDate || "N/A"}</strong>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block">Place of Event</span>
                                    <span className="text-slate-700 dark:text-slate-300">{viewRecord.eventPlace || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block">Digitized By</span>
                                    <span className="text-slate-700 dark:text-slate-300">{viewRecord.encodedBy || viewRecord.processedBy}</span>
                                </div>
                            </div>

                            {/* Scans Gallery */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Preserved Scans ({viewRecord.scannedDocs?.length || 0})
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    {viewRecord.scannedDocs?.map((doc: any, i: number) => (
                                        <div
                                            key={i}
                                            onClick={() => openLightbox(doc.url, doc.label)}
                                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 cursor-pointer flex items-center justify-between group transition-all"
                                        >
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                                <span className="text-xs font-semibold truncate group-hover:text-blue-600">
                                                    {doc.label}
                                                </span>
                                            </div>
                                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsViewOpen(false)}
                                    className="rounded-xl text-xs"
                                >
                                    Close
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsViewOpen(false);
                                        openEditModal(viewRecord);
                                    }}
                                    className="rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                >
                                    <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Record
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* DOCUMENT VIEWER LIGHTBOX WITH 90° ROTATION */}
            {activeViewerDoc && (
                <DocumentViewerModal
                    isOpen={viewerOpen}
                    onClose={() => {
                        setViewerOpen(false);
                        setTimeout(() => setActiveViewerDoc(null), 250);
                    }}
                    fileUrl={activeViewerDoc.url}
                    title={activeViewerDoc.title}
                    themeColor={themeColor}
                />
            )}

            {/* SCANNER SETUP GUIDE MODAL */}
            <Dialog open={scannerGuideOpen} onOpenChange={setScannerGuideOpen}>
                <DialogContent className="max-w-md p-6 rounded-3xl">
                    <div className="space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-black text-slate-900 dark:text-white">
                                Scanning Best Practices
                            </DialogTitle>
                            <p className="text-xs text-slate-500 mt-1">
                                Tips for digitizing historical Civil Registry books and certificates.
                            </p>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-600">•</span>
                                <span><strong>300 DPI Color / Grayscale:</strong> Provides optimal sharpness for reading faded ink while keeping file sizes lightweight.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-600">•</span>
                                <span><strong>Flatbed Alignment:</strong> Ensure registry books lie as flat as possible so margins and book/page numbers remain legible.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-600">•</span>
                                <span><strong>In-Browser Compression:</strong> Our system automatically scales and compresses large images before uploading to conserve bandwidth.</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="font-bold text-blue-600">•</span>
                                <span><strong>Viewer Rotation:</strong> If a scan was loaded sideways, use the 90° rotate button in the viewer.</span>
                            </li>
                        </ul>
                        <Button
                            onClick={() => setScannerGuideOpen(false)}
                            className="w-full rounded-xl bg-blue-600 text-white font-bold text-xs"
                        >
                            Understood
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
