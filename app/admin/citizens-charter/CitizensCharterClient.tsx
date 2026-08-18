"use client";

import React, { useState, useTransition } from "react";
import { 
    FileText, Plus, Search, Trash2, Edit, Save, Loader2, FileUp, ExternalLink,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
    createCitizenCharter, 
    updateCitizenCharter, 
    deleteCitizenCharter, 
    toggleCitizenCharterStatus 
} from "./actions";

interface CitizenCharter {
    id: string;
    officeName: string;
    fileUrl: string;
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export function CitizensCharterClient({ initialData = [] }: { initialData: CitizenCharter[] }) {
    const [charters, setCharters] = useState<CitizenCharter[]>(initialData);
    const [search, setSearch] = useState("");
    const [isPending, startTransition] = useTransition();

    // Modals state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedCharter, setSelectedCharter] = useState<CitizenCharter | null>(null);

    // Form inputs state
    const [officeName, setOfficeName] = useState("");
    const [file, setFile] = useState<File | null>(null);

    // Add submit handler
    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!officeName.trim()) {
            toast.error("Please provide an office name");
            return;
        }
        if (!file) {
            toast.error("Please upload a PDF or Image document");
            return;
        }

        const formData = new FormData();
        formData.append("officeName", officeName);
        formData.append("file", file);

