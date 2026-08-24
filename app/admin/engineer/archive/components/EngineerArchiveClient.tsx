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
    Sparkles,
    Trash2,
    UploadCloud,
    Loader2,
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

    // Form inputs state for physical encoding
    const [formData, setFormData] = useState({
        permitNumber: "",
        applicantName: "",
        contactNumber: "",
        email: "",
        houseNumber: "",
        street: "",
        barangay: "Poblacion",
        dateIssued: new Date().toISOString().split("T")[0],
        projectType: "New Building Construction",
        occupancyUse: "Residential",
        estimatedCost: "",
        totalFloors: "1",
        isLotOwner: "Yes",
        remarks: "",
    });

    const [mainPermitFile, setMainPermitFile] = useState<File | null>(null);
    const [additionalAttachments, setAdditionalAttachments] = useState<
        { label: string; file: File | null }[]
    >([
        { label: "Approved Architectural Plans", file: null },
        { label: "Tax Declaration / Land Title", file: null },
    ]);

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

    // Add extra document row
    const handleAddAttachmentRow = () => {
        setAdditionalAttachments(prev => [...prev, { label: "", file: null }]);
    };

    // Remove extra document row
    const handleRemoveAttachmentRow = (index: number) => {
        setAdditionalAttachments(prev => prev.filter((_, i) => i !== index));
    };

    // Submit Physical Record
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.permitNumber || !formData.applicantName) {
            toast.error("Please enter the Permit Number and Applicant Name.");
            return;
        }

        setIsSubmitting(true);
        try {
            const fd = new FormData();
            Object.entries(formData).forEach(([key, val]) => {
                fd.append(key, val);
            });

            if (mainPermitFile) {
                fd.append("mainPermitFile", mainPermitFile);
            }

            additionalAttachments.forEach((item, idx) => {
                if (item.file) {
                    fd.append("attachedFiles", item.file);
                    fd.append("attachedLabels", item.label || `Attachment ${idx + 1}`);
                }
            });

            const res = await createArchivedBuildingPermit(fd);

            if (res.success) {
                toast.success(`Permit #${res.permitNumber} successfully encoded to archives!`);
                setIsCreateOpen(false);
                // Reset form
                setFormData({
                    permitNumber: "",
                    applicantName: "",
                    contactNumber: "",
                    email: "",
                    houseNumber: "",
                    street: "",
                    barangay: "Poblacion",
                    dateIssued: new Date().toISOString().split("T")[0],
                    projectType: "New Building Construction",
                    occupancyUse: "Residential",
                    estimatedCost: "",
                    totalFloors: "1",
                    isLotOwner: "Yes",
                    remarks: "",
                });
                setMainPermitFile(null);
                setAdditionalAttachments([
                    { label: "Approved Architectural Plans", file: null },
                    { label: "Tax Declaration / Land Title", file: null },
                ]);
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

                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button
                                className="rounded-2xl text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                                style={{ backgroundColor: themeColor }}
                            >
                                <Plus className="w-4 h-4" /> Encode Physical Permit
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
                                                    Applicant & Permit Identification
                                                </h3>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5 sm:col-span-2">
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

                                                <div className="space-y-1.5 sm:col-span-2">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Applicant / Owner Full Name <span className="text-rose-500">*</span>
                                                    </Label>
                                                    <Input
                                                        required
                                                        placeholder="First Name, Middle Name, Last Name"
                                                        value={formData.applicantName}
                                                        onChange={e => setFormData({ ...formData, applicantName: e.target.value })}
                                                        className="rounded-xl h-11 font-bold text-sm bg-white dark:bg-[#121622] border-slate-200 dark:border-[#2a3040]"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
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

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Barangay Location <span className="text-rose-500">*</span>
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

                                                <div className="space-y-1.5">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                        Contact Number (Optional)
                                                    </Label>
                                                    <Input
                                                        placeholder="e.g. 0912 345 6789"
                                                        value={formData.contactNumber}
                                                        onChange={e => setFormData({ ...formData, contactNumber: e.target.value })}
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
                                    <div className="lg:col-span-5 space-y-6">
                                        <div className="p-5 rounded-3xl bg-slate-50/80 dark:bg-[#151b2b]/60 border border-slate-200/80 dark:border-[#2a3040] space-y-4 shadow-sm flex flex-col h-full">
                                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-[#2a3040]">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-indigo-500" />
                                                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        Scanned Documents
                                                    </h3>
                                                </div>
                                                <Button
                                                    type="button"
                                                    onClick={handleAddAttachmentRow}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10"
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" /> Add File
                                                </Button>
                                            </div>

                                            {/* Primary Signed Permit Upload Box */}
                                            <div className="p-4 rounded-2xl bg-indigo-500/5 border-2 border-dashed border-indigo-500/30 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-[11px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Official Signed Permit (Primary)
                                                    </Label>
                                                    {mainPermitFile && (
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                                                            ✓ File Selected
                                                        </span>
                                                    )}
                                                </div>
                                                <Input
                                                    type="file"
                                                    accept="image/*,application/pdf"
                                                    onChange={e => setMainPermitFile(e.target.files?.[0] || null)}
                                                    className="bg-white dark:bg-[#121622] rounded-xl cursor-pointer text-xs"
                                                />
                                                <p className="text-[10px] text-slate-400 font-medium">
                                                    Upload high-res scan of the official signed building permit certificate.
                                                </p>
                                            </div>

                                            {/* Supplementary Attachments List */}
                                            <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1">
                                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    Supplementary Plans, Clearances & Records
                                                </p>
                                                {additionalAttachments.map((att, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="p-3.5 rounded-2xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] space-y-2 shadow-sm"
                                                    >
                                                        <div className="flex items-center justify-between gap-2">
                                                            <Input
                                                                placeholder="Document Label (e.g. Architectural Plan)"
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
                                                                className="h-8 w-8 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0"
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
                                        onClick={() => setIsCreateOpen(false)}
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
                                                <Loader2 className="w-4 h-4 animate-spin" /> Digitizing Record...
                                            </>
                                        ) : (
                                            <>
                                                <CheckCircle2 className="w-4 h-4" /> Save to Archive Vault
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
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-sm">
                                                    <FolderArchive className="w-3 h-3" /> Paper Archive
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-sm">
                                                    <Sparkles className="w-3 h-3" /> Online Portal
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
            />
        </div>
    );
}
