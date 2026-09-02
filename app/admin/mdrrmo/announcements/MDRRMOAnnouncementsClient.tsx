"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
    Megaphone, 
    Trash2, 
    Plus, 
    Pencil, 
    Pin, 
    Calendar, 
    Search, 
    ArrowLeft, 
    Loader2, 
    CheckCircle2 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import { saveMDRRMOAnnouncement, deleteMDRRMOAnnouncement } from "../actions";

interface MDRRMOAnnouncementsClientProps {
    initialAnnouncements: any[];
    totalCount?: number;
    currentPage?: number;
    pageSize?: number;
    initialSearch?: string;
    initialPriority?: string;
    barangays?: string[];
    isReadOnly?: boolean;
}

export default function MDRRMOAnnouncementsClient({
    initialAnnouncements = [],
    initialSearch = "",
    initialPriority = "All",
    barangays = [],
    isReadOnly = false
}: MDRRMOAnnouncementsClientProps) {
    let themeColor = "#ea580c";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {}

    const [announcements, setAnnouncements] = useState<any[]>(initialAnnouncements);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [priorityFilter, setPriorityFilter] = useState(initialPriority);

    // Modal State
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [announcementForm, setAnnouncementForm] = useState({
        title: "",
        content: "",
        priority: "Normal",
        category: "MDRRMO",
        isPinned: false,
        isActive: true,
        barangay: "ALL",
        eventDate: "",
        eventSchedule: ""
    });

    const getPriorityBadge = (priority: string) => {
        switch (priority?.toUpperCase()) {
            case "CRITICAL":
                return { label: "CRITICAL ALERT", className: "text-rose-700 dark:text-rose-400 bg-rose-500/15 border-rose-500/40 animate-pulse" };
            case "URGENT":
                return { label: "URGENT", className: "text-amber-700 dark:text-amber-400 bg-amber-500/15 border-amber-500/40" };
            case "HIGH":
                return { label: "HIGH", className: "text-purple-700 dark:text-purple-400 bg-purple-500/15 border-purple-500/40" };
            case "NORMAL":
            default:
                return { label: "NORMAL", className: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20" };
        }
    };

    const handleOpenAdd = () => {
        setEditingAnnouncement(null);
        setSelectedImageFile(null);
        setImagePreview(null);
        setAnnouncementForm({
            title: "",
            content: "",
            priority: "High",
            category: "MDRRMO",
            isPinned: true,
            isActive: true,
            barangay: "ALL",
            eventDate: "",
            eventSchedule: ""
        });
        setIsAnnouncementModalOpen(true);
    };

    const handleOpenEdit = (ann: any) => {
        setEditingAnnouncement(ann);
        setSelectedImageFile(null);
        setImagePreview(ann.imageUrl || null);
        setAnnouncementForm({
            title: ann.title || "",
            content: ann.content || "",
            priority: ann.priority || "Normal",
            category: ann.category || "MDRRMO",
            isPinned: ann.isPinned ?? false,
            isActive: ann.isActive ?? true,
            barangay: ann.barangay || "ALL",
            eventDate: ann.eventDate ? new Date(ann.eventDate).toISOString().split("T")[0] : "",
            eventSchedule: ann.eventSchedule || ""
        });
        setIsAnnouncementModalOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
            toast.error("Please enter both title and announcement advisory content.");
            return;
        }

        setIsSaving(true);
        try {
            const formData = new FormData();
            if (editingAnnouncement?.id) formData.append("id", editingAnnouncement.id);
            formData.append("title", announcementForm.title);
            formData.append("content", announcementForm.content);
            formData.append("priority", announcementForm.priority);
            formData.append("category", announcementForm.category);
            formData.append("isPinned", String(announcementForm.isPinned));
            formData.append("isActive", String(announcementForm.isActive));
            if (announcementForm.barangay && announcementForm.barangay !== "ALL") {
                formData.append("barangay", announcementForm.barangay);
            }
            if (announcementForm.eventDate) formData.append("eventDate", announcementForm.eventDate);
            if (announcementForm.eventSchedule) formData.append("eventSchedule", announcementForm.eventSchedule);
            if (selectedImageFile) formData.append("imageFile", selectedImageFile);

            const res = await saveMDRRMOAnnouncement(formData);
            if (res.success && res.announcement) {
                if (editingAnnouncement) {
                    setAnnouncements(prev => prev.map(a => a.id === res.announcement.id ? res.announcement : a));
                    toast.success("MDRRMO advisory updated!");
                } else {
                    setAnnouncements(prev => [res.announcement, ...prev]);
                    toast.success("New MDRRMO advisory broadcasted!");
                }
                setIsAnnouncementModalOpen(false);
            } else {
                toast.error(res.error || "Failed to save announcement");
            }
        } catch {
            toast.error("Error saving announcement");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to remove advisory "${title}"?`)) return;

        try {
            const res = await deleteMDRRMOAnnouncement(id);
            if (res.success) {
                setAnnouncements(prev => prev.filter(a => a.id !== id));
                toast.success("Advisory removed.");
            } else {
                toast.error(res.error || "Failed to delete advisory");
            }
        } catch {
            toast.error("Error deleting advisory");
        }
    };

    // Filtered
    const filteredAnnouncements = announcements.filter(a => {
        const matchesPriority = priorityFilter === "All" || a.priority?.toUpperCase() === priorityFilter.toUpperCase();
        const matchesQuery = 
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.category || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchesPriority && matchesQuery;
    });

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
                        <Megaphone className="w-7 h-7 shrink-0" style={{ color: themeColor }} />
                        MDRRMO Emergency Announcements & Advisories
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-2xl">
                        Publish official disaster alerts, typhoon bulletins, flood warnings, ambulance fleet dispatch notices, and road safety advisories directly to the municipality portal.
                    </p>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-3 relative z-10">
                        <Button
                            onClick={handleOpenAdd}
                            className="h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColor,
                                boxShadow: `0 8px 20px -4px ${themeColor}50`
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Post Emergency Advisory
                        </Button>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#161a24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    {["All", "Critical", "Urgent", "High", "Normal"].map((p) => {
                        const isSelected = priorityFilter.toUpperCase() === p.toUpperCase();
                        let activeInactiveClass = "";
                        let customStyle: React.CSSProperties | undefined = undefined;

                        switch (p.toUpperCase()) {
                            case "ALL":
                                if (isSelected) {
                                    activeInactiveClass = "text-white shadow-md font-black";
                                    customStyle = {
                                        backgroundColor: themeColor || "#2563eb",
                                        boxShadow: `0 4px 12px -2px ${themeColor || "#2563eb"}60`
                                    };
                                } else {
                                    activeInactiveClass = "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 border border-transparent";
                                }
                                break;
                            case "CRITICAL":
                                activeInactiveClass = isSelected
                                    ? "bg-rose-600 text-white border border-rose-600 shadow-md shadow-rose-600/30"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20";
                                break;
                            case "URGENT":
                                activeInactiveClass = isSelected
                                    ? "bg-amber-500 text-white border border-amber-500 shadow-md shadow-amber-500/30"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20";
                                break;
                            case "HIGH":
                                activeInactiveClass = isSelected
                                    ? "bg-purple-600 text-white border border-purple-600 shadow-md shadow-purple-600/30"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 hover:bg-purple-500/20";
                                break;
                            case "NORMAL":
                                activeInactiveClass = isSelected
                                    ? "bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 border border-slate-700 dark:border-slate-200 shadow-md"
                                    : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 hover:bg-slate-500/20";
                                break;
                        }

                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPriorityFilter(p)}
                                className={cn(
                                    "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                    activeInactiveClass
                                )}
                                style={customStyle}
                            >
                                {p}
                            </button>
                        );
                    })}
                </div>

                <div className="relative min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search advisories..."
                        className="h-10 pl-9 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold"
                    />
                </div>
            </div>

            {/* Announcements Grid */}
            {filteredAnnouncements.length === 0 ? (
                <Card className="rounded-[1.75rem] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] p-12 text-center text-slate-400 space-y-3">
                    <Megaphone className="w-12 h-12 mx-auto opacity-30" />
                    <h3 className="text-sm font-black uppercase tracking-wider">No advisories found</h3>
                    <p className="text-xs font-semibold max-w-sm mx-auto">
                        Broadcast emergency updates, storm warnings, or fleet schedules to citizens.
                    </p>
                    {!isReadOnly && (
                        <Button onClick={handleOpenAdd} variant="outline" className="rounded-xl font-bold text-xs uppercase">
                            + Broadcast First Advisory
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredAnnouncements.map((ann) => {
                        const priorityBadge = getPriorityBadge(ann.priority);

                        return (
                            <Card
                                key={ann.id}
                                className={cn(
                                    "rounded-2xl border bg-white dark:bg-[#161a24] hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group",
                                    ann.priority === "Critical" ? "border-rose-500/50 shadow-rose-500/5" : "border-slate-200/90 dark:border-[#2a3040]"
                                )}
                            >
                                {ann.imageUrl && (
                                    <div className="h-40 w-full overflow-hidden bg-slate-100 dark:bg-black/30 relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img 
                                            src={ann.imageUrl} 
                                            alt={ann.title} 
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                        />
                                        {ann.isPinned && (
                                            <div className="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
                                                <Pin className="w-3 h-3" /> Pinned
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2 py-0.5", priorityBadge.className)}>
                                                {priorityBadge.label}
                                            </Badge>

                                            {!ann.imageUrl && ann.isPinned && (
                                                <span className="text-amber-500 flex items-center gap-1 text-[10px] font-black uppercase">
                                                    <Pin className="w-3 h-3" /> Pinned
                                                </span>
                                            )}

                                            {!isReadOnly && (
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(ann)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(ann.id, ann.title)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white line-clamp-2">
                                            {ann.title}
                                        </h4>

                                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 line-clamp-3">
                                            {ann.content}
                                        </p>
                                    </div>

                                    <div className="pt-3 border-t border-slate-200/70 dark:border-white/5 space-y-1.5 text-[10px] font-bold text-slate-400">
                                        {ann.eventDate && (
                                            <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                                                <Calendar className="w-3 h-3" />
                                                <span>Event: {new Date(ann.eventDate).toLocaleDateString()} {ann.eventSchedule ? `(${ann.eventSchedule})` : ""}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span>Target: {ann.barangay || "All Barangays"}</span>
                                            <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: POST / EDIT ADVISORY */}
            {/* ========================================================================= */}
            <Dialog open={isAnnouncementModalOpen} onOpenChange={setIsAnnouncementModalOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <Megaphone className="w-5 h-5" style={{ color: themeColor }} />
                            {editingAnnouncement ? "Edit MDRRMO Advisory" : "Broadcast MDRRMO Advisory"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Publish real-time disaster alerts, weather advisories, and emergency dispatch notices.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveSubmit} className="space-y-4 py-2">
                        {/* Title */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Advisory Headline <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={announcementForm.title}
                                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                                placeholder="e.g. [TYPHOON ALERT] Severe Weather Warning & Emergency Response Standby"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        {/* Priority & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Alert Urgency Level <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={announcementForm.priority}
                                    onValueChange={(val) => setAnnouncementForm({ ...announcementForm, priority: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                        <SelectItem value="Critical" className="text-xs font-bold text-rose-600">CRITICAL ALERT (Red)</SelectItem>
                                        <SelectItem value="Urgent" className="text-xs font-bold text-amber-600">URGENT (Orange)</SelectItem>
                                        <SelectItem value="High" className="text-xs font-bold text-purple-600">HIGH Priority</SelectItem>
                                        <SelectItem value="Normal" className="text-xs font-bold text-slate-500">NORMAL Advisory</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Advisory Topic / Tag
                                </Label>
                                <Select
                                    value={announcementForm.category}
                                    onValueChange={(val) => setAnnouncementForm({ ...announcementForm, category: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                        <SelectItem value="MDRRMO" className="text-xs font-bold">MDRRMO General</SelectItem>
                                        <SelectItem value="Disaster Alert" className="text-xs font-bold text-rose-600">Disaster / Flood Alert</SelectItem>
                                        <SelectItem value="Weather Bulletin" className="text-xs font-bold text-blue-600">Weather & Typhoon Bulletin</SelectItem>
                                        <SelectItem value="Ambulance Dispatch" className="text-xs font-bold text-emerald-600">Ambulance Fleet Status</SelectItem>
                                        <SelectItem value="Road Warning" className="text-xs font-bold text-amber-600">Road Closure / Rescue</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Advisory Message Details <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                                required
                                value={announcementForm.content}
                                onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                                placeholder="Write the complete public emergency notice or guidelines here..."
                                className="rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                rows={4}
                            />
                        </div>

                        {/* Target Barangay & Dates */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Target Area / Barangay
                                </Label>
                                <Select
                                    value={announcementForm.barangay}
                                    onValueChange={(val) => setAnnouncementForm({ ...announcementForm, barangay: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                        <SelectItem value="ALL" className="text-xs font-bold">All Municipal Barangays (General)</SelectItem>
                                        {barangays.map(b => (
                                            <SelectItem key={b} value={b} className="text-xs font-bold">{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Event / Drill Date (Optional)
                                </Label>
                                <Input
                                    type="date"
                                    value={announcementForm.eventDate}
                                    onChange={(e) => setAnnouncementForm({ ...announcementForm, eventDate: e.target.value })}
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Banner Image / Advisory Poster (Optional)
                            </Label>
                            {imagePreview && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imagePreview} alt="Preview" className="h-28 w-full object-cover rounded-xl border my-2" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-xs text-slate-600 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-slate-200 dark:file:bg-white/10 hover:file:bg-slate-300 cursor-pointer"
                            />
                        </div>

                        {/* Pin to top */}
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isPinned"
                                checked={announcementForm.isPinned}
                                onChange={(e) => setAnnouncementForm({ ...announcementForm, isPinned: e.target.checked })}
                                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                            />
                            <Label htmlFor="isPinned" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                                Pin this advisory to the top of the portal
                            </Label>
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsAnnouncementModalOpen(false)}
                                className="rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="rounded-xl font-black text-xs uppercase text-white"
                                style={{ backgroundColor: themeColor }}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                Broadcast Advisory
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
