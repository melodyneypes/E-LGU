"use client";
import { sanitizeLguText } from "@/lib/utils/lgu";


import { useAnnouncements } from "../providers/AnnouncementProvider";
import { useAnnouncementForm } from "../hooks/useAnnouncementForm";
import { useState, useEffect } from "react";
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
    Megaphone,
    Calendar,
    Pin,
    Loader2,
    X,
    ShieldAlert,
    AlertTriangle,
    Tag,
    Eye,
    BellRing
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export function AddAnnouncementModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay, hideCategory } = useAnnouncements();
    const { handleSubmit, loading } = useAnnouncementForm();
    const [themeColor, setThemeColor] = useState("#2563eb");
    const [validationError, setValidationError] = useState("");

    // Real-time Form States for Live Preview
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("General");
    const [priority, setPriority] = useState("");
    const [isPinned, setIsPinned] = useState(false);

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
            setCategory(editingData.category || "General");
            setPriority(editingData.priority || "");
            setIsPinned(Boolean(editingData.isPinned));
        } else {
            setTitle("");
            setContent("");
            setCategory("General");
            setPriority("");
            setIsPinned(false);
        }
    }, [editingData, isAddModalOpen, hideCategory, currentBarangay]);

    const formatDateForInput = (dateInput: Date | string | null | undefined) => {
        if (!dateInput) return "";
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        return date.toISOString().split('T')[0];
    };

    const isCritical = priority === "Critical";
    const isHigh = priority === "High";

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) {
                setEditingData(null);
                setValidationError("");
            }
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-[1020px] w-[95vw] p-0 overflow-hidden bg-white dark:bg-[#161820] border border-slate-200 dark:border-white/10 shadow-2xl rounded-none flex flex-row h-[800px] max-h-[92vh]">
                {/* Left Panel: Real-Time Live Preview */}
                <div className="hidden md:flex w-[350px] p-6 flex-col justify-between bg-slate-950 text-white relative overflow-hidden shrink-0 h-full border-r border-slate-800/80">
                    {/* Background Subtle Gradient Glow */}
                    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-rose-600/10 to-transparent pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative z-10 space-y-4">
                        {/* Live Preview Header Badge */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
                                <Eye className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Live Citizen Preview</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-500">Real-time</span>
                        </div>

                        {/* Interactive Live Card Preview */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0">
                            {/* Card Top Banner / Header */}
                            <div className={`p-4 text-white relative overflow-hidden ${isCritical
                                    ? "bg-gradient-to-r from-red-600 to-rose-600"
                                    : isHigh
                                        ? "bg-gradient-to-r from-amber-500 to-orange-600"
                                        : "bg-slate-800"
                                }`}>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge className={`px-2.5 py-0.5 text-[8px] font-black uppercase tracking-widest border-0 ${isCritical ? "bg-white text-red-600" : isHigh ? "bg-white text-orange-600" : "bg-slate-700 text-white"
                                            }`}>
                                            {isCritical ? (
                                                <ShieldAlert className="w-2.5 h-2.5 mr-1" />
                                            ) : isHigh ? (
                                                <AlertTriangle className="w-2.5 h-2.5 mr-1" />
                                            ) : (
                                                <Megaphone className="w-2.5 h-2.5 mr-1" />
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
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/70 flex items-center gap-1">
                                        <BellRing className="w-2.5 h-2.5" /> Citizen Broadcast
                                    </span>
                                    <h3 className="text-base font-black uppercase italic tracking-tighter text-white leading-tight line-clamp-2">
                                        {title.trim() || "Announcement Title..."}
                                    </h3>
                                </div>
                            </div>

                            {/* Preview Body Text */}
                            <div className="p-4 space-y-3 bg-slate-900">
                                <p className="text-xs text-slate-300 font-medium leading-relaxed italic line-clamp-4">
                                    {content.trim() || "Write announcement details on the form to preview how text will look to citizens..."}
                                </p>

                                <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                    <div className="flex items-center gap-1 text-primary">
                                        <Tag className="w-2.5 h-2.5" />
                                        {category}
                                    </div>
                                    <span className="text-slate-500">{sanitizeLguText("{{LGU_NAME}}")} Portal</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
                        <p className="font-bold text-slate-300 flex items-center gap-1.5">
                            <Megaphone className="w-3.5 h-3.5 text-primary shrink-0" /> Portal Feed Preview
                        </p>
                        <p className="text-[10px] leading-relaxed italic">
                            This live card updates instantly as you edit fields. High/Critical notices automatically appear on the citizen modal.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form Content */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative bg-white dark:bg-[#161820]">
                    <DialogHeader className="p-7 pb-3 border-b border-slate-100 dark:border-white/5 shrink-0 flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-primary" />
                            {editingData ? "Edit Announcement Details" : "New Announcement Details"}
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
                        <form id="announcementForm" onSubmit={handleFormSubmit} className="space-y-5 py-4">
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
                                    placeholder="e.g., Scheduled Water Interruption Notice"
                                    className={`h-11 bg-slate-50 dark:bg-white/5 rounded-xl text-xs font-medium ${title.length >= 100 || (title.trim().length === 0 && editingData)
                                            ? "border-red-500 focus-visible:ring-red-500"
                                            : "border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                                        }`}
                                />
                                {title.length >= 100 && (
                                    <p className="text-[10px] text-red-500 font-medium">
                                        Title cannot exceed 100 characters to prevent UI distortion.
                                    </p>
                                )}
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
                                    placeholder="Provide detailed information regarding schedules, affected areas, and guidelines..."
                                    className={`min-h-[130px] bg-slate-50 dark:bg-white/5 rounded-xl p-4 resize-none text-xs font-medium leading-relaxed ${content.length >= 500 || (content.trim().length === 0 && editingData)
                                            ? "border-red-500 focus-visible:ring-red-500"
                                            : "border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-primary/20"
                                        }`}
                                />
                                {content.length >= 500 && (
                                    <p className="text-[10px] text-red-500 font-medium">
                                        Content details cannot exceed 500 characters to maintain clean layout formatting.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {!hideCategory && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Category</Label>
                                        <Select name="category" value={category} onValueChange={setCategory}>
                                            <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-[#1c1f2e] border border-slate-200 dark:border-slate-800 rounded-xl text-xs px-3.5 flex items-center transition-all hover:bg-slate-100/50 dark:hover:bg-[#23273a]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white dark:bg-[#161820] border-slate-200 dark:border-slate-850">
                                                <SelectItem value="General">General</SelectItem>
                                                <SelectItem value="Weather">Weather</SelectItem>
                                                <SelectItem value="Emergency">Emergency</SelectItem>
                                                <SelectItem value="MDRRMO">MDRRMO / Disaster</SelectItem>
                                                <SelectItem value="Health / Ambulance">Health / Ambulance</SelectItem>
                                                <SelectItem value="Public Service">Public Service</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

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
                                    {validationError && (
                                        <p className="text-[10px] text-red-500 font-medium">{validationError}</p>
                                    )}
                                </div>

                                    {currentBarangay ? (
                                        <input type="hidden" name="barangay" value={currentBarangay} />
                                    ) : (
                                        <input type="hidden" name="barangay" value="ALL" />
                                    )}

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

                                <div className="flex flex-col justify-end space-y-1.5 md:col-span-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">Quick Actions</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex items-center justify-between px-3 h-11 bg-slate-50/30 dark:bg-[#1c1f2e]/50 rounded-xl border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 transition-all">
                                            <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                                                <Pin className="w-3.5 h-3.5 text-primary" /> Pin to Feed
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
                            form="announcementForm"
                            disabled={loading}
                            className="w-full h-11 font-black uppercase tracking-wider rounded-xl text-white shadow-xl transition-all hover:scale-[1.01] active:scale-[0.99] text-xs"
                            style={{ backgroundColor: themeColor }}
                        >
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                            ) : (
                                editingData ? "Apply Changes" : "Publish Announcement"
                            )}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
