"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
    getArchivedAssessorRecords,
    createArchivedAssessorRecord,
    deleteArchivedAssessorRecord
} from "../actions";
import {
    Search,
    Plus,
    FileText,
    Eye,
    FolderArchive,
    MapPin,
    Building2,
    RefreshCw,
    CheckCircle2,
    Sparkles,
    Trash2,
    UploadCloud,
    Loader2,
    Coins,
    Landmark,
    Filter
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

const MAPANDAN_BARANGAYS = [
    "Amanoaoac",
    "Apaya",
    "Aserda",
    "Baloling",
    "Coral",
    "Golden",
    "Guaoan",
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

const PROPERTY_KINDS = [
    { value: "LAND", label: "Land Parcel" },
    { value: "BUILDING", label: "Building / Improvement" },
    { value: "MACHINERY", label: "Machinery / Industrial" },
];

const CLASSIFICATIONS = [
    { value: "RESIDENTIAL", label: "Residential (20% Default)" },
    { value: "COMMERCIAL", label: "Commercial (50% Default)" },
    { value: "AGRICULTURAL", label: "Agricultural (40% Default)" },
    { value: "INDUSTRIAL", label: "Industrial (50% Default)" },
    { value: "SPECIAL", label: "Special / Exempt (10% Default)" },
];

export default function AssessorArchiveClient({
    themeColor = "#2563eb",
}: {
    themeColor?: string;
}) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [sourceType, setSourceType] = useState<"ALL" | "PHYSICAL" | "ONLINE">("ALL");
    const [propertyKindFilter, setPropertyKindFilter] = useState("ALL");
    const [barangayFilter, setBarangayFilter] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const [stats, setStats] = useState({
        totalRecords: 0,
        physicalDigitized: 0,
        onlineProcessed: 0,
        totalAssessedValuation: 0,
        activeBarangaysCount: 0
    });

    // Document Viewer Modal State
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [selectedDocuments, setSelectedDocuments] = useState<{ url: string; label: string }[]>([]);
    const [viewerTitle, setViewerTitle] = useState("");

    // Details Modal State
    const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    // Create Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form inputs state for physical encoding
    const [formData, setFormData] = useState({
        tdn: "",
        pin: "",
        titleNumber: "",
        lotNumber: "",
        surveyNumber: "",
        ownerName: "",
        beneficiaryName: "",
        contactNumber: "",
        email: "",
        barangay: "Poblacion",
        street: "",
        propertyKind: "LAND",
        classification: "RESIDENTIAL",
        area: "0 sqm",
        marketValue: "",
        assessmentLevel: "20",
        assessedValue: "",
        effectivityYear: new Date().getFullYear().toString(),
        effectivityQuarter: "1st Quarter",
        physicalLocationNotes: "",
    });

    const [mainTaxDecFile, setMainTaxDecFile] = useState<File | null>(null);
    const [additionalAttachments, setAdditionalAttachments] = useState<
        { label: string; file: File | null }[]
    >([
        { label: "Land Title (OCT / TCT)", file: null },
        { label: "Field Appraisal Sheet (FAAS)", file: null },
    ]);

    // Auto calculate Assessed Value when Market Value or Assessment Level changes
    useEffect(() => {
        const mv = parseFloat(formData.marketValue) || 0;
        const al = parseFloat(formData.assessmentLevel) || 0;
        if (mv > 0 && al > 0) {
            const computed = Math.round(mv * (al / 100) * 100) / 100;
            setFormData(prev => ({ ...prev, assessedValue: computed.toString() }));
        }
    }, [formData.marketValue, formData.assessmentLevel]);

    // Handle classification change to auto-suggest assessment levels
    const handleClassificationChange = (val: string) => {
        let defaultLevel = "20";
        if (val === "COMMERCIAL" || val === "INDUSTRIAL") defaultLevel = "50";
        else if (val === "AGRICULTURAL") defaultLevel = "40";
        else if (val === "SPECIAL") defaultLevel = "10";
        setFormData(prev => ({
            ...prev,
            classification: val,
            assessmentLevel: defaultLevel
        }));
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
            const res = await getArchivedAssessorRecords({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                sourceType,
                propertyKind: propertyKindFilter,
                barangay: barangayFilter,
                startDate,
                endDate,
            });

            if (res.success && res.data) {
                setRecords(res.data);
                setTotalPages(res.pagination?.totalPages || 1);
                setTotalCount(res.pagination?.totalCount || 0);
                if (res.stats) {
                    setStats(res.stats);
                }
            } else {
                toast.error(res.error || "Failed to load Assessor records.");
            }
        } catch {
            toast.error("An unexpected error occurred while fetching archives.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, debouncedSearch, sourceType, propertyKindFilter, barangayFilter, startDate, endDate]);

    useEffect(() => {
        fetchArchives();
    }, [fetchArchives]);

    // Reset form helper
    const resetForm = () => {
        setFormData({
            tdn: "",
            pin: "",
            titleNumber: "",
            lotNumber: "",
            surveyNumber: "",
            ownerName: "",
            beneficiaryName: "",
            contactNumber: "",
            email: "",
            barangay: "Poblacion",
            street: "",
            propertyKind: "LAND",
            classification: "RESIDENTIAL",
            area: "0 sqm",
            marketValue: "",
            assessmentLevel: "20",
            assessedValue: "",
            effectivityYear: new Date().getFullYear().toString(),
            effectivityQuarter: "1st Quarter",
            physicalLocationNotes: "",
        });
        setMainTaxDecFile(null);
        setAdditionalAttachments([
            { label: "Land Title (OCT / TCT)", file: null },
            { label: "Field Appraisal Sheet (FAAS)", file: null },
        ]);
    };

    // Add Attachment row
    const handleAddAttachmentRow = () => {
        setAdditionalAttachments(prev => [...prev, { label: "", file: null }]);
    };

    // Remove Attachment row
    const handleRemoveAttachmentRow = (index: number) => {
        setAdditionalAttachments(prev => prev.filter((_, idx) => idx !== index));
    };

    // Handle Create Physical Archive Submission
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.tdn.trim()) {
            toast.error("Tax Declaration Number (TDN) is required.");
            return;
        }
        if (!formData.ownerName.trim()) {
            toast.error("Declared Owner Name is required.");
            return;
        }

        setIsSubmitting(true);
        try {
            const data = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                data.append(key, val);
            });

            if (mainTaxDecFile) {
                data.append("mainTaxDecFile", mainTaxDecFile);
            }

            additionalAttachments.forEach((att) => {
                if (att.file) {
                    data.append("attachedFiles", att.file);
                    data.append("attachedLabels", att.label || "Supplementary Document");
                }
            });

            const res = await createArchivedAssessorRecord(data);

            if (res.success) {
                toast.success(res.message || "Record successfully encoded into master vault!");
                setIsCreateOpen(false);
                resetForm();
                fetchArchives();
            } else {
                toast.error(res.error || "Failed to create archive record.");
            }
        } catch {
            toast.error("An error occurred while uploading documents.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle Delete Physical Record
    const handleDeleteRecord = async (id: string, tdn: string) => {
        if (!confirm(`Are you sure you want to delete Tax Declaration "${tdn}" from the archives?`)) {
            return;
        }

        try {
            const res = await deleteArchivedAssessorRecord(id);
            if (res.success) {
                toast.success(res.message);
                fetchArchives();
            } else {
                toast.error(res.error || "Failed to delete record.");
            }
        } catch {
            toast.error("An error occurred during deletion.");
        }
    };

    // Open Document Lightbox
    const openDocumentViewer = (record: any) => {
        if (!record.scannedDocs || record.scannedDocs.length === 0) {
            toast.info("No scanned documents attached to this record.");
            return;
        }

        setSelectedDocuments(record.scannedDocs.map((doc: any) => ({
            url: doc.url,
            label: doc.label || "Scanned Document"
        })));
        setViewerTitle(`Tax Dec: ${record.tdn} - ${record.ownerName}`);
        setIsViewerOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* KPI Metric Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: themeColor }}
                    >
                        <FolderArchive className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Total Property Vault
                        </p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.totalRecords.toLocaleString()}
                        </h3>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
                        <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Digitized Physical Records
                        </p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.physicalDigitized.toLocaleString()}
                        </h3>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                        <Coins className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Total Assessed Value (₱)
                        </p>
                        <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            ₱{stats.totalAssessedValuation.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
                        <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Active Barangays
                        </p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.activeBarangaysCount} / 15
                        </h3>
                    </div>
                </div>
            </div>

            {/* Top Toolbar: Search, Filters & Encode Modal Button */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by TDN, PIN, Owner Name, Title No, or Lot..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 h-11 rounded-2xl bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] text-xs"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={() => fetchArchives()}
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-2xl border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-[#151b2b] cursor-pointer"
                            title="Refresh Data"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? "animate-spin" : ""}`} />
                        </Button>

                        {/* Encode Physical Record Modal */}
                        <Dialog
                            open={isCreateOpen}
                            onOpenChange={open => {
                                setIsCreateOpen(open);
                                if (!open) resetForm();
                            }}
                        >
                            <DialogTrigger asChild>
                                <Button
                                    className="rounded-2xl text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 shadow-lg flex items-center gap-2 cursor-pointer"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <Plus className="w-4 h-4" /> Encode Physical Tax Dec
                                </Button>
                            </DialogTrigger>

                            <DialogContent className="sm:max-w-[95vw] lg:max-w-7xl w-[95vw] h-[92vh] max-h-[92vh] p-0 overflow-hidden rounded-3xl bg-white dark:bg-[#0f1422] border-slate-200 dark:border-[#2a3040] flex flex-col shadow-2xl">
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
                                                <span>Encode Physical Real Property Tax Record</span>
                                                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                    Assessor Vault
                                                </span>
                                            </DialogTitle>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                Digitize legacy paper Tax Declarations, land titles, and FAAS assessment sheets into the master database.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Scrollable Form Body */}
                                <form id="assessor-encoding-form" onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                        {/* Left Column: Property & Assessment Details (7 Cols) */}
                                        <div className="lg:col-span-7 space-y-6">
                                            {/* Section 1: Property Identification */}
                                            <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                    <Landmark className="w-4 h-4 text-blue-600" />
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        Property Identification & Title
                                                    </h3>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5 sm:col-span-1">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Tax Declaration Number (TDN) <span className="text-rose-500">*</span>
                                                        </Label>
                                                        <Input
                                                            required
                                                            placeholder="e.g. 2024-01-001-00123"
                                                            value={formData.tdn}
                                                            onChange={e => setFormData({ ...formData, tdn: e.target.value })}
                                                            className="rounded-xl h-11 font-mono font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5 sm:col-span-1">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Property Index No. (PIN)
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g. 001-01-001-01-001"
                                                            value={formData.pin}
                                                            onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                                            className="rounded-xl h-11 font-mono bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5 sm:col-span-1">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Land Title No. (TCT / OCT / CLOA)
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g. T-123456"
                                                            value={formData.titleNumber}
                                                            onChange={e => setFormData({ ...formData, titleNumber: e.target.value })}
                                                            className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5 sm:col-span-1">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Cadastral Survey / Lot No.
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g. Lot 12, Cad. 305-D"
                                                            value={formData.surveyNumber}
                                                            onChange={e => setFormData({ ...formData, surveyNumber: e.target.value })}
                                                            className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 2: Owner & Location Details */}
                                            <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                    <Building2 className="w-4 h-4 text-blue-600" />
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        Declared Owner & Location
                                                    </h3>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-1.5 sm:col-span-2">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Declared Owner Full Name <span className="text-rose-500">*</span>
                                                        </Label>
                                                        <Input
                                                            required
                                                            placeholder="e.g. Juan Dela Cruz"
                                                            value={formData.ownerName}
                                                            onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                                                            className="rounded-xl h-11 font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5 sm:col-span-1">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Administrator / Beneficiary
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g. Maria Dela Cruz (Spouse)"
                                                            value={formData.beneficiaryName}
                                                            onChange={e => setFormData({ ...formData, beneficiaryName: e.target.value })}
                                                            className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5 sm:col-span-1">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Barangay in Mapandan <span className="text-rose-500">*</span>
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

                                                    <div className="space-y-1.5 sm:col-span-2">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Street / Sitio Address
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g. Rizal Street, Sitio Centro"
                                                            value={formData.street}
                                                            onChange={e => setFormData({ ...formData, street: e.target.value })}
                                                            className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Section 3: Assessment & Tax Computation */}
                                            <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                    <Coins className="w-4 h-4 text-emerald-500" />
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        Property Valuation & Assessment (₱)
                                                    </h3>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Property Kind
                                                        </Label>
                                                        <Select
                                                            value={formData.propertyKind}
                                                            onValueChange={val => setFormData({ ...formData, propertyKind: val })}
                                                        >
                                                            <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]">
                                                                <SelectValue placeholder="Kind" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {PROPERTY_KINDS.map(pk => (
                                                                    <SelectItem key={pk.value} value={pk.value}>
                                                                        {pk.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Classification
                                                        </Label>
                                                        <Select
                                                            value={formData.classification}
                                                            onValueChange={handleClassificationChange}
                                                        >
                                                            <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]">
                                                                <SelectValue placeholder="Classification" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {CLASSIFICATIONS.map(cl => (
                                                                    <SelectItem key={cl.value} value={cl.value}>
                                                                        {cl.label}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Area (SQM / HA)
                                                        </Label>
                                                        <Input
                                                            placeholder="e.g. 500 sqm"
                                                            value={formData.area}
                                                            onChange={e => setFormData({ ...formData, area: e.target.value })}
                                                            className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Market Value (₱)
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="e.g. 500000"
                                                            value={formData.marketValue}
                                                            onChange={e => setFormData({ ...formData, marketValue: e.target.value })}
                                                            className="rounded-xl h-11 font-mono font-bold bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Assessment Level (%)
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="20"
                                                            value={formData.assessmentLevel}
                                                            onChange={e => setFormData({ ...formData, assessmentLevel: e.target.value })}
                                                            className="rounded-xl h-11 font-mono bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                            Assessed Value (₱)
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="Auto calculated"
                                                            value={formData.assessedValue}
                                                            onChange={e => setFormData({ ...formData, assessedValue: e.target.value })}
                                                            className="rounded-xl h-11 font-mono font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Effectivity Year
                                                        </Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="2024"
                                                            value={formData.effectivityYear}
                                                            onChange={e => setFormData({ ...formData, effectivityYear: e.target.value })}
                                                            className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                        />
                                                    </div>

                                                    <div className="space-y-1.5 sm:col-span-2">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                            Effectivity Quarter
                                                        </Label>
                                                        <Select
                                                            value={formData.effectivityQuarter}
                                                            onValueChange={val => setFormData({ ...formData, effectivityQuarter: val })}
                                                        >
                                                            <SelectTrigger className="rounded-xl h-11 bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]">
                                                                <SelectValue placeholder="Quarter" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="1st Quarter">1st Quarter (Jan - Mar)</SelectItem>
                                                                <SelectItem value="2nd Quarter">2nd Quarter (Apr - Jun)</SelectItem>
                                                                <SelectItem value="3rd Quarter">3rd Quarter (Jul - Sep)</SelectItem>
                                                                <SelectItem value="4th Quarter">4th Quarter (Oct - Dec)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5 pt-2">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Physical Archive Binder / Shelf Reference Notes
                                                    </Label>
                                                    <Textarea
                                                        placeholder="e.g. Cabinet 3, Drawer B, Binder 2024-POB-RPT..."
                                                        value={formData.physicalLocationNotes}
                                                        onChange={e => setFormData({ ...formData, physicalLocationNotes: e.target.value })}
                                                        className="rounded-xl min-h-[60px] bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040] text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Column: Scanned Documents & Uploads (5 Cols) */}
                                        <div className="lg:col-span-5 flex flex-col">
                                            <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm flex flex-col">
                                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-[#2a3040] shrink-0">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-blue-600" />
                                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                            Scanned Documents
                                                        </h3>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        onClick={handleAddAttachmentRow}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 cursor-pointer"
                                                    >
                                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add File
                                                    </Button>
                                                </div>

                                                {/* Primary Signed Tax Dec Upload Box */}
                                                <div className="p-4 rounded-2xl bg-blue-500/5 border-2 border-dashed border-blue-500/30 space-y-2.5 shrink-0">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-[11px] font-black uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Certified Tax Declaration (Primary)
                                                        </Label>
                                                        {mainTaxDecFile && (
                                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                                ✓ File Selected
                                                            </span>
                                                        )}
                                                    </div>
                                                    <Input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={e => setMainTaxDecFile(e.target.files?.[0] || null)}
                                                        className="bg-white dark:bg-[#121622] rounded-xl cursor-pointer text-xs"
                                                    />
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        Upload high-res scan of the official signed Tax Declaration certificate.
                                                    </p>
                                                </div>

                                                {/* Supplementary Attachments List - Capped with internal scrollbar */}
                                                <div className="space-y-3 flex flex-col">
                                                    <div className="flex items-center justify-between shrink-0">
                                                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                            Supplementary Deeds, Titles & Clearances ({additionalAttachments.length})
                                                        </p>
                                                    </div>

                                                    {additionalAttachments.length === 0 ? (
                                                        <div
                                                            onClick={handleAddAttachmentRow}
                                                            className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200/80 dark:border-slate-800 bg-white/40 dark:bg-[#121622]/40 text-slate-400 hover:text-blue-500 hover:border-blue-300 dark:hover:border-blue-500/30 transition-all cursor-pointer text-center min-h-[160px]"
                                                        >
                                                            <UploadCloud className="w-8 h-8 text-blue-400/80 mb-2 animate-bounce" />
                                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">No Supplementary Files Added</span>
                                                            <span className="text-[10px] text-slate-400 mt-1">Click here or &ldquo;+ Add File&rdquo; to attach Land Titles, Deeds, or FAAS sheets</span>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1.5 custom-scrollbar">
                                                            {additionalAttachments.map((att, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className="p-3.5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] space-y-2 shadow-sm"
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <Input
                                                                            placeholder="Document Label (e.g. Land Title OCT/TCT)"
                                                                            value={att.label}
                                                                            onChange={e => {
                                                                                const updated = [...additionalAttachments];
                                                                                updated[idx].label = e.target.value;
                                                                                setAdditionalAttachments(updated);
                                                                            }}
                                                                            className="h-8 rounded-lg text-xs font-bold bg-slate-50 dark:bg-[#151b2b]"
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            onClick={() => handleRemoveAttachmentRow(idx)}
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0 cursor-pointer"
                                                                            title="Remove file"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </Button>
                                                                    </div>
                                                                    <Input
                                                                        type="file"
                                                                        accept="image/*,application/pdf"
                                                                        onChange={e => {
                                                                            const updated = [...additionalAttachments];
                                                                            updated[idx].file = e.target.files?.[0] || null;
                                                                            setAdditionalAttachments(updated);
                                                                        }}
                                                                        className="h-9 rounded-lg text-xs cursor-pointer bg-slate-50 dark:bg-[#151b2b]"
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>

                                {/* Sticky Modal Action Footer */}
                                <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/80 dark:bg-[#151b2b] flex items-center justify-between shrink-0">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setIsCreateOpen(false);
                                            resetForm();
                                        }}
                                        className="rounded-xl font-bold text-xs"
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        type="submit"
                                        form="assessor-encoding-form"
                                        disabled={isSubmitting}
                                        className="rounded-xl text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 shadow-md flex items-center gap-2 cursor-pointer"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> Digitizing & Uploading...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" /> Encode & Save to Vault
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Filter Row: Source, Property Kind, Barangay, Dates */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-[#2a3040] text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <Filter className="w-3.5 h-3.5" /> Filters:
                    </div>

                    {/* Source Filter */}
                    <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040]">
                        {(["ALL", "PHYSICAL", "ONLINE"] as const).map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    setSourceType(type);
                                    setCurrentPage(1);
                                }}
                                className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                                    sourceType === type
                                        ? "bg-white dark:bg-[#202738] text-slate-900 dark:text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                {type === "ALL" ? "All Records" : type === "PHYSICAL" ? "Physical Archives" : "Online Requests"}
                            </button>
                        ))}
                    </div>

                    {/* Property Kind Filter */}
                    <Select
                        value={propertyKindFilter}
                        onValueChange={val => {
                            setPropertyKindFilter(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[140px] h-9 rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectValue placeholder="Kind" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Kinds</SelectItem>
                            <SelectItem value="LAND">Land Parcel</SelectItem>
                            <SelectItem value="BUILDING">Building</SelectItem>
                            <SelectItem value="MACHINERY">Machinery</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Barangay Filter */}
                    <Select
                        value={barangayFilter}
                        onValueChange={val => {
                            setBarangayFilter(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectValue placeholder="All Barangays" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Barangays</SelectItem>
                            {MAPANDAN_BARANGAYS.map(brgy => (
                                <SelectItem key={brgy} value={brgy}>
                                    Brgy. {brgy}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={e => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-9 w-[130px] rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]"
                            title="Start Date"
                        />
                        <span className="text-slate-400 font-bold">to</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={e => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-9 w-[130px] rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]"
                            title="End Date"
                        />
                    </div>

                    {(search || sourceType !== "ALL" || propertyKindFilter !== "ALL" || barangayFilter !== "ALL" || startDate || endDate) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch("");
                                setDebouncedSearch("");
                                setSourceType("ALL");
                                setPropertyKindFilter("ALL");
                                setBarangayFilter("ALL");
                                setStartDate("");
                                setEndDate("");
                                setCurrentPage(1);
                            }}
                            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer h-9 px-3 rounded-xl"
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Master Archive Table */}
            <div className="rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/75 dark:bg-[#151b2b]/75">
                        <TableRow className="border-slate-100 dark:border-[#2a3040]">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Tax Dec / PIN</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Declared Owner</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Barangay & Location</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Property Kind</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Assessed Value (₱)</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Scanned Docs</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Source</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Loading Assessor Archives...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : records.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <FolderArchive className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider">No matching property records found in vault</span>
                                        <p className="text-[11px] text-slate-400">Try adjusting your search keywords or filter criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            records.map((r: any) => (
                                <TableRow key={r.id} className="border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                    {/* TDN & PIN */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                                                {r.tdn}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                                PIN: {r.pin !== "N/A" ? r.pin : "Not Assigned"}
                                            </span>
                                            {r.titleNumber !== "N/A" && (
                                                <span className="text-[9px] text-slate-500 font-semibold">
                                                    Title: {r.titleNumber}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Owner Name */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                                {r.ownerName}
                                            </span>
                                            {r.beneficiaryName && (
                                                <span className="text-[10px] text-slate-400">
                                                    Admin: {r.beneficiaryName}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Location */}
                                    <TableCell className="py-3.5">
                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            <span>Brgy. {r.barangay}</span>
                                        </div>
                                    </TableCell>

                                    {/* Kind & Classification */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                                {r.propertyKind}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400">
                                                {r.classification}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Assessed Valuation */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400">
                                                ₱{r.assessedValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[9px] font-mono text-slate-400">
                                                MV: ₱{r.marketValue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Scanned Docs */}
                                    <TableCell className="py-3.5">
                                        {r.scannedDocs && r.scannedDocs.length > 0 ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openDocumentViewer(r)}
                                                className="h-8 rounded-xl px-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-100 gap-1.5 cursor-pointer"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                <span>{r.scannedDocs.length} {r.scannedDocs.length === 1 ? "File" : "Files"}</span>
                                            </Button>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 italic">No Scans</span>
                                        )}
                                    </TableCell>

                                    {/* Source Badge */}
                                    <TableCell className="py-3.5">
                                        {r.isPhysicalArchive ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                Physical
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                Online
                                            </span>
                                        )}
                                    </TableCell>

                                    {/* Actions */}
                                    <TableCell className="py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setSelectedRecord(r);
                                                    setIsDetailOpen(true);
                                                }}
                                                className="h-8 w-8 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                                                title="View Full Record Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>

                                            {r.isPhysicalArchive && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteRecord(r.id, r.tdn)}
                                                    className="h-8 w-8 rounded-xl text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                                    title="Delete Archived Record"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <span className="text-slate-500">
                        Showing {records.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
                    </span>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1 || loading}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="rounded-xl h-8 px-3 text-xs"
                        >
                            Previous
                        </Button>
                        <span className="font-bold px-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages || loading}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="rounded-xl h-8 px-3 text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* View Full Property Details Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-2xl rounded-3xl p-6 bg-white dark:bg-[#0f1422] border-slate-200 dark:border-[#2a3040] shadow-2xl">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2a3040]">
                        <div className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-blue-600" />
                            <span>Tax Declaration #{selectedRecord?.tdn}</span>
                        </div>
                        {selectedRecord?.isPhysicalArchive ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-600 border border-indigo-500/20">
                                Physical Archive
                            </span>
                        ) : (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                Online Request
                            </span>
                        )}
                    </DialogTitle>

                    {selectedRecord && (
                        <div className="space-y-4 pt-2 text-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#151b2b] border border-slate-200/60 dark:border-[#2a3040]">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Declared Owner</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord.ownerName}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">PIN Number</span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedRecord.pin}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Land Title No.</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord.titleNumber}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Barangay</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Brgy. {selectedRecord.barangay}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Kind / Class</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord.propertyKind} ({selectedRecord.classification})</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Land/Floor Area</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedRecord.area}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Market Value (₱)</span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₱{selectedRecord.marketValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Assessment Level</span>
                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedRecord.assessmentLevel}%</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Assessed Value (₱)</span>
                                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">₱{selectedRecord.assessedValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>

                            {selectedRecord.physicalLocationNotes && (
                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040]">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Physical Archive Binder / Shelf Reference</span>
                                    <p className="text-slate-700 dark:text-slate-300 font-medium">{selectedRecord.physicalLocationNotes}</p>
                                </div>
                            )}

                            {/* Scanned Docs List */}
                            <div className="space-y-2 pt-2">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    Attached Documents ({selectedRecord.scannedDocs?.length || 0})
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {selectedRecord.scannedDocs?.map((doc: any, i: number) => (
                                        <a
                                            key={i}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-3 rounded-xl bg-slate-50 dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] hover:border-blue-500/50 flex items-center justify-between group transition-all"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                                                <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{doc.label}</span>
                                            </div>
                                            <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end pt-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsDetailOpen(false)}
                                    className="rounded-xl text-xs font-bold"
                                >
                                    Close Details
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Document Viewer Lightbox Modal */}
            <DocumentViewerModal
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                documents={selectedDocuments}
                title={viewerTitle}
                showPrint={true}
            />
        </div>
    );
}
