"use client";
import { sanitizeLguText } from "@/lib/utils/lgu";


import { useAnnouncements } from "@/app/admin/content/Announcements/providers/AnnouncementProvider";
import { useAnnouncementForm } from "@/app/admin/content/Announcements/hooks/useAnnouncementForm";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
    Activity,
    Calendar,
    Pin,
    Loader2,
    X,
    ShieldAlert,
    AlertTriangle,
    Tag,
    Eye,
    BellRing,
    UploadCloud,
    ImageIcon,
    Trash2,
    Link as LinkIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function RHUAddAnnouncementModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay } = useAnnouncements();
    const { handleSubmit, loading } = useAnnouncementForm();
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [validationError, setValidationError] = useState("");

    // Real-time Form States for Live Preview
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [priority, setPriority] = useState("");
    const [isPinned, setIsPinned] = useState(false);
    const [eventDate, setEventDate] = useState("");
    const [eventSchedule, setEventSchedule] = useState("");

    // Cover Image states
    const [imageUrl, setImageUrl] = useState<string>("");
    const [imageTab, setImageTab] = useState<"file" | "url">("file");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!priority || priority.trim() === "") {
            setValidationError("Priority is a required field. Please select a priority.");
            return;
        }
        setValidationError("");
        await handleSubmit(e);
    };

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await fetch('/api/settings');
                const data = await response.json();
                if (data.themeColor) {
                    setThemeColor(data.themeColor);
                }
            } catch (error) {
                console.error('Error fetching theme settings:', error);
            }
        };
        fetchSettings();
    }, []);

    // Populate modal when editing existing notice
    useEffect(() => {
        if (editingData) {
            setTitle(editingData.title || "");
            setContent(editingData.content || "");
            setPriority(editingData.priority || "");
            setIsPinned(Boolean(editingData.isPinned));
            setImageUrl(editingData.imageUrl || "");
            setEventDate(editingData.eventDate ? formatDateForInput(editingData.eventDate) : "");
            setEventSchedule(editingData.eventSchedule || "");
        } else {
            setTitle("");
            setContent("");
            setPriority("");
            setIsPinned(false);
            setImageUrl("");
            setEventDate("");
            setEventSchedule("");
        }
    }, [editingData, isAddModalOpen, currentBarangay]);

    const formatDateForInput = (dateInput: Date | string | null | undefined) => {
        if (!dateInput) return "";
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        return date.toISOString().split('T')[0];
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size exceeds 5MB limit. Please choose a smaller image.");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === "string") {
                setImageUrl(reader.result);
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setImageUrl("");
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const isCritical = priority === "Critical";
    const isHigh = priority === "High";

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                setEditingData(null);
                setImageUrl("");
                setValidationError("");
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-[1020px] w-[95vw] p-0 overflow-hidden bg-white dark:bg-[#161820] border border-slate-200 dark:border-white/10 shadow-2xl rounded-none flex flex-row h-[800px] max-h-[92vh]">
                {/* Left Panel: Real-Time Live Preview */}
                <div className="hidden md:flex w-[350px] p-6 flex-col justify-between bg-slate-950 text-white relative overflow-hidden shrink-0 h-full border-r border-slate-800/80">
                    {/* Background Subtle Gradient Glow */}
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-emerald-600/10 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        {/* Live Preview Header Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
                                <Eye className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">RHU Advisory Preview</span>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400">Health</span>
                        </div>

                        {/* Interactive Live Card Preview */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
                            {/* Card Top Banner / Header */}
                            <div className={`p-4 text-white relative overflow-hidden ${isCritical
                                    ? "bg-gradient-to-r from-red-600 to-rose-600"
                                    : isHigh
                                        ? "bg-gradient-to-r from-amber-500 to-orange-600"
                                        : "bg-emerald-800"
                                }`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge className={`px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest border-0 ${isCritical ? "bg-white text-red-600" : isHigh ? "bg-white text-orange-600" : "bg-emerald-950 text-emerald-200"
                                            }`}>
                                            {isCritical ? (
                                                <ShieldAlert className="w-2.5 h-2.5 mr-1" />
                                            ) : isHigh ? (
                                                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                            ) : (
                                                <Activity className="w-2.5 h-2.5 mr-1" />
                                            )}
                                            {priority ? `${priority} Priority` : "Select Priority"}
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
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-200/90 flex items-center gap-1">
                                        <BellRing className="w-2.5 h-2.5" /> Health Advisory
                                    </span>
                                    <h3 className="text-base font-black uppercase italic tracking-tighter text-white leading-tight line-clamp-2">
                                        {title.trim() || "Health Announcement Title..."}
                                    </h3>
                                </div>
                            </div>

                            {/* Optional Preview Image */}
                            {imageUrl && (
                                <div className="relative w-full bg-slate-950 p-1 border-b border-slate-800 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imageUrl}
                                        alt="Health Advisory Banner Preview"
                                        className="w-full max-h-[220px] object-contain rounded-none"
                                    />
                                </div>
                            )}

                            {/* Preview Body Text */}
                            <div className="p-4 space-y-3 bg-slate-900">
                                <p className="text-xs text-slate-300 font-medium leading-relaxed italic line-clamp-4">
                                    {content.trim() || "Write health advisory details on the form to preview how text will look to citizens..."}
                                </p>

                                {(eventDate || eventSchedule) && (
                                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                                            <Calendar className="w-3 h-3 text-emerald-400" />
                                            Event Schedule
                                        </div>
                                        {eventDate && (
                                            <p className="text-[11px] font-bold text-slate-200">
                                                📅 {format(new Date(eventDate), "MMMM d, yyyy")}
                                            </p>
                                        )}
                                        {eventSchedule && (
                                            <p className="text-[10px] text-emerald-300 font-medium">
                                                ⏰ {eventSchedule}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1 text-emerald-400">
                                        <Tag className="w-2.5 h-2.5" />
                                        Health & RHU
                                    </div>
                                    <span className="text-slate-500">RHU {sanitizeLguText("{{LGU_NAME}}")}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> RHU Health Feed
                        </p>
                        <p className="text-[10px] leading-relaxed italic">
                            This health advisory will be published directly under the Rural Health Unit (RHU) portal and broadcast feed.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form Content */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white dark:bg-[#161820]">
                    <DialogHeader className="p-7 pb-3 border-b border-slate-100 dark:border-white/5 shrink-0 flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            {editingData ? "Edit Health Advisory" : "New RHU Health Advisory"}
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsAddModalOpen(false)}
                            className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 px-7 overflow-y-auto custom-scrollbar">
                        <form id="rhuAnnouncementForm" onSubmit={handleFormSubmit} className="space-y-5 py-4">
                            <input type="hidden" name="imageUrl" value={imageUrl} />
                            <input type="hidden" name="category" value="Health" />
                            {currentBarangay ? (
                                <input type="hidden" name="barangay" value={currentBarangay} />
                            ) : (
                                <input type="hidden" name="barangay" value="ALL" />
                            )}

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
                                    placeholder="e.g., Free Polio Vaccination Drive Schedule"
                                    className={`h-11 bg-slate-50 dark:bg-white/5 rounded-xl text-xs font-medium ${title.length >= 100 || (title.trim().length === 0 && editingData)
                                            ? "border-red-500 focus-visible:ring-red-500"
                                            : "border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500/20"
                                        }`}
                                />
                                {title.length >= 100 && (
                                    <p className="text-[10px] text-red-500 font-medium">
                                        Title cannot exceed 100 characters to prevent UI distortion.
                                    </p>
                                )}
                            </div>

                            {/* Optional Event Schedule Section */}
                            <div className="p-4 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl space-y-3">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-emerald-500" />
                                    Event / Activity Schedule <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                </Label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            Event Date
                                        </Label>
                                        <Input
                                            type="date"
                                            name="eventDate"
                                            value={eventDate}
                                            onChange={(e) => setEventDate(e.target.value)}
                                            className="h-10 bg-white dark:bg-[#1c1f2e] border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            Time & Venue Details
                                        </Label>
                                        <Input
                                            type="text"
                                            name="eventSchedule"
                                            value={eventSchedule}
                                            onChange={(e) => setEventSchedule(e.target.value)}
                                            placeholder="e.g. 8:00 AM - 3:00 PM @ RHU Main"
                                            className="h-10 bg-white dark:bg-[#1c1f2e] border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

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
                                    placeholder="Provide detailed health guidelines, clinic schedules, target age groups, and requirements..."
                                    className={`min-h-[140px] bg-slate-50 dark:bg-white/5 rounded-xl p-4 resize-none text-xs font-medium leading-relaxed ${content.length >= 500 || (content.trim().length === 0 && editingData)
                                            ? "border-red-500 focus-visible:ring-red-500"
                                            : "border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-emerald-500/20"
                                        }`}
                                />
                                {content.length >= 500 && (
                                    <p className="text-[10px] text-red-500 font-medium">
                                        Content details cannot exceed 500 characters to maintain clean layout formatting.
                                    </p>
                                )}
                            </div>

                            {/* Medical Poster / Banner Image Upload Section */}
                            <div className="space-y-2 pt-1">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <ImageIcon className="w-3.5 h-3.5 text-emerald-500" />
                                        Health Poster / Infographic Banner <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                    </Label>

                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px] font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setImageTab("file")}
                                            className={`px-2 py-0.5 rounded-md transition-all ${imageTab === "file" ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-xs" : "text-slate-500"}`}
                                        >
                                            Upload File
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setImageTab("url")}
                                            className={`px-2 py-0.5 rounded-md transition-all ${imageTab === "url" ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-xs" : "text-slate-500"}`}
                                        >
                                            Image URL
                                        </button>
                                    </div>
                                </div>

                                {imageUrl ? (
                                    <div className="relative w-full min-h-[140px] rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-950 p-1 group flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imageUrl}
                                            alt="Health advisory poster"
                                            className="w-full max-h-[220px] object-contain rounded-none"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleRemoveImage}
                                                className="h-8 px-3 rounded-lg text-xs font-bold gap-1.5 shadow-lg"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Remove Image
                                            </Button>
                                        </div>
                                    </div>
                                ) : imageTab === "file" ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-50 dark:bg-white/5 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <UploadCloud className="w-4 h-4" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                Click to upload health advisory image / poster
                                            </p>
                                            <p className="text-[10px] text-slate-400">
                                                PNG, JPG, WEBP up to 5MB
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
                                            <Input
                                                type="url"
                                                placeholder="https://example.com/health-poster.jpg"
                                                value={imageUrl}
                                                onChange={(e) => setImageUrl(e.target.value)}
                                                className="h-10 pl-9 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Category</Label>
                                    <Input
                                        readOnly
                                        value="Health & RHU Advisory"
                                        className="h-11 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold cursor-not-allowed uppercase tracking-wider"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Priority <span className="text-red-500 font-bold">*</span></Label>
                                    <Select name="priority" value={priority} onValueChange={(val) => {
                                        setPriority(val);
                                        if (val) setValidationError("");
                                    }}>
                                        <SelectTrigger className={cn(
                                            "h-11 bg-slate-50/50 dark:bg-[#1c1f2e] border rounded-xl text-xs px-3.5 flex items-center gap-2 transition-all hover:bg-slate-100/50 dark:hover:bg-[#23273a]",
                                            validationError 
                                                ? "border-red-500 focus-visible:ring-red-500" 
                                                : "border-slate-200 dark:border-slate-800"
                                        )}>
                                            <div className="flex items-center gap-2">
                                                {!priority ? (
                                                    <Activity className="w-4 h-4 text-slate-400" />
                                                ) : priority === "Critical" ? (
                                                    <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                                                ) : priority === "High" ? (
                                                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                ) : (
                                                    <Activity className="w-4 h-4 text-emerald-500" />
                                                )}
                                                <SelectValue placeholder="Select priority..." />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#161820] border-slate-200 dark:border-slate-850">
                                            <SelectItem value="Normal">Normal</SelectItem>
                                            <SelectItem value="High">High Priority</SelectItem>
                                            <SelectItem value="Critical">Critical Health Alert</SelectItem>
                                            <SelectItem value="Low">Low Priority</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {validationError && (
                                        <p className="text-[10px] text-red-500 font-medium">{validationError}</p>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        Expiry Date <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                    </Label>
                                    <div className="relative">
                                        <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <Input
                                            type="date"
                                            name="expiryDate"
                                            defaultValue={formatDateForInput(editingData?.expiryDate)}
                                            className="h-11 pl-10 bg-slate-50/50 dark:bg-[#1c1f2e] border-slate-200 dark:border-slate-800 rounded-xl text-xs transition-all hover:bg-slate-100/50 dark:hover:bg-[#23273a]"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col justify-end space-y-1.5">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Quick Actions</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between px-3 h-11 bg-slate-50/30 dark:bg-[#1c1f2e]/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 transition-all">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                                                <Pin className="w-3.5 h-3.5 text-emerald-500" /> Pin to Feed
                                            </Label>
                                            <Switch name="isPinned" checked={isPinned} onCheckedChange={setIsPinned} />
                                        </div>

                                        <div className="flex items-center justify-between px-3 h-11 bg-slate-50/30 dark:bg-[#1c1f2e]/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 transition-all">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 cursor-pointer">
                                                Set Active
                                            </Label>
                                            <Switch name="isActive" defaultChecked={editingData?.isActive ?? true} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <DialogFooter className="p-7 pt-3 bg-white dark:bg-[#161820] border-t border-slate-100 dark:border-white/5 shrink-0">
                        <Button
                            type="submit"
                            form="rhuAnnouncementForm"
                            disabled={loading}
                            className="w-full h-11 font-black uppercase tracking-wider rounded-xl text-white shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] text-xs border-0"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                            ) : (
                                editingData ? "Apply Changes" : "Publish Health Advisory"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