        startTransition(async () => {
            const res = await createCitizenCharter(formData);
            if (res.success && res.data) {
                setCharters(prev => [...prev, res.data as CitizenCharter].sort((a, b) => a.officeName.localeCompare(b.officeName)));
                toast.success("Citizen's charter added successfully!");
                setIsAddOpen(false);
                resetForm();
            } else {
                toast.error(res.error || "Failed to add charter");
            }
        });
    };

    // Edit submit handler
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCharter) return;
        if (!officeName.trim()) {
            toast.error("Please provide an office name");
            return;
        }

        const formData = new FormData();
        formData.append("officeName", officeName);
        if (file) {
            formData.append("file", file);
        }

        startTransition(async () => {
            const res = await updateCitizenCharter(selectedCharter.id, formData);
            if (res.success && res.data) {
                setCharters(prev => prev.map(c => c.id === selectedCharter.id ? (res.data as CitizenCharter) : c).sort((a, b) => a.officeName.localeCompare(b.officeName)));
                toast.success("Citizen's charter updated successfully!");
                setIsEditOpen(false);
                resetForm();
            } else {
                toast.error(res.error || "Failed to update charter");
            }
        });
    };

    // Delete handler
    const handleDeleteSubmit = async () => {
        if (!selectedCharter) return;

        startTransition(async () => {
            const res = await deleteCitizenCharter(selectedCharter.id);
            if (res.success) {
                setCharters(prev => prev.filter(c => c.id !== selectedCharter.id));
                toast.success("Citizen's charter deleted successfully!");
                setIsDeleteOpen(false);
                setSelectedCharter(null);
            } else {
                toast.error(res.error || "Failed to delete charter");
            }
        });
    };

    // Toggle active status
    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        // Optimistic UI update
        setCharters(prev => prev.map(c => c.id === id ? { ...c, isActive: newStatus } : c));

        const res = await toggleCitizenCharterStatus(id, newStatus);
        if (res.success) {
            toast.success(`Charter ${newStatus ? "published" : "hidden"} successfully!`);
        } else {
            // Revert UI update
            setCharters(prev => prev.map(c => c.id === id ? { ...c, isActive: currentStatus } : c));
            toast.error(res.error || "Failed to update status");
        }
    };

    const resetForm = () => {
        setOfficeName("");
        setFile(null);
        setSelectedCharter(null);
    };

    const openEdit = (charter: CitizenCharter) => {
        setSelectedCharter(charter);
        setOfficeName(charter.officeName);
        setFile(null);
        setIsEditOpen(true);
    };

    const openDelete = (charter: CitizenCharter) => {
        setSelectedCharter(charter);
        setIsDeleteOpen(true);
    };

    const filtered = charters.filter(c => 
        c.officeName.toLowerCase().includes(search.toLowerCase())
    );

    const activeCount = charters.filter(c => c.isActive).length;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <FileText className="mr-3 w-10 h-10" style={{ color: 'var(--primary-theme)' }} />
                        Citizens Charter Management
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Upload and manage public transparency service guidelines and document procedures for municipal offices.
                    </p>
                </div>
                <Button 
                    onClick={() => { resetForm(); setIsAddOpen(true); }}
                    className="h-12 px-6 rounded-2xl bg-primary hover:opacity-90 text-white font-bold uppercase tracking-widest text-[10px] italic shadow-lg shadow-primary/20 flex items-center gap-2"
                    style={{ backgroundColor: 'var(--primary-theme)' }}
                >
                    <Plus className="w-4 h-4" /> Add Office Charter
                </Button>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: "Total Departments", value: charters.length, color: "text-blue-500 bg-blue-500/10" },
                    { label: "Active Charters", value: activeCount, color: "text-emerald-500 bg-emerald-500/10" },
                    { label: "Hidden / Drafts", value: charters.length - activeCount, color: "text-amber-500 bg-amber-500/10" }
                ].map((c, i) => (
                    <div key={i} className="p-6 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl flex items-center justify-between shadow-sm">
                        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{c.label}</span>
                        <span className={`px-4 py-2 rounded-2xl font-black text-xl ${c.color}`}>{c.value}</span>
                    </div>
                ))}
            </div>

            {/* Filter and Table Container */}
            <div 
                style={{ boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--primary-theme) 10%, transparent)' }}
                className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden ring-1 ring-slate-200 dark:ring-white/5"
            >
                {/* Filters */}
                <div className="p-5 md:p-6 border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121624]/30 flex items-center">
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search by office name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-11 h-11 border-slate-200 dark:border-[#2a3040] rounded-xl dark:bg-slate-900/50 text-xs font-bold italic"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-[#121624]/30 border-b border-slate-200 dark:border-[#2a3040]">
                            <TableRow>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Office Name</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Document Link</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length > 0 ? (
                                filtered.map((charter) => (
                                    <TableRow key={charter.id} className="border-b border-slate-200 dark:border-[#2a3040] hover:bg-slate-50/40 dark:hover:bg-slate-900/10">
                                        <TableCell className="font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                            {charter.officeName}
                                        </TableCell>
                                        <TableCell>
                                            <a 
                                                href={charter.fileUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline italic"
                                                style={{ color: 'var(--primary-theme)' }}
                                            >
                                                View Document <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Switch 
                                                    checked={charter.isActive}
                                                    onCheckedChange={() => handleToggleStatus(charter.id, charter.isActive)}
                                                />
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${charter.isActive ? "text-emerald-500" : "text-slate-400"}`}>
                                                    {charter.isActive ? "Active" : "Hidden"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button 
                                                    variant="outline" 
                                                    size="icon"
                                                    onClick={() => openEdit(charter)}
                                                    className="w-9 h-9 border-slate-200 dark:border-[#2a3040] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                                                >
                                                    <Edit className="w-4 h-4 text-slate-500" />
                                                </Button>
                                                <Button 
                                                    variant="outline" 
                                                    size="icon"
                                                    onClick={() => openDelete(charter)}
                                                    className="w-9 h-9 border-slate-200 dark:border-[#2a3040] rounded-xl hover:bg-red-500/10 hover:border-red-500/30"
                                                >
                                                    <Trash2 className="w-4 h-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center text-slate-500 italic">
                                        No citizen charters uploaded. Click &quot;Add Office Charter&quot; to begin.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Modal: Add Charter */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-[#151b2b] rounded-[2rem] border-slate-200 dark:border-[#2a3040] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" style={{ color: 'var(--primary-theme)' }} />
                            Add Department Charter
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Upload the Citizens Charter document (PDF or image) for a municipal office.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddSubmit} className="space-y-6 pt-2">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Office Name</label>
                            <Input 
                                placeholder="e.g. Civil Registrar, BPLO, Treasury"
                                value={officeName}
                                onChange={(e) => setOfficeName(e.target.value)}
                                className="h-12 border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Upload Document (PDF/Image)</label>
                            <div className="border border-dashed border-slate-200 dark:border-[#2a3040] rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/20 cursor-pointer relative group transition-colors">
                                <input 
                                    type="file" 
                                    accept=".pdf,image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFile(e.target.files[0]);
                                        }
                                    }}
                                />
                                <div className="space-y-2 flex flex-col items-center">
                                    <FileUp className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" style={{ color: file ? 'var(--primary-theme)' : undefined }} />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {file ? file.name : "Select or drag file here"}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-500">
                                        Supports PDF, PNG, JPG, or WEBP up to 50MB
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsAddOpen(false)}
                                className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-[10px] italic border-slate-200 dark:border-[#2a3040]"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isPending}
                                className="h-12 px-6 rounded-2xl text-white font-bold uppercase tracking-widest text-[10px] italic flex items-center gap-2"
                                style={{ backgroundColor: 'var(--primary-theme)' }}
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Charter
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Edit Charter */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md bg-white dark:bg-[#151b2b] rounded-[2rem] border-slate-200 dark:border-[#2a3040] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tight flex items-center gap-2">
                            <Edit className="w-5 h-5 text-primary" style={{ color: 'var(--primary-theme)' }} />
                            Edit Department Charter
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Update the office name or replace the uploaded document.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditSubmit} className="space-y-6 pt-2">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Office Name</label>
                            <Input 
                                placeholder="e.g. Civil Registrar, BPLO, Treasury"
                                value={officeName}
                                onChange={(e) => setOfficeName(e.target.value)}
                                className="h-12 border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic ml-1">Replace Document (Optional)</label>
                            <div className="border border-dashed border-slate-200 dark:border-[#2a3040] rounded-2xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-900/20 cursor-pointer relative group transition-colors">
                                <input 
                                    type="file" 
                                    accept=".pdf,image/*" 
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFile(e.target.files[0]);
                                        }
                                    }}
                                />
                                <div className="space-y-2 flex flex-col items-center">
                                    <FileUp className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors" style={{ color: file ? 'var(--primary-theme)' : undefined }} />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {file ? file.name : "Choose file to replace the current document"}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-500">
                                        Leave empty to keep the existing document
                                    </span>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setIsEditOpen(false)}
                                className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-[10px] italic border-slate-200 dark:border-[#2a3040]"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isPending}
                                className="h-12 px-6 rounded-2xl text-white font-bold uppercase tracking-widest text-[10px] italic flex items-center gap-2"
                                style={{ backgroundColor: 'var(--primary-theme)' }}
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Update Charter
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Confirm Delete */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="max-w-sm bg-white dark:bg-[#151b2b] rounded-[2rem] border-slate-200 dark:border-[#2a3040] shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tight text-red-500 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Delete Charter?
                        </DialogTitle>
                        <DialogDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            This will permanently delete the charter for <strong>{selectedCharter?.officeName}</strong> and remove its file from storage. This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 sm:justify-end mt-4">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => setIsDeleteOpen(false)}
                            className="h-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-[10px] italic border-slate-200 dark:border-[#2a3040]"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleDeleteSubmit}
                            disabled={isPending}
                            className="h-12 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[10px] italic flex items-center gap-2"
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
