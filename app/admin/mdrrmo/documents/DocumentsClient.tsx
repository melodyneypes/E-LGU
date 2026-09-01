"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
    FolderArchive, 
    Trash2, 
    ArrowLeft, 
    Download, 
    Eye, 
    AlertTriangle, 
    CheckCircle2, 
    Search, 
    UploadCloud, 
    Car, 
    FileCheck, 
    Loader2, 
    ExternalLink 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useSystemTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { uploadMDRRMODocument, deleteMDRRMODocument } from "../actions";

interface DocumentsClientProps {
    initialDocuments: any[];
    fleet: any[];
    initialAmbulanceId?: string;
    initialType?: string;
    isReadOnly?: boolean;
}

export default function DocumentsClient({
    initialDocuments = [],
    fleet = [],
    initialAmbulanceId = "ALL",
    initialType = "ALL",
    isReadOnly = false
}: DocumentsClientProps) {
    let themeColor = "#ea580c";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {}

    const [documents, setDocuments] = useState<any[]>(initialDocuments);
    const [selectedAmbulance, setSelectedAmbulance] = useState(initialAmbulanceId);
    const [selectedType, setSelectedType] = useState(initialType);
    const [searchQuery, setSearchQuery] = useState("");

    // Upload Modal State
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFileObj, setUploadFileObj] = useState<File | null>(null);
    const [uploadForm, setUploadForm] = useState({
        ambulanceId: "",
        documentType: "",
        title: "",
        documentNumber: "",
        issueDate: "",
        expiryDate: "",
        issuingAgency: "",
        remarks: ""
    });

    // Preview Modal State
    const [previewDoc, setPreviewDoc] = useState<any | null>(null);

    const docTypeLabels: Record<string, string> = {
        OR_CR: "Official Receipt & CR (OR/CR)",
        OFFICIAL_RECEIPT: "Official Receipt (OR)",
        CERTIFICATE_OF_REGISTRATION: "Certificate of Registration (CR)",
        INSURANCE_POLICY: "Vehicle Insurance (TPL / Comprehensive)",
        EMISSION_TEST: "Emission Testing Certificate",
        LTO_REGISTRATION: "LTO Annual Registration Renewal",
        MAINTENANCE_RECORD: "Preventive Maintenance Log",
        SPECIAL_PERMIT: "Special Travel / Transfer Permit",
        OTHER: "Other Vehicle Paperwork"
    };

    const handleOpenUploadModal = () => {
        setUploadFileObj(null);
        setUploadForm({
            ambulanceId: selectedAmbulance !== "ALL" ? selectedAmbulance : "",
            documentType: "",
            title: "",
            documentNumber: "",
            issueDate: "",
            expiryDate: "",
            issuingAgency: "",
            remarks: ""
        });
        setIsUploadModalOpen(true);
    };

    const handleUploadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uploadForm.ambulanceId) {
            toast.error("Please select a target ambulance unit.");
            return;
        }
        if (!uploadForm.documentType) {
            toast.error("Please select a document category.");
            return;
        }
        if (!uploadForm.title.trim()) {
            toast.error("Please enter a document title.");
            return;
        }
        if (!uploadFileObj) {
            toast.error("Please attach a document file (PDF or Image).");
            return;
        }

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("ambulanceId", uploadForm.ambulanceId);
            formData.append("documentType", uploadForm.documentType);
            formData.append("title", uploadForm.title);
            if (uploadForm.documentNumber) formData.append("documentNumber", uploadForm.documentNumber);
            if (uploadForm.issueDate) formData.append("issueDate", uploadForm.issueDate);
            if (uploadForm.expiryDate) formData.append("expiryDate", uploadForm.expiryDate);
            if (uploadForm.issuingAgency) formData.append("issuingAgency", uploadForm.issuingAgency);
            if (uploadForm.remarks) formData.append("remarks", uploadForm.remarks);
            formData.append("file", uploadFileObj);

            const res = await uploadMDRRMODocument(formData);
            if (res.success && res.document) {
                setDocuments(prev => [res.document, ...prev]);
                toast.success("Document digitized and filed successfully!");
                setIsUploadModalOpen(false);
            } else {
                toast.error(res.error || "Failed to upload document");
            }
        } catch {
            toast.error("Network error uploading document");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteDoc = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;

        try {
            const res = await deleteMDRRMODocument(id);
            if (res.success) {
                setDocuments(prev => prev.filter(d => d.id !== id));
                toast.success("Document removed from filing system.");
            } else {
                toast.error(res.error || "Failed to delete document");
            }
        } catch {
            toast.error("Network error deleting document");
        }
    };

    // Filter documents
    const filteredDocs = documents.filter(doc => {
        const matchesAmbulance = selectedAmbulance === "ALL" || doc.ambulanceId === selectedAmbulance;
        const matchesType = selectedType === "ALL" || doc.documentType === selectedType;
        const matchesQuery = 
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.documentNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.ambulance?.unit || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (doc.issuingAgency || "").toLowerCase().includes(searchQuery.toLowerCase());

        return matchesAmbulance && matchesType && matchesQuery;
    });

    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(now.getDate() + 30);

    const expiredCount = documents.filter(d => d.expiryDate && new Date(d.expiryDate) < now).length;
    const expiringSoonCount = documents.filter(d => {
        if (!d.expiryDate) return false;
        const exp = new Date(d.expiryDate);
        return exp >= now && exp <= thirtyDaysAhead;
    }).length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161a24] p-6 md:p-8 rounded-[1.75rem] border border-slate-200/80 dark:border-slate-800/80 shadow-md relative overflow-hidden">
                <div 
                    className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-10 dark:opacity-20"
                    style={{ backgroundColor: themeColor }}
                />

                <div className="space-y-2 relative z-10">
                    <Link
                        href="/admin/mdrrmo"
                        className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors mb-1"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" /> Back to MDRRMO Hub
                    </Link>
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <FolderArchive className="w-7 h-7 shrink-0" style={{ color: themeColor }} />
                        Ambulance OR/CR & Vehicle Papers Filing
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-2xl">
                        Secure digital filing repository for municipal emergency ambulance Official Receipts (OR), Certificates of Registration (CR), insurance policies, and annual LTO renewals with automated expiration sentinel tracking.
                    </p>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-3 relative z-10">
                        <Button
                            onClick={handleOpenUploadModal}
                            className="h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColor,
                                boxShadow: `0 8px 20px -4px ${themeColor}50`
                            }}
                        >
                            <UploadCloud className="w-4 h-4 mr-2" /> Upload Vehicle Paper
                        </Button>
                    </div>
                )}
            </div>

            {/* Expiration Sentinel Alert Banner */}
            {(expiredCount > 0 || expiringSoonCount > 0) && (
                <div className={cn(
                    "p-4 md:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm",
                    expiredCount > 0
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                )}>
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-wider">
                                {expiredCount > 0 ? "Expired Vehicle Paperwork Detected" : "Vehicle Paperwork Expiring Soon"}
                            </h4>
                            <p className="text-[11px] font-semibold opacity-90">
                                {expiredCount > 0
                                    ? `${expiredCount} document(s) have expired and require immediate LTO or insurance renewal.`
                                    : `${expiringSoonCount} document(s) are due for renewal within the next 30 days.`}
                            </p>
                        </div>
                    </div>
                    <Badge variant="outline" className="font-black text-xs uppercase shrink-0">
                        {expiredCount > 0 ? `${expiredCount} Expired` : `${expiringSoonCount} Due Soon`}
                    </Badge>
                </div>
            )}

            {/* Filters Bar */}
            <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] p-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Filter by Ambulance */}
                    <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                            Ambulance Unit Drawer
                        </Label>
                        <Select value={selectedAmbulance} onValueChange={setSelectedAmbulance}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                <SelectItem value="ALL" className="text-xs font-bold">All Municipal Fleet Units</SelectItem>
                                {fleet.map(v => (
                                    <SelectItem key={v.id} value={v.id} className="text-xs font-bold">
                                        {v.unit} ({v.plateNumber || "No Plate"})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter by Document Category */}
                    <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                            Document Type
                        </Label>
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                <SelectItem value="ALL" className="text-xs font-bold">All Categories</SelectItem>
                                {Object.entries(docTypeLabels).map(([val, label]) => (
                                    <SelectItem key={val} value={val} className="text-xs font-bold">{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Search */}
                    <div>
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                            Search Document
                        </Label>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search title, OR#, agency..."
                                className="h-10 pl-8 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold"
                            />
                        </div>
                    </div>
                </div>
            </Card>

            {/* Documents Grid */}
            {filteredDocs.length === 0 ? (
                <Card className="rounded-[1.75rem] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] p-12 text-center text-slate-400 space-y-3">
                    <FolderArchive className="w-12 h-12 mx-auto opacity-30" />
                    <h3 className="text-sm font-black uppercase tracking-wider">No vehicle papers found</h3>
                    <p className="text-xs font-semibold max-w-sm mx-auto">
                        Upload digitized copies of Official Receipts, Certificates of Registration, and insurance certificates for this vehicle.
                    </p>
                    {!isReadOnly && (
                        <Button onClick={handleOpenUploadModal} variant="outline" className="rounded-xl font-bold text-xs uppercase">
                            + Upload Paper
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDocs.map((doc) => {
                        const isExpired = doc.expiryDate && new Date(doc.expiryDate) < now;
                        const isExpiringSoon = !isExpired && doc.expiryDate && new Date(doc.expiryDate) <= thirtyDaysAhead;

                        return (
                            <div
                                key={doc.id}
                                className="p-5 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-white dark:bg-[#161a24] hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group"
                            >
                                <div className="space-y-3.5">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-3 min-w-0 flex-1">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                                                isExpired 
                                                    ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                    : isExpiringSoon
                                                    ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            )}>
                                                <FileCheck className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                    {doc.title}
                                                </h4>
                                                <span className="text-[10px] font-bold text-slate-400 block truncate mt-0.5">
                                                    {docTypeLabels[doc.documentType] || doc.documentType}
                                                </span>
                                            </div>
                                        </div>

                                        {!isReadOnly && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDoc(doc.id, doc.title)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors shrink-0"
                                                title="Delete Document"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Vehicle Tag */}
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-black/20 p-2 rounded-xl border border-slate-200/70 dark:border-white/5">
                                        <Car className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                        <span className="truncate">{doc.ambulance?.unit || "Municipal Ambulance"}</span>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                        {doc.documentNumber && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase text-slate-400">Doc / OR / CR #:</span>
                                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate">
                                                    {doc.documentNumber}
                                                </span>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase text-slate-400">Issuing Agency:</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {doc.issuingAgency || "LTO"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase text-slate-400">Expiration Date:</span>
                                            <span className={cn(
                                                "font-bold font-mono",
                                                isExpired ? "text-rose-600 font-black" : isExpiringSoon ? "text-amber-600 font-black" : "text-slate-800 dark:text-slate-200"
                                            )}>
                                                {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : "No Expiry / Lifetime"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="pt-2 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] font-black uppercase px-2 py-0.5",
                                            isExpired
                                                ? "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30"
                                                : isExpiringSoon
                                                ? "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30"
                                                : "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                                        )}>
                                            {isExpired ? "EXPIRED" : isExpiringSoon ? "EXPIRING SOON" : "VALID & ACTIVE"}
                                        </Badge>
                                        <span className="text-[10px] font-semibold text-slate-400">
                                            {doc.fileSize || "PDF"}
                                        </span>
                                    </div>
                                </div>

                                {/* Preview / Download Buttons */}
                                <div className="flex items-center gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setPreviewDoc(doc)}
                                        className="flex-1 h-8 text-[10px] font-black uppercase tracking-wider rounded-xl"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1" /> View Paper
                                    </Button>
                                    <a
                                        href={doc.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        download
                                        className="h-8 px-3 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors"
                                        title="Download File"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: UPLOAD VEHICLE PAPER */}
            {/* ========================================================================= */}
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <UploadCloud className="w-5 h-5" style={{ color: themeColor }} />
                            Digitize & File Vehicle Paper
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Upload Official Receipts (OR), Registration (CR), and vehicle certificates.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleUploadSubmit} className="space-y-4 py-2">
                        {/* Ambulance Selector */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Target Ambulance Unit <span className="text-red-500">*</span>
                            </Label>
                            <Select
                                value={uploadForm.ambulanceId}
                                onValueChange={(val) => setUploadForm({ ...uploadForm, ambulanceId: val })}
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                    <SelectValue placeholder="Select Target Ambulance Unit..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                    {fleet.map(v => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs font-bold">
                                            {v.unit} {v.plateNumber ? `(${v.plateNumber})` : ""} — {v.status || "STANDBY"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Document Type & Title */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Document Category <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={uploadForm.documentType}
                                    onValueChange={(val) => {
                                        setUploadForm({
                                            ...uploadForm,
                                            documentType: val,
                                            title: uploadForm.title || docTypeLabels[val] || ""
                                        });
                                    }}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                        <SelectValue placeholder="Select Document Category..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                        {Object.entries(docTypeLabels).map(([val, label]) => (
                                            <SelectItem key={val} value={val} className="text-xs font-bold">{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Document Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    value={uploadForm.title}
                                    onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                                    placeholder="e.g. 2026 LTO OR & CR Renewal"
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>
                        </div>

                        {/* Document Number & Issuing Agency */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Official Doc / OR / CR Number
                                </Label>
                                <Input
                                    value={uploadForm.documentNumber}
                                    onChange={(e) => setUploadForm({ ...uploadForm, documentNumber: e.target.value })}
                                    placeholder="e.g. OR# 88219-LTO"
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs font-mono uppercase"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Issuing Agency / Authority
                                </Label>
                                <Input
                                    value={uploadForm.issuingAgency}
                                    onChange={(e) => setUploadForm({ ...uploadForm, issuingAgency: e.target.value })}
                                    placeholder="e.g. Land Transportation Office (LTO)"
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Issue Date
                                </Label>
                                <Input
                                    type="date"
                                    value={uploadForm.issueDate}
                                    onChange={(e) => setUploadForm({ ...uploadForm, issueDate: e.target.value })}
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Expiration Date (For Expiry Alerts)
                                </Label>
                                <Input
                                    type="date"
                                    value={uploadForm.expiryDate}
                                    onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>
                        </div>

                        {/* File Attachment */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Document File (PDF, PNG, JPG) <span className="text-red-500">*</span>
                            </Label>
                            <input
                                required
                                type="file"
                                accept=".pdf,image/png,image/jpeg,image/webp"
                                onChange={(e) => setUploadFileObj(e.target.files?.[0] || null)}
                                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-slate-200 dark:file:bg-white/10 hover:file:bg-slate-300 cursor-pointer"
                            />
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsUploadModalOpen(false)}
                                className="rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isUploading}
                                className="rounded-xl font-black text-xs uppercase text-white"
                                style={{ backgroundColor: themeColor }}
                            >
                                {isUploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                File Document
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: DOCUMENT PREVIEW */}
            {/* ========================================================================= */}
            <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                <DialogContent className="sm:max-w-[720px] max-h-[90vh] rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6 flex flex-col">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="text-lg font-black uppercase text-slate-900 dark:text-white">
                                    {previewDoc?.title}
                                </DialogTitle>
                                <DialogDescription className="text-xs font-bold uppercase text-slate-400">
                                    {previewDoc?.ambulance?.unit} &bull; {docTypeLabels[previewDoc?.documentType] || previewDoc?.documentType}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Preview Window */}
                    <div className="flex-1 min-h-[400px] max-h-[500px] overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 flex items-center justify-center my-2">
                        {previewDoc?.fileType?.includes("pdf") || previewDoc?.fileUrl?.endsWith(".pdf") ? (
                            <iframe
                                src={previewDoc.fileUrl}
                                title={previewDoc.title}
                                className="w-full h-full min-h-[400px] rounded-2xl border-0"
                            />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={previewDoc?.fileUrl}
                                alt={previewDoc?.title}
                                className="max-w-full max-h-[450px] object-contain rounded-xl p-2"
                            />
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between pt-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                            {previewDoc?.documentNumber ? `Doc #: ${previewDoc.documentNumber}` : "Digitized Record"}
                        </span>
                        <div className="flex items-center gap-2">
                            <a
                                href={previewDoc?.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/10 hover:bg-slate-200 flex items-center gap-1.5"
                            >
                                <ExternalLink className="w-3.5 h-3.5" /> Open Tab
                            </a>
                            <Button
                                onClick={() => setPreviewDoc(null)}
                                className="rounded-xl font-bold text-xs"
                            >
                                Close
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
