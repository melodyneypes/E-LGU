"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Activity,
    Stethoscope,
    Syringe,
    Heart,
    Sparkles,
    Megaphone,
    Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { getCenterSpecialEvents, saveCenterSpecialEvent, deleteCenterSpecialEvent } from "@/app/user/services/rural-health-unit/actions";
import { cn } from "@/lib/utils";

interface RHUSpecialEventsModalProps {
    isOpen: boolean;
    onClose: () => void;
    healthCenters: any[];
    selectedCenterId: string;
    onSelectCenter?: (centerId: string) => void;
    isEditable?: boolean;
}

const CATEGORY_OPTIONS = [
    { value: "Dental Mission", label: "Dental Mission", icon: Stethoscope, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
    { value: "Vaccination & Immunization", label: "Vaccination Drive", icon: Syringe, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { value: "Blood Donation Drive", label: "Blood Drive", icon: Heart, color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
    { value: "Maternal & Child Health", label: "Maternal & Child Health", icon: Sparkles, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
    { value: "Screening & Consultation", label: "Medical Screening", icon: Activity, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
];

export function RHUSpecialEventsModal({
    isOpen,
    onClose,
    healthCenters,
    selectedCenterId,
    onSelectCenter,
    isEditable = true,
}: RHUSpecialEventsModalProps) {
    const router = useRouter();
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [isLoadingEvents, setIsLoadingEvents] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Event Publish / Edit Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [eventTitle, setEventTitle] = useState("");
    const [eventCategory, setEventCategory] = useState("Dental Mission");
    const [eventDateStr, setEventDateStr] = useState("");
    const [eventTimeRange, setEventTimeRange] = useState("08:00 AM - 03:00 PM");
    const [eventVenue, setEventVenue] = useState("");
    const [eventMaxSlots, setEventMaxSlots] = useState<number>(50);
    const [eventDescription, setEventDescription] = useState("");
    const [publishToAdvisories, setPublishToAdvisories] = useState(true);

    const activeCenter = healthCenters.find(c => c.id === selectedCenterId) || healthCenters[0] || { name: "Health Center" };

    const loadEvents = React.useCallback(async () => {
        if (!selectedCenterId) return;
        setIsLoadingEvents(true);
        try {
            const res = await getCenterSpecialEvents(selectedCenterId);
            if (res.success && Array.isArray(res.data)) {
                setEvents(res.data);
            } else {
                setEvents([]);
            }
        } catch (err) {
            console.error("Error loading center special events:", err);
            setEvents([]);
        } finally {
            setIsLoadingEvents(false);
        }
    }, [selectedCenterId]);

    useEffect(() => {
        if (isOpen && selectedCenterId) {
            loadEvents();
        }
    }, [isOpen, selectedCenterId, loadEvents]);

     
    const _handleOpenFormForDate = (dateString?: string, eventToEdit?: any) => {
        if (!isEditable) {
            toast.error("You are in read-only mode.");
            return;
        }

        if (eventToEdit) {
            setEditingEventId(eventToEdit.id);
            setEventTitle(eventToEdit.title || "");
            setEventCategory(eventToEdit.category || "Dental Mission");
            setEventDateStr(eventToEdit.eventDate || dateString || "");
            setEventTimeRange(eventToEdit.timeRange || "08:00 AM - 03:00 PM");
            setEventVenue(eventToEdit.venue || activeCenter.name || "");
            setEventMaxSlots(eventToEdit.maxSlots || 50);
            setEventDescription(eventToEdit.description || "");
            setPublishToAdvisories(eventToEdit.publishToAdvisories ?? true);
        } else {
            setEditingEventId(null);
            setEventTitle("");
            setEventCategory("Dental Mission");
            setEventDateStr(dateString || new Date().toISOString().split("T")[0]);
            setEventTimeRange("08:00 AM - 03:00 PM");
            setEventVenue(activeCenter.name || "Main Clinic Covered Court");
            setEventMaxSlots(50);
            setEventDescription("");
            setPublishToAdvisories(true);
        }
        setIsFormOpen(true);
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventTitle.trim()) {
            toast.error("Event title is required!");
            return;
        }
        if (!eventDateStr) {
            toast.error("Event date is required!");
            return;
        }

        setIsSaving(true);
        try {
            const res = await saveCenterSpecialEvent(selectedCenterId, {
                id: editingEventId || undefined,
                title: eventTitle.trim(),
                category: eventCategory,
                eventDate: eventDateStr,
                timeRange: eventTimeRange,
                venue: eventVenue,
                maxSlots: Number(eventMaxSlots) || 50,
                description: eventDescription,
                publishToAdvisories
            });

            if (res.success) {
                toast.success(editingEventId ? "Special medical event updated!" : "Special medical event published!");
                setIsFormOpen(false);
                onClose();
                router.push("/admin/rhu/announcements");
            } else {
                toast.error(res.error || "Failed to publish event.");
            }
        } catch (err) {
            console.error("Save event error:", err);
            toast.error("An error occurred while saving event.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!isEditable) return;
        if (!confirm("Are you sure you want to delete this special medical event?")) return;

        try {
            const res = await deleteCenterSpecialEvent(selectedCenterId, eventId);
            if (res.success) {
                toast.success("Medical event removed!");
                if (editingEventId === eventId) setIsFormOpen(false);
                loadEvents();
            } else {
                toast.error(res.error || "Failed to delete event.");
            }
        } catch (err) {
            console.error("Delete event error:", err);
            toast.error("Failed to delete event.");
        }
    };

    // Calendar Calculations
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const daysGrid = [];
    // Padding from previous month
    for (let i = 0; i < startingDayOfWeek; i++) {
        daysGrid.push(null);
    }
    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
        const monthFormatted = String(month + 1).padStart(2, "0");
        const dayFormatted = String(d).padStart(2, "0");
        daysGrid.push({
            dayNum: d,
            dateStr: `${year}-${monthFormatted}-${dayFormatted}`
        });
    }

    const prevMonth = () => {
        setCurrentMonthDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentMonthDate(new Date(year, month + 1, 1));
    };

    const monthYearLabel = currentMonthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    const todayStr = new Date().toISOString().split("T")[0];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[95vw] w-[95vw] lg:max-w-7xl max-h-[94vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#121622] border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl">
                {/* Header */}
                <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-black/20">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2.5">
                            <CalendarIcon className="w-6 h-6 text-rose-500 shrink-0" />
                            Special Medical Events Schedule Grid
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Publish center-specific medical missions, vaccination drives, & health events.
                        </DialogDescription>
                    </div>

                    <div className="flex items-center gap-3">
                        {healthCenters && healthCenters.length > 1 && (
                            <Select value={selectedCenterId} onValueChange={(val) => onSelectCenter && onSelectCenter(val)}>
                                <SelectTrigger className="h-10 text-xs font-bold bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rounded-xl min-w-[200px]">
                                    <SelectValue placeholder="Select Center..." />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#161820] text-slate-900 dark:text-white border-slate-200 dark:border-white/10">
                                    {healthCenters.map((c) => (
                                        <SelectItem key={c.id} value={c.id} className="text-xs font-bold">
                                            {c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </DialogHeader>

                {/* Main Body Layout */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Month Navigator Bar */}
                    <div className="flex items-center justify-between bg-slate-100/60 dark:bg-white/[0.03] p-3 rounded-2xl border border-slate-200/80 dark:border-white/5">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={prevMonth}
                                className="h-9 w-9 rounded-xl border-slate-200 dark:border-white/10"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={nextMonth}
                                className="h-9 w-9 rounded-xl border-slate-200 dark:border-white/10"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                            <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white ml-2">
                                {monthYearLabel}
                            </h2>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setCurrentMonthDate(new Date())}
                                className="h-9 px-3 text-xs font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
                            >
                                Today
                            </Button>
                            <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-3 py-1 font-bold text-[11px] rounded-xl">
                                {activeCenter.name} ({events.length} Events)
                            </Badge>
                        </div>
                    </div>

                    {/* Interactive 7-Column Calendar Grid */}
                    <div className="space-y-2">
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-2 text-center">
                            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d, i) => (
                                <div
                                    key={d}
                                    className={cn(
                                        "py-2 text-[10px] font-black uppercase tracking-widest rounded-xl",
                                        i === 0 || i === 6
                                            ? "text-rose-500 bg-rose-500/5 dark:bg-rose-500/10"
                                            : "text-slate-400 dark:text-slate-500 bg-slate-100/50 dark:bg-white/[0.02]"
                                    )}
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        {isLoadingEvents ? (
                            <div className="p-16 flex items-center justify-center text-slate-400 gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                                <span className="text-xs font-bold uppercase tracking-wider">Loading Schedule Grid...</span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-2">
                                {daysGrid.map((item, index) => {
                                    if (!item) {
                                        return (
                                            <div
                                                key={`empty-${index}`}
                                                className="min-h-[100px] rounded-2xl bg-slate-50/40 dark:bg-white/[0.01] border border-dashed border-slate-200/50 dark:border-white/5 opacity-40"
                                            />
                                        );
                                    }

                                    const dayEvents = events.filter((e) => e.eventDate === item.dateStr);
                                    const isToday = item.dateStr === todayStr;

                                    return (
                                        <div
                                            key={item.dateStr}
                                            className={cn(
                                                "min-h-[110px] p-2.5 rounded-2xl border transition-all flex flex-col justify-between group relative overflow-hidden",
                                                isToday
                                                    ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20"
                                                    : "bg-white dark:bg-[#161a26] border-slate-200/80 dark:border-white/10 hover:shadow-lg"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span
                                                    className={cn(
                                                        "text-xs font-black rounded-lg px-2 py-0.5 transition-all",
                                                        isToday
                                                            ? "bg-rose-600 text-white shadow-sm"
                                                            : "text-slate-700 dark:text-slate-300"
                                                    )}
                                                >
                                                    {item.dayNum}
                                                </span>

                                                {dayEvents.length > 0 && (
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                        {dayEvents.length} {dayEvents.length === 1 ? "Event" : "Events"}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Events Pills inside Cell */}
                                            <div className="space-y-1 my-1.5 flex-1">
                                                {dayEvents.slice(0, 2).map((evt) => {
                                                    const catMeta = CATEGORY_OPTIONS.find((c) => c.value === evt.category) || CATEGORY_OPTIONS[0];
                                                    const IconComp = catMeta.icon;

                                                    return (
                                                        <div
                                                            key={evt.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onClose();
                                                                router.push("/admin/rhu/announcements");
                                                            }}
                                                            className={cn(
                                                                "p-1.5 rounded-xl border text-[10px] font-bold leading-tight flex items-center justify-between gap-1 transition-transform hover:scale-[1.02] cursor-pointer",
                                                                catMeta.color
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-1 min-w-0">
                                                                <IconComp className="w-3 h-3 shrink-0" />
                                                                <span className="truncate">{evt.title}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {dayEvents.length > 2 && (
                                                    <p className="text-[9px] font-bold text-slate-400 text-center">
                                                        +{dayEvents.length - 2} more
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="p-4 px-6 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-black/20 flex justify-between items-center shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        View published special medical events and health advisories on the interactive schedule grid.
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="h-10 px-6 font-black uppercase text-xs rounded-xl border-slate-200 dark:border-white/10"
                    >
                        Close Grid
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Inner Modal / Form Dialog for Publishing Special Event */}
            {isFormOpen && (
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogContent className="max-w-lg bg-white dark:bg-[#161a26] border-slate-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-rose-500" />
                                {editingEventId ? "Edit Medical Event" : "Publish Special Medical Event"}
                            </DialogTitle>
                            <DialogDescription className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Target Health Center: <span className="text-rose-500 font-black">{activeCenter.name}</span>
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSaveEvent} className="space-y-4 py-2">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Event Title <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    placeholder="e.g. Free Dental Mission & Tooth Extraction Drive"
                                    value={eventTitle}
                                    onChange={(e) => setEventTitle(e.target.value)}
                                    className="h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Category / Type
                                    </Label>
                                    <Select value={eventCategory} onValueChange={setEventCategory}>
                                        <SelectTrigger className="h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10">
                                            {CATEGORY_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value} className="text-xs font-bold">
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Event Date <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        type="date"
                                        required
                                        value={eventDateStr}
                                        onChange={(e) => setEventDateStr(e.target.value)}
                                        className="h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Session Time Range
                                    </Label>
                                    <Input
                                        placeholder="e.g. 08:00 AM - 03:00 PM"
                                        value={eventTimeRange}
                                        onChange={(e) => setEventTimeRange(e.target.value)}
                                        className="h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                        Target Slot Capacity
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={eventMaxSlots}
                                        onChange={(e) => setEventMaxSlots(Number(e.target.value))}
                                        className="h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Venue / Specific Clinic Location
                                </Label>
                                <Input
                                    placeholder="e.g. {{BARANGAY_NAME}} Medical Clinic Covered Gymnasium"
                                    value={eventVenue}
                                    onChange={(e) => setEventVenue(e.target.value)}
                                    className="h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                                    Event Guidelines & Requirements
                                </Label>
                                <Textarea
                                    rows={3}
                                    placeholder="e.g. Please bring valid Barangay ID and PhilHealth ID. Fasting required for blood screening."
                                    value={eventDescription}
                                    onChange={(e) => setEventDescription(e.target.value)}
                                    className="bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                        <Megaphone className="w-3.5 h-3.5 text-rose-500" />
                                        Publish to RHU Advisories Feed
                                    </Label>
                                    <p className="text-[10px] text-slate-400">
                                        Automatically post a public health advisory notice for citizens.
                                    </p>
                                </div>
                                <Switch checked={publishToAdvisories} onCheckedChange={setPublishToAdvisories} />
                            </div>

                            <DialogFooter className="pt-2 gap-2">
                                {editingEventId && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() => handleDeleteEvent(editingEventId)}
                                        className="h-11 px-4 text-xs font-black uppercase rounded-xl gap-1.5"
                                    >
                                        <Trash2 className="w-4 h-4" /> Remove Event
                                    </Button>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSaving}
                                    className="h-11 flex-1 text-xs font-black uppercase tracking-wider rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-lg"
                                >
                                    {isSaving ? "Saving..." : editingEventId ? "Save Event Changes" : "Publish Medical Event"}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            )}
        </Dialog>
    );
}
