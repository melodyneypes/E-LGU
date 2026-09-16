"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getArchivedBuildingPermits, createArchivedBuildingPermit, updateArchivedBuildingPermit } from "../actions";
import { scanBuildingPermitDocument } from "../actions/ai-scanner";
import {
    Search,
    Plus,
    FileText,
    Eye,
    FolderArchive,
    Calendar,
    MapPin,
    RefreshCw,
    CheckCircle2,
    Trash2,
    UploadCloud,
    Loader2,
    ZoomIn,
    FileUp,
    Printer,
    Info,
    HelpCircle,
    Clock,
    RotateCcw,
    Pencil,
    Check,
    Sparkles
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

const PERMIT_TYPES = ["NEW", "RENEWAL", "AMENDATORY"] as const;

const OCCUPANCY_GROUPS = [
    { value: "GROUP A", label: "GROUP A — Residential Dwellings" },
    { value: "GROUP B", label: "GROUP B — Residential, Hotels & Apartments" },
    { value: "GROUP C", label: "GROUP C — Education & Recreation" },
    { value: "GROUP D", label: "GROUP D — Institutional & Healthcare" },
    { value: "GROUP E", label: "GROUP E — Business & Mercantile" },
    { value: "GROUP F", label: "GROUP F — Industrial & Manufacturing" },
    { value: "GROUP G", label: "GROUP G — Storage & Hazardous" },
    { value: "GROUP H", label: "GROUP H — Assembly (Theaters, Auditoriums)" },
    { value: "GROUP I", label: "GROUP I — Assembly (Without Stage)" },
    { value: "GROUP J", label: "GROUP J — Accessory, Agriculture & Others" },
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

const COMMON_SCOPES = [
    "CONCRETE WORKS",
    "LUMBER AND CARPENTRY WORKS",
    "TINSMITHY WORKS",
    "FINISHED HARDWARE",
    "ELECTRICAL WORKS",
    "PLUMBING WORKS",
    "PAINTING WORKS",
    "MASONRY WORKS",
    "STRUCTURAL STEEL",
    "DEMOLITION"
];

const DOCUMENT_PRESETS = [
    "Official Receipt (OR)",
    "Fire Safety Evaluation Clearance (FSEC)",
    "Approved Architectural Plans",
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

    // Create & Edit Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
    const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
    const [existingMainPermitUrl, setExistingMainPermitUrl] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);

    // Form inputs state for physical encoding (NBC FORM NO. B - 01B Alignment)
    const [formData, setFormData] = useState({
        // Header & Clearances
        permitType: "NEW" as "NEW" | "RENEWAL" | "AMENDATORY",
        permitNumber: "",
        dateIssued: new Date().toISOString().split("T")[0],
        orNumber: "",
        datePaid: "",
        fsecNo: "",
        fsecDateIssued: "",

        // Permittee & Project Title
        ownerName: "",
        projectTitle: "",

        // Location of Construction & Cadastral
        lotNo: "",
        blkNo: "",
        tctNo: "",
        street: "",
        barangay: "Torres",
        municipality: "MAPANDAN",
        province: "PANGASINAN",
        zipCode: "2429",

        // Character of Occupancy & Scope
        occupancyGroup: "GROUP A",
        occupancyUse: "Residential",
        scopeOfWork: "",
        estimatedCost: "",

        // Responsible Signatories
        engineerInCharge: "",
        buildingOfficial: "",

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
    const [isCustomOccupancy, setIsCustomOccupancy] = useState(false);
    const [isScanningAi, setIsScanningAi] = useState(false);

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

    // AI OCR Document Scan and Auto-populate form for NBC Form No. B - 01B
    const triggerAiBuildingPermitScan = async (fileToScan: File) => {
        setIsScanningAi(true);
        const toastId = toast.loading("Analyzing permit scan and extracting NBC Form No. B - 01B fields...");
        try {
            // Convert file to Base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve, reject) => {
                reader.onload = () => {
                    const result = reader.result as string;
                    const base64Clean = result.split(",")[1];
                    resolve(base64Clean);
                };
                reader.onerror = err => reject(err);
            });
            reader.readAsDataURL(fileToScan);
            const base64Data = await base64Promise;

            const res = await scanBuildingPermitDocument({
                base64Data,
                mimeType: fileToScan.type || "image/jpeg",
            });

            if (res.success && res.data) {
                const d = res.data;
                let countExtracted = 0;

                setFormData(prev => {
                    const updated = { ...prev };

                    // Permit Control & Clearances
                    if (d.permitType) updated.permitType = d.permitType;
                    if (d.permitNumber) { updated.permitNumber = d.permitNumber; countExtracted++; }
                    if (d.dateIssued) { updated.dateIssued = d.dateIssued; countExtracted++; }
                    if (d.orNumber) { updated.orNumber = d.orNumber; countExtracted++; }
                    if (d.datePaid) { updated.datePaid = d.datePaid; countExtracted++; }
                    if (d.fsecNo) { updated.fsecNo = d.fsecNo; countExtracted++; }
                    if (d.fsecDateIssued) { updated.fsecDateIssued = d.fsecDateIssued; countExtracted++; }

                    // Permittee & Project Title
                    if (d.ownerName) { updated.ownerName = d.ownerName; countExtracted++; }
                    if (d.projectTitle) { updated.projectTitle = d.projectTitle; countExtracted++; }

                    // Location / Cadastral
                    if (d.lotNo) { updated.lotNo = d.lotNo; countExtracted++; }
                    if (d.blkNo) { updated.blkNo = d.blkNo; countExtracted++; }
                    if (d.tctNo) { updated.tctNo = d.tctNo; countExtracted++; }
                    if (d.street) { updated.street = d.street; countExtracted++; }

                    // Match or normalize Barangay
                    if (d.barangay) {
                        const matchedBrgy = MAPANDAN_BARANGAYS.find(
                            b => b.toLowerCase() === d.barangay!.trim().toLowerCase()
                        );
                        if (matchedBrgy) {
                            updated.barangay = matchedBrgy;
                            countExtracted++;
                        }
                    }

                    // Occupancy & Scope
                    if (d.occupancyGroup) {
                        const matchedGrp = OCCUPANCY_GROUPS.find(
                            g => g.value.toLowerCase() === d.occupancyGroup!.trim().toLowerCase() ||
                                 g.label.toLowerCase().includes(d.occupancyGroup!.trim().toLowerCase())
                        );
                        if (matchedGrp) {
                            updated.occupancyGroup = matchedGrp.value;
                        } else {
                            updated.occupancyGroup = d.occupancyGroup;
                        }
                        countExtracted++;
                    }

                    if (d.occupancyUse) {
                        const standardOcc = OCCUPANCY_TYPES.find(
                            o => o.toLowerCase() === d.occupancyUse!.trim().toLowerCase()
                        );
                        if (standardOcc) {
                            updated.occupancyUse = standardOcc;
                            setIsCustomOccupancy(false);
                        } else {
                            updated.occupancyUse = d.occupancyUse;
                            setIsCustomOccupancy(true);
                        }
                        countExtracted++;
                    }

                    if (d.scopeOfWork) { updated.scopeOfWork = d.scopeOfWork; countExtracted++; }
                    if (d.estimatedCost) { updated.estimatedCost = d.estimatedCost; countExtracted++; }

                    // Signatories
                    if (d.engineerInCharge) { updated.engineerInCharge = d.engineerInCharge; countExtracted++; }
                    if (d.buildingOfficial) { updated.buildingOfficial = d.buildingOfficial; countExtracted++; }

                    // Remarks
                    if (d.remarks) { updated.remarks = d.remarks; countExtracted++; }

                    return updated;
                });

                toast.success(
                    countExtracted > 0
                        ? `NBC Form No. B - 01B analyzed! Auto-filled ${countExtracted} fields.`
                        : `Permit analyzed! Review and verify form fields.`,
                    { id: toastId, duration: 4000 }
                );
            } else {
                toast.error("Could not read permit clearly. Please try scanning again.", {
                    id: toastId,
                    duration: 4000,
                });
            }
        } catch (err: any) {
            console.error("AI Building Permit Scan error:", err);
            toast.error("Scan failed. Please try scanning or uploading again.", { id: toastId, duration: 4000 });
        } finally {
            setIsScanningAi(false);
        }
    };

    // Update main permit file and generate live preview
    const handleMainPermitChange = async (file: File | null, scannedAt?: number) => {
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

        // Auto-trigger AI extraction when adding a fresh scan in CREATE mode
        if (modalMode === "CREATE") {
            await triggerAiBuildingPermitScan(file);
        }
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
            permitType: "NEW",
            permitNumber: "",
            dateIssued: new Date().toISOString().split("T")[0],
            orNumber: "",
            datePaid: "",
            fsecNo: "",
            fsecDateIssued: "",

            ownerName: "",
            projectTitle: "",

            lotNo: "",
            blkNo: "",
            tctNo: "",
            street: "",
            barangay: "Torres",
            municipality: "MAPANDAN",
            province: "PANGASINAN",
            zipCode: "2429",

            occupancyGroup: "GROUP A",
            occupancyUse: "Residential",
            scopeOfWork: "",
            estimatedCost: "",

            engineerInCharge: "",
            buildingOfficial: "",
            remarks: "",
        });
        setMainPermitFile(null);
        setMainPermitPreview(null);
        setMainPermitScannedAt(null);
        setExistingMainPermitUrl(null);
        setEditingRecordId(null);
        setModalMode("CREATE");
        setIsCustomOccupancy(false);
        setAdditionalAttachments([
            {
                id: `init-${Date.now()}-1`,
                label: "Official Receipt (OR)",
                file: null,
                isImage: false,
                isPdf: false,
            },
            {
                id: `init-${Date.now()}-2`,
                label: "Fire Safety Evaluation Clearance (FSEC)",
                file: null,
                isImage: false,
                isPdf: false,
            },
        ]);
    };

    // Open Create Modal
    const handleOpenCreateModal = () => {
        resetForm();
        setModalMode("CREATE");
        setIsCreateOpen(true);
    };

    // Open Edit Modal with pre-filled record data
    const handleOpenEditModal = (item: any) => {
        resetForm();
        setModalMode("EDIT");
        setEditingRecordId(item.id);

        const currentOccupancy = (item.occupancyUse || "Residential").trim();
        const isStandard = OCCUPANCY_TYPES.includes(currentOccupancy);
        setIsCustomOccupancy(!isStandard);

        setFormData({
            permitType: (item.permitType || "NEW") as any,
            permitNumber: item.permitNumber || "",
            dateIssued: item.dateIssued ? new Date(item.dateIssued).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            orNumber: item.orNumber || "",
            datePaid: item.orDatePaid ? new Date(item.orDatePaid).toISOString().split("T")[0] : "",
            fsecNo: item.fsecNo || "",
            fsecDateIssued: item.fsecDateIssued ? new Date(item.fsecDateIssued).toISOString().split("T")[0] : "",

            ownerName: item.ownerName || item.applicantName || "",
            projectTitle: item.projectTitle || item.projectType || "",

            lotNo: item.lotNo || "",
            blkNo: item.blkNo || "",
            tctNo: item.tctNo || "",
            street: item.street || "",
            barangay: item.barangay || "Torres",
            municipality: "MAPANDAN",
            province: "PANGASINAN",
            zipCode: "2429",

            occupancyGroup: item.occupancyGroup || "GROUP A",
            occupancyUse: currentOccupancy === "Other Construction" ? "" : currentOccupancy,
            scopeOfWork: item.scopeOfWork || "",
            estimatedCost: item.estimatedCost ? String(item.estimatedCost) : "",

            engineerInCharge: item.engineerInCharge || "",
            buildingOfficial: item.buildingOfficial || "",
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
                        existingUrl: undefined,
                        isImage: false,
                        isPdf: false,
                        fileSizeFormatted: undefined,
                        scannedAt: undefined,
                    };
                }

                const isImg = file.type.startsWith("image/");
                const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                const previewUrl = URL.createObjectURL(file);

                return {
                    ...item,
                    file,
                    previewUrl,
                    existingUrl: undefined,
                    isImage: isImg,
                    isPdf,
                    fileSizeFormatted: formatFileSize(file.size),
                };
            })
        );
    };

    // Detach attached file/scan from row while keeping the document title/label intact
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
            toast.error("Please enter the Official Building Permit Number.");
            return;
        }

        if (!formData.ownerName.trim()) {
            toast.error("Please enter the Owner / Permittee Name.");
            return;
        }

        if (!formData.projectTitle.trim()) {
            toast.error("Please enter the Project Title.");
            return;
        }

        const finalOccupancy = formData.occupancyUse.trim();
        if (!finalOccupancy || finalOccupancy === "Other Construction") {
            toast.error("Please specify the Occupancy Classification.");
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

            if (modalMode === "EDIT") {
                if (editingRecordId) {
                    fd.append("transactionId", editingRecordId);
                }
                if (existingMainPermitUrl) {
                    fd.append("existingMainUrl", existingMainPermitUrl);
                }
                // Retain all existing attachments
                const retainedExistingDocs = additionalAttachments
                    .filter(item => item.existingUrl && item.file === null)
                    .map(item => ({
                        title: item.label,
                        url: item.existingUrl,
                    }));
                fd.append("existingDocuments", JSON.stringify(retainedExistingDocs));
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

            const res = modalMode === "EDIT"
                ? await updateArchivedBuildingPermit(fd)
                : await createArchivedBuildingPermit(fd);

            if (res.success) {
                toast.success(
                    modalMode === "EDIT"
                        ? `Permit #${res.permitNumber} updated successfully!`
                        : `Permit #${res.permitNumber} successfully encoded to archives!`
                );
                setIsCreateOpen(false);
                resetForm();
                fetchArchives();
            } else {
                toast.error(res.error || (modalMode === "EDIT" ? "Failed to update archive record." : "Failed to encode physical permit record."));
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
                                onClick={handleOpenCreateModal}
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
                                        {modalMode === "EDIT" ? <Pencil className="w-5 h-5" /> : <UploadCloud className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>
                                                {modalMode === "EDIT" ? `Edit Building Permit Archive — ${formData.permitNumber || "Record"}` : "Encode Physical Building Permit"}
                                            </span>
                                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                {modalMode === "EDIT" ? "Edit Mode" : "Archive Vault"}
                                            </span>
                                        </DialogTitle>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                            {modalMode === "EDIT"
                                                ? "Correct applicant details, update building specifications, and manage attached scanned documents."
                                                : "Digitize walk-in physical paper records, blueprints, and engineering clearances into the master database."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Scrollable Form Body */}
                            <form id="archive-encoding-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 md:p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    {/* Left Column: Data & Project Metadata (7 Cols) */}
                                    <div className="lg:col-span-7 space-y-5">
                                        {/* Card 1: Official NBC Header & Control Numbers */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <div>
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        NBC Form No. B - 01B • Building Permit
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        Office of the Building Official • Municipality of Mapandan
                                                    </p>
                                                </div>

                                                {/* Permit Type Radio / Checkbox Selector */}
                                                <div className="flex items-center gap-1.5 bg-white dark:bg-[#121622] p-1 rounded-xl border border-slate-200 dark:border-[#2a3040]">
                                                    {PERMIT_TYPES.map(type => {
                                                        const isSelected = formData.permitType === type;
                                                        return (
                                                            <button
                                                                key={type}
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, permitType: type })}
                                                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer ${
                                                                    isSelected
                                                                        ? "bg-indigo-600 text-white shadow-sm"
                                                                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                                {type}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                {/* Building Permit Number */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Building Permit No. <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        required
                                                        placeholder="e.g. BP-0888-2609-1213"
                                                        value={formData.permitNumber}
                                                        onChange={e => setFormData({ ...formData, permitNumber: e.target.value })}
                                                        className="rounded-xl h-11 font-mono font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* Date Issued */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Date Issued
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.dateIssued}
                                                        onChange={e => setFormData({ ...formData, dateIssued: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* Official Receipt (OR) Number */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Official Receipt (OR) No.
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 4795753"
                                                        value={formData.orNumber}
                                                        onChange={e => setFormData({ ...formData, orNumber: e.target.value })}
                                                        className="rounded-xl h-11 font-mono bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* Date Paid */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Date Paid
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.datePaid}
                                                        onChange={e => setFormData({ ...formData, datePaid: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* FSEC Number */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        FSEC No. (Fire Clearance)
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. R--10429-5411695"
                                                        value={formData.fsecNo}
                                                        onChange={e => setFormData({ ...formData, fsecNo: e.target.value })}
                                                        className="rounded-xl h-11 font-mono bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* FSEC Date Issued */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        FSEC Date Issued
                                                    </Label>
                                                    <Input
                                                        type="date"
                                                        value={formData.fsecDateIssued}
                                                        onChange={e => setFormData({ ...formData, fsecDateIssued: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 2: Permittee & Project Title */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Owner / Permittee & Project Title
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Owner / Permittee <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        required
                                                        placeholder="e.g. ANGELENE S. MATIAS"
                                                        value={formData.ownerName}
                                                        onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                                                        className="rounded-xl h-11 font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] uppercase"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Project Title <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        required
                                                        placeholder="e.g. 1 BEDROOM BUNGALOW"
                                                        value={formData.projectTitle}
                                                        onChange={e => setFormData({ ...formData, projectTitle: e.target.value })}
                                                        className="rounded-xl h-11 font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] uppercase"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 3: Location of Construction (Cadastral Details & Barangay) */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Location of Construction
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Lot No.
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 12"
                                                        value={formData.lotNo}
                                                        onChange={e => setFormData({ ...formData, lotNo: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Blk No.
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 4"
                                                        value={formData.blkNo}
                                                        onChange={e => setFormData({ ...formData, blkNo: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        TCT No. (Land Title)
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. T-123456"
                                                        value={formData.tctNo}
                                                        onChange={e => setFormData({ ...formData, tctNo: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Street / Sitio
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. Rizal St."
                                                        value={formData.street}
                                                        onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Barangay <span className="text-rose-500">*</span>
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
                                                        Municipality & ZIP
                                                    </Label>
                                                    <div className="h-11 px-3.5 rounded-xl bg-slate-100/70 dark:bg-[#121622]/60 border border-slate-200 dark:border-[#2a3040] flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        <span>MAPANDAN</span>
                                                        <span className="font-mono text-indigo-600 dark:text-indigo-400">2429</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 4: Character of Occupancy & Scope of Work */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Use or Character of Occupancy & Scope of Work
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                {/* Occupancy Group */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Occupancy Group
                                                    </Label>
                                                    <Select
                                                        value={formData.occupancyGroup}
                                                        onValueChange={val => setFormData({ ...formData, occupancyGroup: val })}
                                                    >
                                                        <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]">
                                                            <SelectValue placeholder="Select Group" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {OCCUPANCY_GROUPS.map(grp => (
                                                                <SelectItem key={grp.value} value={grp.value}>
                                                                    {grp.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                {/* Occupancy Classification */}
                                                {!isCustomOccupancy ? (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Classified As <span className="text-rose-500">*</span>
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
                                                                <SelectValue placeholder="Select Classification" />
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
                                                            <Label className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                                                Classified As <span className="text-rose-500">*</span>
                                                            </Label>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setIsCustomOccupancy(false);
                                                                    setFormData({ ...formData, occupancyUse: "Residential" });
                                                                }}
                                                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                                                            >
                                                                <RotateCcw className="w-3 h-3" /> Select from list
                                                            </button>
                                                        </div>
                                                        <Input
                                                            placeholder="Type specific classification..."
                                                            value={formData.occupancyUse}
                                                            onChange={e => setFormData({ ...formData, occupancyUse: e.target.value })}
                                                            required
                                                            autoFocus
                                                            className="h-11 rounded-xl text-sm border-amber-300 dark:border-amber-700/60 bg-amber-50/20 dark:bg-amber-950/10 font-medium"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Scope of Work with Clickable Quick Chips */}
                                            <div className="space-y-2 pt-1">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Scope of Work
                                                    </Label>
                                                    <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                                                        Click tags below to append quickly
                                                    </span>
                                                </div>

                                                <Textarea
                                                    placeholder="e.g. CONCRETE WORKS, LUMBER AND CARPENTRY WORKS, TINSMITHY WORKS, FINISHED HARDWARE, ELECTRICAL WORKS, PLUMBING WORKS, AND PAINTING WORKS"
                                                    value={formData.scopeOfWork}
                                                    onChange={e => setFormData({ ...formData, scopeOfWork: e.target.value })}
                                                    className="rounded-xl min-h-[75px] bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] text-xs font-medium uppercase"
                                                />

                                                {/* Scope chips */}
                                                <div className="flex flex-wrap gap-1.5 pt-1">
                                                    {COMMON_SCOPES.map(scope => {
                                                        const isAdded = formData.scopeOfWork.toUpperCase().includes(scope.toUpperCase());
                                                        return (
                                                            <button
                                                                key={scope}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = formData.scopeOfWork.trim();
                                                                    if (isAdded) {
                                                                        // Cleanly remove the tag and redundant commas
                                                                        const escaped = scope.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                                                        const regex = new RegExp(`(^|,\\s*)${escaped}(,\\s*|$)`, "gi");
                                                                        const updated = current.replace(regex, (match, p1, p2) => {
                                                                            if (p1 && p2) return ", ";
                                                                            return "";
                                                                        }).trim().replace(/^,\s*|,\s*$/g, "");
                                                                        setFormData({ ...formData, scopeOfWork: updated });
                                                                    } else {
                                                                        const updated = current ? `${current}, ${scope}` : scope;
                                                                        setFormData({ ...formData, scopeOfWork: updated });
                                                                    }
                                                                }}
                                                                className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer select-none ${
                                                                    isAdded
                                                                        ? "bg-slate-200/90 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 border border-slate-300/70 dark:border-slate-700/60 opacity-60 hover:opacity-80"
                                                                        : "bg-white dark:bg-[#121622] text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-400 border border-slate-200 dark:border-[#2a3040] shadow-xs"
                                                                }`}
                                                                title={isAdded ? `Already added: Click to remove ${scope}` : `Click to add ${scope}`}
                                                            >
                                                                {isAdded ? (
                                                                    <>
                                                                        <Check className="w-2.5 h-2.5 stroke-[3] text-emerald-500 shrink-0" />
                                                                        <span className="line-through">{scope}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span>+</span>
                                                                        <span>{scope}</span>
                                                                    </>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 5: Valuation & Signatories */}
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                            <div className="pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                    Valuation & Key Signatories
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                                {/* Total Project Cost */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Total Project Cost (₱)
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        placeholder="e.g. 1641945.00"
                                                        value={formData.estimatedCost}
                                                        onChange={e => setFormData({ ...formData, estimatedCost: e.target.value })}
                                                        className="rounded-xl h-11 font-mono font-bold bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                {/* Professional In Charge */}
                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Professional In Charge of Construction
                                                    </Label>
                                                    <Input
                                                        placeholder="Enter name (e.g. Architect / Civil Engineer)"
                                                        value={formData.engineerInCharge}
                                                        onChange={e => setFormData({ ...formData, engineerInCharge: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] uppercase"
                                                    />
                                                </div>

                                                {/* Building Official */}
                                                <div className="space-y-1.5 sm:col-span-2">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Building Official / Permit Issued By
                                                    </Label>
                                                    <Input
                                                        placeholder="Enter name of Building Official / Municipal Engineer"
                                                        value={formData.buildingOfficial}
                                                        onChange={e => setFormData({ ...formData, buildingOfficial: e.target.value })}
                                                        className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] uppercase font-bold"
                                                    />
                                                </div>
                                            </div>

                                            {/* Notes / Remarks */}
                                            <div className="space-y-1.5 pt-1">
                                                <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                    Archive Reference / Storage Notes
                                                </Label>
                                                <Textarea
                                                    placeholder="Add any specific archive box number, physical shelf reference, or remarks..."
                                                    value={formData.remarks}
                                                    onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                                                    className="rounded-xl min-h-[60px] bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] text-xs"
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
                                                    <div className="flex items-center gap-1.5">
                                                        {isScanningAi && (
                                                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                AI Extracting...
                                                            </span>
                                                        )}
                                                        {mainPermitFile && !isScanningAi && (
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Ready
                                                            </span>
                                                        )}
                                                    </div>
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
                                                                {formatFileSize(mainPermitFile.size)} • High-Res Official Scan (New)
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                disabled={isScanningAi}
                                                                onClick={() => triggerAiBuildingPermitScan(mainPermitFile)}
                                                                className="h-8 w-8 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg cursor-pointer"
                                                                title="Scan with AI to Auto-fill"
                                                            >
                                                                <Sparkles className={`w-4 h-4 ${isScanningAi ? "animate-spin" : ""}`} />
                                                            </Button>
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
                                                            onChange={e => handleMainPermitChange(e.target.files?.[0] || null)}
                                                            className="hidden"
                                                        />
                                                    </label>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    Upload clear scanned image or PDF copy of the official signed permit.
                                                </p>
                                            </div>

                                            {/* Presets Bar - Only displayed when creating a new record */}
                                            {modalMode === "CREATE" && (
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
                                            )}

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
                                                                {(att.file || att.existingUrl) ? (
                                                                    <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/90 dark:bg-[#151b2b]/80 border border-slate-200/60 dark:border-[#2a3040]">
                                                                        {att.isImage && (att.previewUrl || att.existingUrl) ? (
                                                                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 shrink-0 group">
                                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                                <img
                                                                                    src={att.previewUrl || att.existingUrl}
                                                                                    alt="Preview"
                                                                                    className="w-full h-full object-cover"
                                                                                />
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        if (att.file) {
                                                                                            handleInspectDraftFile(att.label || "Scanned Document", att.file, att.previewUrl, "attachment", att.id);
                                                                                        } else if (att.existingUrl) {
                                                                                            setActiveDraftPreview({
                                                                                                url: att.existingUrl,
                                                                                                title: att.label || "Supplementary Document",
                                                                                                isPdf: false,
                                                                                            });
                                                                                            setPreviewModalOpen(true);
                                                                                        }
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
                                                                                    {att.file ? att.file.name : (att.fileSizeFormatted || "Archived Document")}
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
                                                                            {(att.previewUrl || att.existingUrl) && (
                                                                                <Button
                                                                                    type="button"
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    onClick={() => {
                                                                                        if (att.file) {
                                                                                            handleInspectDraftFile(att.label || "Document Preview", att.file, att.previewUrl, "attachment", att.id);
                                                                                        } else if (att.existingUrl) {
                                                                                            setActiveDraftPreview({
                                                                                                url: att.existingUrl,
                                                                                                title: att.label || "Supplementary Document",
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
                                                <span>{isCompressing ? "Optimizing High-Res Scans..." : (modalMode === "EDIT" ? "Saving Changes..." : "Digitizing Record...")}</span>
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" />
                                                <span>{modalMode === "EDIT" ? "Save Changes" : "Save to Archive Vault"}</span>
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
                                        {/* Permit # & Project Details */}
                                        <TableCell className="py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 block">
                                                        {record.permitNumber}
                                                    </span>
                                                    {record.permitType && (
                                                        <span className="text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                            {record.permitType}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 uppercase">
                                                    {record.projectTitle || record.projectType}
                                                </p>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1">
                                                    {record.occupancyGroup ? `${record.occupancyGroup} • ` : ""}{record.occupancyUse}
                                                </p>
                                            </div>
                                        </TableCell>

                                        {/* Applicant & Receipts */}
                                        <TableCell className="py-4">
                                            <span className="font-bold text-sm text-slate-900 dark:text-white block uppercase">
                                                {record.ownerName || record.applicantName}
                                            </span>
                                            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-medium">
                                                {record.orNumber && (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                                                        OR #{record.orNumber}
                                                    </span>
                                                )}
                                                {record.fsecNo && (
                                                    <span className="text-amber-600 dark:text-amber-400 font-mono">
                                                        FSEC: {record.fsecNo}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        {/* Location */}
                                        <TableCell className="py-4">
                                            <div className="flex items-start gap-1.5 text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="line-clamp-1">{record.location}</span>
                                                    {(record.lotNo || record.blkNo || record.tctNo) && (
                                                        <span className="text-[10px] text-slate-400 font-mono block">
                                                            {[record.lotNo ? `Lot ${record.lotNo}` : '', record.blkNo ? `Blk ${record.blkNo}` : '', record.tctNo ? `TCT ${record.tctNo}` : ''].filter(Boolean).join(" • ")}
                                                        </span>
                                                    )}
                                                </div>
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

                                        {/* Valuation & Date Issued */}
                                        <TableCell className="py-4">
                                            <div className="space-y-0.5">
                                                {record.estimatedCost > 0 && (
                                                    <span className="font-mono font-bold text-xs text-slate-900 dark:text-white block">
                                                        ₱{Number(record.estimatedCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                    </span>
                                                )}
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                    {new Date(record.dateIssued).toLocaleDateString("en-PH", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Action: Open Shared Document Viewer & Edit Permit */}
                                        <TableCell className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    onClick={() => handleOpenDocuments(record)}
                                                    disabled={docCount === 0}
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-xl text-xs font-bold uppercase tracking-wider border-indigo-500/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 shadow-sm active:scale-95"
                                                    title="Inspect Scanned Documents"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1.5" /> View {docCount} Doc{docCount !== 1 ? "s" : ""}
                                                </Button>

                                                {record.isPhysical && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleOpenEditModal(record)}
                                                        className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl cursor-pointer transition-colors"
                                                        title="Edit Archive Record & Documents"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
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
