"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Loader2, Scale, AlertCircle, Tag, Plus } from "lucide-react";
import { createLegislativeDocument, updateLegislativeDocument, getAllCategoryTags } from "../actions";
import { toast } from "sonner";

interface LegislativeDocument {
    id: string;
    type: string;
    referenceNumber: string;
    title: string;
    description: string;
    tags: string[];
    dateApproved: Date | string;
    status: string;
    pdfUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface AddOrdinanceModalProps {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    editingData: LegislativeDocument | null;
    onSuccess: () => void;
}

export function AddOrdinanceModal({
    isOpen,
    setIsOpen,
    editingData,
    onSuccess
}: AddOrdinanceModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const tagsInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);

    // Form states
    const [type, setType] = useState<string>("ORDINANCE");
    const [referenceNumber, setReferenceNumber] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState("");
    const [dateApproved, setDateApproved] = useState("");
    const [status, setStatus] = useState("ACTIVE / ENFORCED");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Category tags suggestion states
    const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Fetch existing category tags when modal opens
    useEffect(() => {
        if (isOpen) {
            getAllCategoryTags().then(tagsList => {
                setAllExistingTags(tagsList);
            }).catch(() => {});
        }
    }, [isOpen]);

    // Close suggestions on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                suggestionsRef.current && 
                !suggestionsRef.current.contains(e.target as Node) &&
                tagsInputRef.current &&
                !tagsInputRef.current.contains(e.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Current word being typed (after last comma)
    const currentTagQuery = React.useMemo(() => {
        const parts = tags.split(",");
        return parts[parts.length - 1].trim();
    }, [tags]);

    // Current list of already selected tags
    const currentSelectedTags = React.useMemo(() => {
        return tags
            .split(",")
            .map(t => t.trim().toUpperCase())
            .filter(Boolean);
    }, [tags]);

    // Filter matching existing suggestions
    const matchingSuggestions = React.useMemo(() => {
        if (!currentTagQuery) return [];
        const q = currentTagQuery.toUpperCase();
        return allExistingTags.filter(
            t => t.toUpperCase().includes(q) && !currentSelectedTags.includes(t.toUpperCase())
        );
    }, [currentTagQuery, allExistingTags, currentSelectedTags]);

    // Select suggestion to complete the current tag
    const handleSelectSuggestion = (suggestedTag: string) => {
        const parts = tags.split(",").map(t => t.trim()).filter(Boolean);
        // Replace last element with the suggested tag
        if (parts.length > 0) {
            parts[parts.length - 1] = suggestedTag.toUpperCase();
        } else {
            parts.push(suggestedTag.toUpperCase());
        }
        // Join with comma and space, add trailing comma for next tag
        setTags(parts.join(", ") + ", ");
        setShowSuggestions(false);
        tagsInputRef.current?.focus();
    };

    useEffect(() => {
        if (isOpen) {
            setErrorMsg("");
            setSelectedFile(null);
            setShowSuggestions(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            if (editingData) {
                setType(editingData.type);
                setReferenceNumber(editingData.referenceNumber);
                setTitle(editingData.title);
                setDescription(editingData.description);
                setTags(editingData.tags.join(", "));
                setStatus(editingData.status);

                // Format approved date to YYYY-MM-DD for date input
                const dateObj = new Date(editingData.dateApproved);
                const formattedDate = dateObj.toISOString().split("T")[0];
                setDateApproved(formattedDate);
            } else {
                setType("ORDINANCE");
                setReferenceNumber("");
                setTitle("");
                setDescription("");
                setTags("");
                setDateApproved("");
                setStatus("ACTIVE / ENFORCED");
            }
        }
    }, [isOpen, editingData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");
        setIsSaving(true);

        try {
            const formData = new FormData();
            formData.append("type", type);
            formData.append("referenceNumber", referenceNumber);
            formData.append("title", title);
            formData.append("description", description);
            formData.append("tags", tags);
            formData.append("dateApproved", dateApproved);
            formData.append("status", status);

            if (selectedFile) {
                formData.append("file", selectedFile);
            }

            let res;
            if (editingData) {
                res = await updateLegislativeDocument(editingData.id, formData);
            } else {
                res = await createLegislativeDocument(formData);
            }

            if (res.success) {
                toast.success(editingData ? "Document updated successfully!" : "Document added successfully!");
                onSuccess();
            } else {
                setErrorMsg(res.error || "Failed to save document. Please check the inputs.");
            }
        } catch (err: any) {
            console.error("Error saving document:", err);
            setErrorMsg(err.message || "An unexpected error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!isSaving) {
                setIsOpen(open);
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-3xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-[2rem]">
                <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <DialogHeader
                        className="p-6 pb-4 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-center justify-between bg-slate-50/50 dark:bg-[#1a1f2e]/10"
                    >
                        <div className="flex items-center space-x-3">
                            <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                                style={{ backgroundColor: "var(--primary-theme, #2563eb)" }}
                            >
                                <Scale className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                    {editingData ? "Edit Legislative Document" : "Add Legislative Document"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                                    Enter reference details, description, approved date, and attach document.
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={isSaving}
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </DialogHeader>

                    {/* Form Fields */}
                    <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                        {errorMsg && (
                            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Document Type */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Document Type <span className="text-red-500">*</span></Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-250 dark:border-[#2a3040]">
                                        <SelectItem value="ORDINANCE">Ordinance (Municipal Law)</SelectItem>
                                        <SelectItem value="RESOLUTION">Resolution (Official Commendation/Auth)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Reference Number */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reference Number <span className="text-red-500">*</span></Label>
                                <Input
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                    placeholder="e.g. Municipal Ordinance No. 2026-003"
                                    required
                                    className="h-11 bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                                />
                            </div>
                        </div>

                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Title <span className="text-red-500">*</span></Label>
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Sustainable Practices & Single-Use Plastic Reduction Ordinance of 2026"
                                required
                                className="h-11 bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold italic"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Brief / Description <span className="text-red-500">*</span></Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Write a summary or brief of what this ordinance or resolution enforces..."
                                required
                                rows={3}
                                className="bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium leading-relaxed"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Date Approved */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date Approved <span className="text-red-500">*</span></Label>
                                <Input
                                    type="date"
                                    value={dateApproved}
                                    onChange={(e) => setDateApproved(e.target.value)}
                                    required
                                    className="h-11 bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                                />
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status Badge <span className="text-red-500">*</span></Label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-250 dark:border-[#2a3040]">
                                        <SelectItem value="ACTIVE / ENFORCED">ACTIVE / ENFORCED</SelectItem>
                                        <SelectItem value="ADOPTED / IMPLEMENTATION PENDING">ADOPTED / IMPLEMENTATION PENDING</SelectItem>
                                        <SelectItem value="ADOPTED / CEREMONIAL">ADOPTED / CEREMONIAL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Category Tags with Live Autocomplete */}
                            <div className="space-y-1.5 relative">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                        Category Tags (comma-separated)
                                    </Label>
                                    {allExistingTags.length > 0 && (
                                        <span 
                                            className="text-[9px] font-bold"
                                            style={{ color: "var(--primary-theme, #2563eb)" }}
                                        >
                                            {allExistingTags.length} existing categories
                                        </span>
                                    )}
                                </div>
                                <div className="relative">
                                    <Input
                                        ref={tagsInputRef}
                                        value={tags}
                                        onChange={(e) => {
                                            setTags(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        placeholder="e.g. AGRICULTURE, ENVIRONMENT, HEALTH"
                                        className="h-11 bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold"
                                    />
                                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>

                                {/* Live Autocomplete Dropdown Popup - Pops upwards (bottom-full) to prevent bottom modal clipping */}
                                {showSuggestions && currentTagQuery.length > 0 && matchingSuggestions.length > 0 && (
                                    <div
                                        ref={suggestionsRef}
                                        className="absolute left-0 right-0 bottom-full mb-1.5 z-50 bg-white dark:bg-[#121724] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl overflow-hidden p-2 max-h-52 overflow-y-auto space-y-1 backdrop-blur-xl"
                                        style={{
                                            boxShadow: "0 -10px 30px -5px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)"
                                        }}
                                    >
                                        <div className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                            <span>Matching Categories</span>
                                            <span 
                                                className="font-bold"
                                                style={{ color: "var(--primary-theme, #2563eb)" }}
                                            >
                                                Click to apply
                                            </span>
                                        </div>
                                        {matchingSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                type="button"
                                                onClick={() => handleSelectSuggestion(suggestion)}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Tag 
                                                        className="w-3 h-3 shrink-0" 
                                                        style={{ color: "var(--primary-theme, #2563eb)" }}
                                                    />
                                                    <span>{suggestion}</span>
                                                </div>
                                                <span 
                                                    className="text-[9px] uppercase font-black opacity-0 group-hover:opacity-100 flex items-center gap-1"
                                                    style={{ color: "var(--primary-theme, #2563eb)" }}
                                                >
                                                    Apply <Plus className="w-3 h-3" />
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Document File Upload */}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Document File (PDF / Image) {!editingData && <span className="text-red-500">*</span>}
                                </Label>
                                <div className="relative">
                                    <Input
                                        type="file"
                                        accept="application/pdf,image/*"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                        required={!editingData}
                                        className="h-11 bg-slate-50/50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold file:hidden cursor-pointer pl-10 pr-4 flex items-center"
                                    />
                                    <Upload className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    {selectedFile && (
                                        <div 
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded-lg max-w-[120px] truncate pointer-events-none"
                                            style={{
                                                backgroundColor: "var(--primary-theme, #2563eb)15",
                                                color: "var(--primary-theme, #2563eb)"
                                            }}
                                        >
                                            {selectedFile.name}
                                        </div>
                                    )}
                                    {editingData?.pdfUrl && !selectedFile && (
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg max-w-[120px] truncate pointer-events-none">
                                            Keep current file
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <DialogFooter className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-[#1a1f2e]/10">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={isSaving}
                            onClick={() => setIsOpen(false)}
                            className="h-11 px-5 border border-slate-200 dark:border-[#2a3040] text-slate-700 hover:bg-slate-100 dark:hover:bg-white/5 font-black uppercase tracking-wider text-[10px] rounded-xl transition-all"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="h-11 px-6 text-white font-black uppercase tracking-wider text-[10px] rounded-xl shadow-lg flex items-center gap-2 active:scale-95 transition-all"
                            style={{
                                backgroundColor: "var(--primary-theme, #2563eb)",
                                boxShadow: "0 10px 25px -5px var(--primary-theme, #2563eb)40"
                            }}
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                                </>
                            ) : (
                                "Save Document"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
