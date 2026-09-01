"use client";

import { useJobs } from "../providers/JobsProvider";
import { useJobsForm } from "../hooks/useJobsForm";
import { useState, useEffect, type CSSProperties } from "react";
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
import { Loader2, Briefcase, GraduationCap, Building2, Calendar, Globe, Plus, Trash2, X } from "lucide-react";

export function AddJobModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay, themeColor } = useJobs();
    const { handleSubmit, loading } = useJobsForm();
    const [links, setLinks] = useState<{ label: string; url: string }[]>([]);

    const employmentTypes = ["Permanent", "Contractual", "Casual", "Job Order", "Part-Time"];

    useEffect(() => {
        if (isAddModalOpen) {
            setTimeout(() => {
                if (editingData?.links) {
                    // Handle both array and old object format
                    if (Array.isArray(editingData.links)) {
                        setLinks([...editingData.links]);
                    } else {
                        // Convert old fixed object to dynamic array
                        const converted = [];
                        if (editingData.links.website) converted.push({ label: "Website", url: editingData.links.website });
                        if (editingData.links.facebook) converted.push({ label: "Facebook", url: editingData.links.facebook });
                        if (editingData.links.instagram) converted.push({ label: "Instagram", url: editingData.links.instagram });
                        if (editingData.links.mapUrl) converted.push({ label: "Map URL", url: editingData.links.mapUrl });
                        setLinks(converted);
                    }
                } else {
                    setLinks([]);
                }
            }, 0);
        }
    }, [isAddModalOpen, editingData]);

    const addLink = () => {
        setLinks([...links, { label: "", url: "" }]);
    };

    const removeLink = (index: number) => {
        setLinks(links.filter((_, i) => i !== index));
    };

    const updateLink = (index: number, field: "label" | "url", value: string) => {
        const newLinks = [...links];
        newLinks[index][field] = value;
        setLinks(newLinks);
    };

    const formatDateForInput = (dateValue: Date | string | null | undefined) => {
        if (!dateValue) return "";
        const date = new Date(dateValue);
        if (isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 16);
    };

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                setEditingData(null);
                setLinks([]);
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-5xl p-0 overflow-hidden bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-[2.5rem]">
                <div className="flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                    <DialogHeader
                        className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] relative flex-row items-center justify-between overflow-hidden"
                        style={{ backgroundColor: `${themeColor}14` }}
                    >
                        <div className="flex items-center space-x-3">
                            <div 
                                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0" 
                                style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}
                            >
                                <Briefcase className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                                    {editingData ? "Edit Job Posting" : "Post New Job"}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium italic text-sm">
                                    Create an open application for a position in the municipal government.
                                </DialogDescription>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setIsAddModalOpen(false);
                                setEditingData(null);
                                setLinks([]);
                            }}
                            className="p-2.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer shrink-0 z-10"
                            title="Close modal"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </DialogHeader>

                    <div className="p-10 overflow-y-auto custom-scrollbar">
                        <form id="jobForm" onSubmit={handleSubmit} className="space-y-8">
                            <input type="hidden" name="linksJson" value={JSON.stringify(links)} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Left Column: Basic Details */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2" style={{ color: themeColor }}>
                                        <Building2 className="w-4 h-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Position Details</h3>
                                    </div>
                                    {(currentBarangay || editingData?.barangay) && (
                                        <input 
                                            type="hidden" 
                                            name="barangay" 
                                            value={editingData?.barangay || currentBarangay || ""} 
                                        />
                                    )}
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job Title</Label>
                                        <Input
                                            name="title"
                                            required
                                            defaultValue={editingData?.title}
                                            placeholder="e.g. Municipal Engineer"
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic focus:ring-2"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 min-w-0">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Office / Department</Label>
                                            <Input
                                                name="department"
                                                required
                                                defaultValue={editingData?.department}
                                                placeholder="e.g. Mayor's Office"
                                                className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                                            />
                                        </div>
                                        <div className="space-y-2 min-w-0">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Employment Type</Label>
                                            <Select name="employmentType" defaultValue={editingData?.employmentType || "Permanent"}>
                                                <SelectTrigger
                                                    className="!w-full !h-14 min-h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-black uppercase tracking-widest text-[9px] focus:ring-2"
                                                    style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent position="popper" className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                                    {employmentTypes.map(type => (
                                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Salary</Label>
                                        <Input
                                            name="salary"
                                            defaultValue={editingData?.salary || ""}
                                            placeholder="Optional"
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location</Label>
                                        <Input
                                            name="location"
                                            defaultValue={editingData?.location || ""}
                                            placeholder="Optional"
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Embed Map URL</Label>
                                        <Input
                                            name="mapUrl"
                                            defaultValue={editingData?.mapUrl || ""}
                                            placeholder="https://www.google.com/maps/embed?pb=..."
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold italic"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" /> Deadline
                                        </Label>
                                        <Input
                                            type="datetime-local"
                                            name="deadline"
                                            defaultValue={formatDateForInput(editingData?.deadline)}
                                            className="h-14 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-xl font-bold"
                                        />
                                    </div>
                                </div>

                                {/* Right Column: Description & Qualifications */}
                                <div className="space-y-6">
                                    <div className="flex items-center space-x-2" style={{ color: themeColor }}>
                                        <GraduationCap className="w-4 h-4" />
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Requirements</h3>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Job Description</Label>
                                        <Textarea
                                            name="description"
                                            required
                                            defaultValue={editingData?.description}
                                            placeholder="e.g. Responsible for inspecting infrastructure and managing municipal construction projects..."
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = "auto";
                                                target.style.height = `${target.scrollHeight}px`;
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.height = "auto";
                                                    el.style.height = `${Math.max(el.scrollHeight, 100)}px`;
                                                }
                                            }}
                                            className="min-h-[100px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-2xl p-5 font-medium italic resize-none overflow-hidden transition-all"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Qualifications</Label>
                                        <Textarea
                                            name="qualifications"
                                            required
                                            defaultValue={editingData?.qualifications}
                                            placeholder="e.g. Bachelor's Degree in Civil Engineering, Licensed Engineer (RA 1080)..."
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = "auto";
                                                target.style.height = `${target.scrollHeight}px`;
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.height = "auto";
                                                    el.style.height = `${Math.max(el.scrollHeight, 100)}px`;
                                                }
                                            }}
                                            className="min-h-[100px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-2xl p-5 font-medium italic resize-none overflow-hidden transition-all"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Requirements</Label>
                                        <Textarea
                                            name="requirements"
                                            required
                                            defaultValue={editingData?.requirements}
                                            placeholder="e.g. Resume, PDS with Work Experience Sheet, Transcript of Records (TOR)..."
                                            onInput={(e) => {
                                                const target = e.target as HTMLTextAreaElement;
                                                target.style.height = "auto";
                                                target.style.height = `${target.scrollHeight}px`;
                                            }}
                                            ref={(el) => {
                                                if (el) {
                                                    el.style.height = "auto";
                                                    el.style.height = `${Math.max(el.scrollHeight, 80)}px`;
                                                }
                                            }}
                                            className="min-h-[80px] bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 rounded-2xl p-5 font-medium italic resize-none overflow-hidden transition-all"
                                            style={{ "--tw-ring-color": `${themeColor}40` } as CSSProperties}
                                        />
                                    </div>

                                    {/* Links Section moved inside scrollable form */}
                                    <div className="pt-4 border-t border-slate-200 dark:border-[#2a3040]">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2" style={{ color: themeColor }}>
                                                <Globe className="w-4 h-4" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">External Links</h3>
                                            </div>
                                            <Button 
                                                type="button" 
                                                onClick={addLink}
                                                variant="outline"
                                                className="h-9 px-4 font-bold rounded-xl flex items-center gap-2"
                                                style={{ borderColor: `${themeColor}40`, color: themeColor }}
                                            >
                                                <Plus className="w-4 h-4" /> Add Link
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3">
                                            {links.length === 0 ? (
                                                <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-center">
                                                    <p className="text-slate-400 text-sm font-medium">No links added. Add maps, facebook, or websites.</p>
                                                </div>
                                            ) : (
                                                links.map((link, index) => (
                                                    <div key={index} className="flex gap-4 items-end animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <div className="flex-1 grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-[#1a1f2e] rounded-xl border border-slate-200 dark:border-[#2a3040]">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Label</Label>
                                                                <Input
                                                                    value={link.label}
                                                                    onChange={(e) => updateLink(index, "label", e.target.value)}
                                                                    placeholder="e.g. Facebook"
                                                                    className="h-10 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040]"
                                                                />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">URL</Label>
                                                                <Input
                                                                    value={link.url}
                                                                    onChange={(e) => updateLink(index, "url", e.target.value)}
                                                                    placeholder="https://..."
                                                                    className="h-10 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040]"
                                                                />
                                                            </div>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => removeLink(index)}
                                                            className="h-10 w-10 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 mb-4"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="p-6 pt-0 bg-white dark:bg-[#0f1117] border-none shrink-0">
                        <Button
                            type="submit"
                            form="jobForm"
                            disabled={loading}
                            className="w-full h-12 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            style={{ backgroundColor: themeColor, boxShadow: `0 14px 28px -14px ${themeColor}` }}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                            ) : (
                                editingData ? "Apply Changes" : "Post Job"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}