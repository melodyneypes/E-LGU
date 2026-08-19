"use client";

import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
    Plus, 
    Loader2, 
    Megaphone, 
    Image as ImageIcon, 
    Calendar, 
    Clock, 
    Pin, 
    ShieldAlert, 
    AlertTriangle, 
    Eye, 
    Tag, 
    BellRing, 
    Building2, 
    X,
    Trash2
} from "lucide-react";
import { format } from "date-fns";
import { createBploAnnouncement, updateBploAnnouncement } from "../actions";
import { getSecureUploadUrlAction } from "@/app/auth/actions";
import { compressImage } from "@/lib/image-compression";

interface BploAddAnnouncementModalProps {
    announcement?: any;
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export function BploAddAnnouncementModal({ announcement, onSuccess, trigger }: BploAddAnnouncementModalProps) {
    const isEdit = !!announcement;
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [title, setTitle] = useState(announcement?.title || "");
    const [content, setContent] = useState(announcement?.content || "");
    const [category, setCategory] = useState(announcement?.category || "Business");
    const [priority, setPriority] = useState(announcement?.priority || "Normal");
    const [isPinned, setIsPinned] = useState(announcement?.isPinned || false);
    const [isActive, setIsActive] = useState(announcement?.isActive ?? true);
    const [imageUrl, setImageUrl] = useState(announcement?.imageUrl || "");
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string>("");
    const [expiryDate, setExpiryDate] = useState(
        announcement?.expiryDate ? new Date(announcement.expiryDate).toISOString().split("T")[0] : ""
    );
    const [eventDate, setEventDate] = useState(
        announcement?.eventDate ? new Date(announcement.eventDate).toISOString().split("T")[0] : ""
    );
    const [eventSchedule, setEventSchedule] = useState(announcement?.eventSchedule || "");
    const [uploadingImage, setUploadingImage] = useState(false);

    const displayImageUrl = localPreviewUrl || imageUrl;

    useEffect(() => {
        if (announcement) {
            setTitle(announcement.title || "");
            setContent(announcement.content || "");
            setCategory(announcement.category || "Business");
            setPriority(announcement.priority || "Normal");
            setIsPinned(announcement.isPinned || false);
            setIsActive(announcement.isActive ?? true);
            setImageUrl(announcement.imageUrl || "");
            setLocalPreviewUrl("");
            setExpiryDate(announcement.expiryDate ? new Date(announcement.expiryDate).toISOString().split("T")[0] : "");
            setEventDate(announcement.eventDate ? new Date(announcement.eventDate).toISOString().split("T")[0] : "");
            setEventSchedule(announcement.eventSchedule || "");
        } else {
            setTitle("");
            setContent("");
            setCategory("Business");
            setPriority("Normal");
            setIsPinned(false);
            setIsActive(true);
            setImageUrl("");
            setLocalPreviewUrl("");
            setExpiryDate("");
            setEventDate("");
            setEventSchedule("");
        }
    }, [announcement, open]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 1. Instant 0ms local preview
        const objectUrl = URL.createObjectURL(file);
        setLocalPreviewUrl(objectUrl);
        setUploadingImage(true);

        try {
            // 2. Parallel compression and signed upload URL generation
            const fileExt = file.name.split(".").pop() || "jpg";
            const [compressed, urlRes] = await Promise.all([
                compressImage(file, 1000, 0.75),
                getSecureUploadUrlAction("bplo_banner", "announcements", fileExt)
            ]);

            if (!urlRes.success || !urlRes.signedUrl || !urlRes.publicUrl) {
                throw new Error(urlRes.error || "Failed to get upload authorization");
            }

            const uploadRes = await fetch(urlRes.signedUrl, {
                method: "PUT",
                body: compressed,
                headers: { "Content-Type": compressed.type || "image/jpeg" },
            });

            if (!uploadRes.ok) {
                throw new Error("Failed to upload image asset");
            }

            setImageUrl(urlRes.publicUrl);
            toast.success("Banner image ready!");
        } catch (error: any) {
            console.error("Image upload error:", error);
            toast.error(error.message || "Failed to upload image");
            setLocalPreviewUrl("");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            toast.error("Please fill in both title and announcement details.");
            return;
        }

        setLoading(true);
        try {
            const formData = new FormData();
            formData.append("title", title);
            formData.append("content", content);
            formData.append("category", category);
            formData.append("priority", priority);
            formData.append("isPinned", String(isPinned));
            formData.append("isActive", String(isActive));
            if (imageUrl) formData.append("imageUrl", imageUrl);
            if (expiryDate) formData.append("expiryDate", expiryDate);
            if (eventDate) formData.append("eventDate", eventDate);
            if (eventSchedule) formData.append("eventSchedule", eventSchedule);

            let res;
            if (isEdit) {
                res = await updateBploAnnouncement(announcement.id, formData);
            } else {
                res = await createBploAnnouncement(formData);
            }

            if (res.success) {
                toast.success(res.message || "Announcement submitted successfully!");
                setOpen(false);
                if (!isEdit) {
                    setTitle("");
                    setContent("");
                    setImageUrl("");
                    setExpiryDate("");
                    setEventDate("");
                    setEventSchedule("");
                }
                onSuccess?.();
            } else {
                toast.error(res.error || "Failed to save announcement");
            }
        } catch (error: any) {
            console.error("Submit announcement error:", error);
            toast.error(error.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const isCritical = priority === "Critical";
    const isHigh = priority === "High" || priority === "Important";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button 
                        className="font-black tracking-wider uppercase text-xs rounded-xl shadow-lg transition-all hover:scale-[1.02] flex items-center gap-2"
                        style={{ backgroundColor: 'var(--primary-theme)' }}
                    >
                        <Plus className="w-4 h-4" />
                        Create BPLO Announcement
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent 
                showCloseButton={false} 
                className="sm:max-w-[1040px] w-[95vw] p-0 overflow-hidden bg-white dark:bg-[#161820] border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl md:rounded-3xl flex flex-col md:flex-row h-auto md:h-[820px] max-h-[94vh]"
            >
                {/* Left Panel: Real-Time Live Preview */}
                <div className="hidden md:flex w-[360px] p-6 flex-col justify-between bg-slate-950 text-white relative overflow-hidden shrink-0 h-full border-r border-slate-800/80">
                    {/* Background Subtle Gradient Glow */}
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-blue-600/15 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        {/* Live Preview Header Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
                                <Eye className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Live Citizen Preview</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">Real-time</span>
                        </div>

                        {/* Interactive Live Card Preview */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
                            {/* Card Top Banner / Header */}
                            <div className={`p-4 text-white relative overflow-hidden ${
                                isCritical
                                    ? "bg-gradient-to-r from-red-600 to-rose-600"
                                    : isHigh
                                    ? "bg-gradient-to-r from-amber-500 to-orange-600"
                                    : "bg-gradient-to-r from-slate-800 to-slate-900"
                            }`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge className={`px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest border-0 ${
                                            isCritical 
                                                ? "bg-white text-red-600" 
                                                : isHigh 
                                                ? "bg-white text-orange-600" 
                                                : "bg-blue-600 text-white"
                                        }`}>
                                            {isCritical ? (
                                                <ShieldAlert className="w-2.5 h-2.5 mr-1" />
                                            ) : isHigh ? (
                                                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                            ) : (
                                                <Building2 className="w-2.5 h-2.5 mr-1" />
                                            )}
                                            <span>{priority === "Critical" ? "Critical Alert" : priority === "High" ? "High Priority" : priority === "Low" ? "Low Priority" : "Normal"}</span>
                                        </Badge>

                                        {isPinned && (
                                            <Badge className="bg-white/20 text-white border-0 text-[8px] uppercase font-bold gap-1">
                                                <Pin className="w-2 h-2" /> Pinned
                                            </Badge>
                                        )}
                                    </div>

                                    <span className="text-[8px] font-bold uppercase tracking-widest opacity-80 flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {format(new Date(), "MMM d")}
                                    </span>
                                </div>

                                <div className="space-y-0.5">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1">
                                        <BellRing className="w-2.5 h-2.5 text-blue-300" /> BPLO Broadcast
                                    </span>
                                    <h3 className="text-base font-black uppercase italic tracking-tighter text-white leading-tight line-clamp-2">
                                        {title.trim() || "Announcement Title..."}
                                    </h3>
                                </div>
                            </div>

                            {/* Image Thumbnail in Preview */}
                            {displayImageUrl && (
                                <div className="relative w-full h-32 bg-slate-950 overflow-hidden border-b border-slate-800">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={displayImageUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Preview Body Text */}
                            <div className="p-4 space-y-3 bg-slate-900">
                                <p className="text-xs text-slate-300 font-medium leading-relaxed italic line-clamp-4 whitespace-pre-line">
                                    {content.trim() || "Write announcement details on the form to preview how text will look to citizens..."}
                                </p>

                                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1 text-primary">
                                        <Tag className="w-2.5 h-2.5" />
                                        {category}
                                    </div>
                                    <span className="text-slate-500">Mapandan Portal</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" /> Portal Feed Preview
                        </p>
                        <p className="text-[10px] leading-relaxed italic">
                            This live card updates instantly as you edit fields. Approved announcements will appear live in the citizen broadcast and priority modal.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form Content */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white dark:bg-[#161820]">
                    <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 shrink-0 flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-primary" />
                            {isEdit ? "Edit BPLO Announcement" : "New BPLO Announcement Details"}
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setOpen(false)}
                            className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 px-6 sm:px-8 overflow-y-auto custom-scrollbar">
                        <form id="bploAnnouncementForm" onSubmit={handleSubmit} className="space-y-4 py-4">
                            {/* Title Field */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Title <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <span className={`text-[10px] font-mono ${title.length >= 100 ? "text-red-500 font-bold" : "text-slate-400"}`}>
                                        {title.length} / 100 max
                                    </span>
                                </div>
                                <Input
                                    name="title"
                                    required
                                    maxLength={100}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Annual Business Permit Renewal Schedule 2026"
                                    className={`h-11 bg-slate-50 dark:bg-white/5 rounded-xl text-xs font-medium ${
                                        title.length >= 100 
                                            ? "border-red-500 focus-visible:ring-red-500" 
                                            : "border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                                    }`}
                                />
                            </div>

                            {/* Content Field */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Content Details <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <span className={`text-[10px] font-mono ${content.length >= 500 ? "text-red-500 font-bold" : "text-slate-400"}`}>
                                        {content.length} / 500 max
                                    </span>
                                </div>
                                <Textarea
                                    name="content"
                                    required
                                    maxLength={500}
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Provide detailed information regarding schedules, renewal guidelines, requirements, and office procedures..."
                                    className={`min-h-[120px] bg-slate-50 dark:bg-white/5 rounded-xl p-3.5 resize-none text-xs font-medium leading-relaxed ${
                                        content.length >= 500 
                                            ? "border-red-500 focus-visible:ring-red-500" 
                                            : "border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                                    }`}
                                />
                            </div>

                            {/* Category & Priority Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Category
                                    </Label>
                                    <Select name="category" value={category} onValueChange={setCategory}>
                                        <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-3.5 flex items-center transition-all">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#161820] border-slate-200 dark:border-slate-850">
                                            <SelectItem value="Business">Business (BPLO)</SelectItem>
                                            <SelectItem value="Public Service">Public Service</SelectItem>
                                            <SelectItem value="General">General</SelectItem>
                                            <SelectItem value="Emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Priority <span className="text-red-500 font-bold">*</span>
                                    </Label>
                                    <Select name="priority" value={priority} onValueChange={setPriority}>
                                        <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-3.5 flex items-center gap-2 transition-all hover:bg-slate-100/50 dark:hover:bg-[#23273a]">
                                            <div className="flex items-center gap-2">
                                                {!priority ? (
                                                    <Megaphone className="w-4 h-4 text-slate-400" />
                                                ) : priority === "Critical" ? (
                                                    <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                                                ) : priority === "High" ? (
                                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                ) : (
                                                    <Megaphone className="w-4 h-4 text-blue-500" />
                                                )}
                                                <SelectValue placeholder="Select priority..." />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#161820] border-slate-200 dark:border-slate-850">
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="High">High Priority</SelectItem>
                                            <SelectItem value="Critical">Critical Alert</SelectItem>
                                            <SelectItem value="Low">Low Priority</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Dates Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                        Event Date (Optional)
                                    </Label>
                                    <Input
                                        type="date"
                                        value={eventDate}
                                        onChange={(e) => setEventDate(e.target.value)}
                                        className="h-11 bg-slate-50 dark:bg-white/5 rounded-xl border-slate-200 dark:border-white/10 text-xs font-medium"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Expiry Date (Optional)
                                    </Label>
                                    <Input
                                        type="date"
                                        value={expiryDate}
                                        onChange={(e) => setExpiryDate(e.target.value)}
                                        className="h-11 bg-slate-50 dark:bg-white/5 rounded-xl border-slate-200 dark:border-white/10 text-xs font-medium"
                                    />
                                </div>
                            </div>

                            {/* Quick Actions Switches Box */}
                            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                    <div className="flex items-center gap-2">
                                        <Pin className="w-4 h-4 text-primary" />
                                        <div>
                                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block cursor-pointer">
                                                Pin to Feed
                                            </Label>
                                            <span className="text-[10px] text-slate-400">Keep at top of listings</span>
                                        </div>
                                    </div>
                                    <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                                </div>

                                <div className="h-px sm:h-8 w-full sm:w-px bg-slate-200 dark:bg-white/10" />

                                <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                                    <div>
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 block cursor-pointer">
                                            Set Active
                                        </Label>
                                        <span className="text-[10px] text-slate-400">Live upon approval</span>
                                    </div>
                                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                                </div>
                            </div>

                            {/* Banner Image Upload */}
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                                    Banner / Poster Image (Optional)
                                </Label>
                                
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                        className="h-11 rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/[0.03] text-xs file:bg-primary/10 file:text-primary file:border-0 file:rounded-lg file:mr-3 file:font-bold"
                                    />
                                    {uploadingImage && (
                                        <div className="flex items-center gap-1.5 text-xs text-primary font-bold animate-pulse shrink-0">
                                            <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                                        </div>
                                    )}
                                </div>

                                {displayImageUrl && (
                                    <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 max-h-40 w-full group flex items-center justify-center bg-black/40">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={displayImageUrl} alt="Uploaded Banner" className="w-full h-40 object-cover" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setImageUrl("");
                                                setLocalPreviewUrl("");
                                            }}
                                            className="absolute top-2 right-2 rounded-lg text-xs font-bold shadow-lg opacity-90 hover:opacity-100 gap-1.5"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Remove Image
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Submit Action */}
                            <div className="pt-3 pb-2">
                                <Button
                                    type="submit"
                                    disabled={loading || uploadingImage}
                                    className="w-full h-12 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all hover:scale-[1.01] active:scale-95"
                                    style={{ backgroundColor: 'var(--primary-theme, #2563eb)' }}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            Submitting Announcement...
                                        </>
                                    ) : isEdit ? (
                                        "Update BPLO Announcement"
                                    ) : (
                                        "Submit for LGU Approval"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
