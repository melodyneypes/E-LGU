"use client";

import { useAnnouncements } from "../providers/AnnouncementProvider";
import { useAnnouncementForm } from "../hooks/useAnnouncementForm";
import { useState, useEffect } from "react";
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
import { Megaphone, Info, Calendar, Pin, Loader2, X } from "lucide-react";

export function AddAnnouncementModal() {
    const { isAddModalOpen, setIsAddModalOpen, editingData, setEditingData, currentBarangay } = useAnnouncements();
    const { handleSubmit, loading } = useAnnouncementForm();
    const [themeColor, setThemeColor] = useState("#2563eb");

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

    const formatDateForInput = (dateInput: Date | string | null | undefined) => {
        if (!dateInput) return "";
        const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
        return date.toISOString().split('T')[0];
    };

    return (
        <Dialog open={isAddModalOpen} onOpenChange={(open) => {
            setIsAddModalOpen(open);
            if (!open) setEditingData(null);
        }}>
            <DialogContent showCloseButton={false} className="sm:max-w-[1000px] w-[95vw] p-0 overflow-hidden bg-white dark:bg-[#1a1c23] border-none shadow-2xl rounded-[2rem] flex flex-row h-[750px] max-h-[90vh]">
                {/* Left Sidebar - Modern Theme Style */}
                <div 
                    className="hidden md:flex w-[320px] p-10 flex-col justify-between text-white relative overflow-hidden shrink-0 h-full"
                    style={{ backgroundColor: themeColor }}
                >
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                    
                    <div className="relative z-10">
                        <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center mb-8 bg-white/20 backdrop-blur-sm"
                        >
                            <Megaphone className="w-6 h-6 text-white" />
                        </div>
                        
                        <h2 className="text-4xl font-bold leading-tight mb-4">
                            {editingData ? "Update" : "New"}<br />
                            Announcement
                        </h2>
                        
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Broadcast important information, schedules, and alerts to all barangay residents.
                        </p>
                    </div>

                    <div className="relative z-10 bg-black/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Info className="w-4 h-4" /> Quick Tip
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed italic">
                            Keep your announcements concise. Pinned announcements will stay at the top of the feed for 7 days.
                        </p>
                    </div>
                </div>

                {/* Right Side - Form Content */}
                <div className="flex-1 flex flex-col min-w-0 h-full relative">
                    <DialogHeader className="p-8 pb-4 border-none shrink-0 flex flex-row items-center justify-between">
                        <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                            Announcement Details
                        </DialogTitle>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsAddModalOpen(false)}
                            className="h-9 w-9 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </DialogHeader>

                        <div className="flex-1 px-8 overflow-y-auto custom-scrollbar">
                            <form id="announcementForm" onSubmit={handleSubmit} className="space-y-6 py-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Title</Label>
                                    <Input
                                        name="title"
                                        required
                                        defaultValue={editingData?.title || ""}
                                        placeholder="Enter title..."
                                        className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary/20"
                                    />
                                    {(currentBarangay || editingData?.barangay) && (
                                        <input 
                                            type="hidden" 
                                            name="barangay" 
                                            value={editingData?.barangay || currentBarangay || ""} 
                                        />
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Content</Label>
                                    <Textarea
                                        name="content"
                                        required
                                        defaultValue={editingData?.content || ""}
                                        placeholder="Write details..."
                                        className="min-h-[160px] bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl p-4 resize-none focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Category</Label>
                                        <Select name="category" defaultValue={editingData?.category || "General"}>
                                            <SelectTrigger className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="General">General</SelectItem>
                                                <SelectItem value="Weather">Weather</SelectItem>
                                                <SelectItem value="Health">Health</SelectItem>
                                                <SelectItem value="Emergency">Emergency</SelectItem>
                                                <SelectItem value="Public Service">Public Service</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Priority</Label>
                                        <Select name="priority" defaultValue={editingData?.priority || "Normal"}>
                                            <SelectTrigger className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Normal">Normal</SelectItem>
                                                <SelectItem value="High">High Priority</SelectItem>
                                                <SelectItem value="Critical">Critical Alert</SelectItem>
                                                <SelectItem value="Low">Low Priority</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" /> Expiry Date (Optional)
                                    </Label>
                                    <Input
                                        type="date"
                                        name="expiryDate"
                                        defaultValue={formatDateForInput(editingData?.expiryDate)}
                                        className="h-12 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                            <Pin className="w-4 h-4" /> Pin Announcement
                                        </Label>
                                        <Switch name="isPinned" defaultChecked={editingData?.isPinned || false} />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
                                        <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Set Active</Label>
                                        <Switch name="isActive" defaultChecked={editingData?.isActive ?? true} />
                                    </div>
                                </div>
                            </form>
                        </div>

                        <DialogFooter className="p-8 pt-0 bg-white dark:bg-[#1a1c23] border-none shrink-0">
                            <Button
                                type="submit"
                                form="announcementForm"
                                disabled={loading}
                                className="w-full h-12 font-bold rounded-xl text-white shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                                style={{ backgroundColor: themeColor }}
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                                ) : (
                                    editingData ? "Apply Changes" : "Publish"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
            </DialogContent>
        </Dialog>
    );
}

