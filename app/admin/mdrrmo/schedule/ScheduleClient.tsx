"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import lguConfig from "@/config/lgu.config.json";
import { 
    Calendar, 
    Trash2, 
    Plus, 
    Pencil, 
    Clock, 
    MapPin, 
    UserCheck, 
    CheckCircle2, 
    Search, 
    ArrowLeft, 
    Loader2, 
    XCircle 
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
import { saveMDRRMOSchedule, updateMDRRMOScheduleStatus, deleteMDRRMOSchedule } from "../actions";

interface ScheduleClientProps {
    initialSchedules: any[];
    fleet: any[];
    drivers: any[];
    initialStatus?: string;
    isReadOnly?: boolean;
}

export default function ScheduleClient({
    initialSchedules = [],
    fleet = [],
    drivers = [],
    initialStatus = "ALL",
    isReadOnly = false
}: ScheduleClientProps) {
    let themeColor = "#ea580c";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {}

    const [schedules, setSchedules] = useState<any[]>(initialSchedules);
    const [statusFilter, setStatusFilter] = useState(initialStatus);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal State
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const [scheduleForm, setScheduleForm] = useState({
        title: "",
        dispatchType: "EMERGENCY_TRANSFER",
        priority: "HIGH",
        status: "SCHEDULED",
        patientName: "",
        patientContact: "",
        pickupLocation: "",
        destination: "",
        destinationHospital: "",
        scheduledDate: new Date().toISOString().split("T")[0],
        departureTime: "",
        returnTime: "",
        ambulanceId: "NONE",
        driverId: "NONE",
        medicStaff: "",
        notes: ""
    });

    const dispatchTypeLabels: Record<string, string> = {
        EMERGENCY_TRANSFER: "Emergency Hospital Transfer",
        PATIENT_CONVEYANCE: "Inter-Facility Patient Transport",
        ROUTINE_STANDBY: "Public Event Standby",
        DRILL_EXERCISE: "Disaster Simulation / Drill",
        VEHICLE_MAINTENANCE: "Scheduled Vehicle Maintenance"
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "CRITICAL":
                return "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30 animate-pulse";
            case "HIGH":
                return "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
            case "NORMAL":
                return "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30";
            case "LOW":
            default:
                return "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "IN_TRANSIT":
                return { label: "IN TRANSIT", className: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 animate-pulse" };
            case "DISPATCHED":
                return { label: "DISPATCHED", className: "text-indigo-700 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/30" };
            case "SCHEDULED":
                return { label: "SCHEDULED", className: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" };
            case "COMPLETED":
                return { label: "COMPLETED", className: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
            case "CANCELLED":
            default:
                return { label: "CANCELLED", className: "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/20" };
        }
    };

    const handleOpenAddSchedule = () => {
        setEditingSchedule(null);
        setScheduleForm({
            title: "",
            dispatchType: "EMERGENCY_TRANSFER",
            priority: "HIGH",
            status: "SCHEDULED",
            patientName: "",
            patientContact: "",
            pickupLocation: "",
            destination: "",
            destinationHospital: "",
            scheduledDate: new Date().toISOString().split("T")[0],
            departureTime: "",
            returnTime: "",
            ambulanceId: "NONE",
            driverId: "NONE",
            medicStaff: "",
            notes: ""
        });
        setIsScheduleModalOpen(true);
    };

    const handleOpenEditSchedule = (sched: any) => {
        setEditingSchedule(sched);
        setScheduleForm({
            title: sched.title || "",
            dispatchType: sched.dispatchType || "EMERGENCY_TRANSFER",
            priority: sched.priority || "HIGH",
            status: sched.status || "SCHEDULED",
            patientName: sched.patientName || "",
            patientContact: sched.patientContact || "",
            pickupLocation: sched.pickupLocation || "",
            destination: sched.destination || "",
            destinationHospital: sched.destinationHospital || "",
            scheduledDate: sched.scheduledDate ? new Date(sched.scheduledDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            departureTime: sched.departureTime || "",
            returnTime: sched.returnTime || "",
            ambulanceId: sched.ambulanceId || "NONE",
            driverId: sched.driverId || "NONE",
            medicStaff: sched.medicStaff || "",
            notes: sched.notes || ""
        });
        setIsScheduleModalOpen(true);
    };

    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scheduleForm.title.trim() || !scheduleForm.pickupLocation.trim() || !scheduleForm.destination.trim()) {
            toast.error("Please fill in the trip title, pickup location, and destination.");
            return;
        }

        setIsSaving(true);
        try {
            const res = await saveMDRRMOSchedule({
                id: editingSchedule?.id,
                ...scheduleForm,
                ambulanceId: scheduleForm.ambulanceId === "NONE" ? null : scheduleForm.ambulanceId,
                driverId: scheduleForm.driverId === "NONE" ? null : scheduleForm.driverId
            });

            if (res.success && res.schedule) {
                if (editingSchedule) {
                    setSchedules(prev => prev.map(s => s.id === res.schedule.id ? { ...s, ...res.schedule } : s));
                    toast.success("Dispatch schedule updated!");
                } else {
                    setSchedules(prev => [res.schedule, ...prev]);
                    toast.success("New ambulance dispatch scheduled!");
                }
                setIsScheduleModalOpen(false);
            } else {
                toast.error(res.error || "Failed to save schedule");
            }
        } catch {
            toast.error("Network error saving schedule");
        } finally {
            setIsSaving(false);
        }
    };

    const handleProgressStatus = async (scheduleId: string, currentStatus: string) => {
        let nextStatus = "DISPATCHED";
        if (currentStatus === "SCHEDULED") nextStatus = "DISPATCHED";
        else if (currentStatus === "DISPATCHED") nextStatus = "IN_TRANSIT";
        else if (currentStatus === "IN_TRANSIT") nextStatus = "COMPLETED";
        else return;

        try {
            const res = await updateMDRRMOScheduleStatus(scheduleId, nextStatus);
            if (res.success) {
                setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, status: nextStatus } : s));
                toast.success(`Trip status moved to ${nextStatus}`);
            } else {
                toast.error(res.error || "Failed to update trip status");
            }
        } catch {
            toast.error("Network error updating trip status");
        }
    };

    const handleCancelTrip = async (scheduleId: string) => {
        if (!confirm("Are you sure you want to cancel this scheduled dispatch?")) return;

        try {
            const res = await updateMDRRMOScheduleStatus(scheduleId, "CANCELLED");
            if (res.success) {
                setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, status: "CANCELLED" } : s));
                toast.success("Trip marked as CANCELLED.");
            }
        } catch {
            toast.error("Error cancelling trip");
        }
    };

    const handleDeleteTrip = async (scheduleId: string) => {
        if (!confirm("Permanently delete this dispatch log?")) return;

        try {
            const res = await deleteMDRRMOSchedule(scheduleId);
            if (res.success) {
                setSchedules(prev => prev.filter(s => s.id !== scheduleId));
                toast.success("Dispatch schedule deleted.");
            }
        } catch {
            toast.error("Error deleting schedule");
        }
    };

    // Filtered
    const filteredSchedules = schedules.filter(s => {
        const matchesStatus = statusFilter === "ALL" || s.status === statusFilter;
        const matchesQuery = 
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.patientName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.driver?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.ambulance?.unit || "").toLowerCase().includes(searchQuery.toLowerCase());

        return matchesStatus && matchesQuery;
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
                        <Calendar className="w-7 h-7 shrink-0" style={{ color: themeColor }} />
                        Ambulance Scheduling & Dispatch Calendar
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-2xl">
                        Schedule and coordinate inter-facility patient hospital transfers, emergency transport runs, driver dispatch assignments, and standby event logistics.
                    </p>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-3 relative z-10">
                        <Button
                            onClick={handleOpenAddSchedule}
                            className="h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColor,
                                boxShadow: `0 8px 20px -4px ${themeColor}50`
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Schedule Dispatch
                        </Button>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#161a24] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setStatusFilter("ALL")}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            statusFilter === "ALL"
                                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                        )}
                    >
                        All ({schedules.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("SCHEDULED")}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            statusFilter === "SCHEDULED"
                                ? "bg-amber-500 text-white"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                        )}
                    >
                        Scheduled ({schedules.filter(s => s.status === "SCHEDULED").length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("DISPATCHED")}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            statusFilter === "DISPATCHED"
                                ? "bg-blue-500 text-white"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
                        )}
                    >
                        Dispatched ({schedules.filter(s => s.status === "DISPATCHED" || s.status === "IN_TRANSIT").length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("COMPLETED")}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            statusFilter === "COMPLETED"
                                ? "bg-emerald-500 text-white"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        )}
                    >
                        Completed ({schedules.filter(s => s.status === "COMPLETED").length})
                    </button>
                </div>

                <div className="relative min-w-[240px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search title, patient, destination..."
                        className="h-10 pl-9 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold"
                    />
                </div>
            </div>

            {/* Schedules List */}
            {filteredSchedules.length === 0 ? (
                <Card className="rounded-[1.75rem] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] p-12 text-center text-slate-400 space-y-3">
                    <Calendar className="w-12 h-12 mx-auto opacity-30" />
                    <h3 className="text-sm font-black uppercase tracking-wider">No dispatches found</h3>
                    <p className="text-xs font-semibold max-w-sm mx-auto">
                        Plan and record ambulance runs, patient hospital transfers, or standby coverage.
                    </p>
                    {!isReadOnly && (
                        <Button onClick={handleOpenAddSchedule} variant="outline" className="rounded-xl font-bold text-xs uppercase">
                            + Schedule First Trip
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredSchedules.map((sched) => {
                        const statusBadge = getStatusBadge(sched.status);

                        return (
                            <Card
                                key={sched.id}
                                className="rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-white dark:bg-[#161a24] p-5 shadow-sm hover:shadow-md transition-all space-y-4"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                                {sched.title}
                                            </h4>
                                            <Badge variant="outline" className={cn("text-[8px] font-black uppercase px-2 py-0.5", getPriorityBadge(sched.priority))}>
                                                {sched.priority} Priority
                                            </Badge>
                                            <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2 py-0.5", statusBadge.className)}>
                                                {statusBadge.label}
                                            </Badge>
                                        </div>

                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                                            {dispatchTypeLabels[sched.dispatchType] || sched.dispatchType}
                                        </p>
                                    </div>

                                    {!isReadOnly && (
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditSchedule(sched)}
                                                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
                                                title="Edit Schedule"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            {sched.status !== "CANCELLED" && sched.status !== "COMPLETED" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCancelTrip(sched.id)}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                                                    title="Cancel Trip"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTrip(sched.id)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                title="Delete Schedule"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Routing & Logistics Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/70 dark:border-white/5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Routing</span>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                            <span className="truncate"><strong>From:</strong> {sched.pickupLocation}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            <span className="truncate"><strong>To:</strong> {sched.destination}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Timing & Crew</span>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                            <span>
                                                {new Date(sched.scheduledDate).toLocaleDateString()} ({sched.departureTime || "Immediate"})
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <UserCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                            <span className="truncate">
                                                Driver: <strong>{sched.driver?.name || "Unassigned"}</strong> &bull; {sched.ambulance?.unit || "No Vehicle"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black uppercase text-slate-400 block">Patient / Medical Escort</span>
                                        <div className="truncate">
                                            {sched.patientName ? (
                                                <span><strong>Patient:</strong> {sched.patientName} {sched.patientContact ? `(${sched.patientContact})` : ""}</span>
                                            ) : (
                                                <span className="italic text-slate-400">No Patient Info</span>
                                            )}
                                        </div>
                                        <div className="truncate">
                                            <span><strong>Escort:</strong> {sched.medicStaff || "EMT / Nurse"}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Status Pipeline Progression Actions */}
                                {!isReadOnly && sched.status !== "COMPLETED" && sched.status !== "CANCELLED" && (
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] font-bold text-slate-400">
                                            Workflow Status: <strong className="text-slate-700 dark:text-slate-200">{sched.status}</strong>
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {sched.status === "SCHEDULED" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleProgressStatus(sched.id, "SCHEDULED")}
                                                    className="h-8 text-xs font-black uppercase text-white rounded-xl"
                                                    style={{ backgroundColor: themeColor }}
                                                >
                                                    Mark as Dispatched \u2192
                                                </Button>
                                            )}
                                            {sched.status === "DISPATCHED" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleProgressStatus(sched.id, "DISPATCHED")}
                                                    className="h-8 text-xs font-black uppercase text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                                                >
                                                    Mark In Transit \u2192
                                                </Button>
                                            )}
                                            {sched.status === "IN_TRANSIT" && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleProgressStatus(sched.id, "IN_TRANSIT")}
                                                    className="h-8 text-xs font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                                                >
                                                    Complete Trip \u2713
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: ADD / EDIT DISPATCH SCHEDULE */}
            {/* ========================================================================= */}
            <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
                <DialogContent className="sm:max-w-[620px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <Calendar className="w-5 h-5" style={{ color: themeColor }} />
                            {editingSchedule ? "Edit Dispatch Schedule" : "Schedule Ambulance Dispatch"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Book patient transfers, emergency transport runs, and assign drivers & crew.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveSchedule} className="space-y-4 py-2 w-full min-w-0 max-w-full overflow-hidden">
                        {/* Title & Dispatch Type */}
                        <div className="space-y-1.5 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Dispatch Title / Mission <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={scheduleForm.title}
                                onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                                placeholder={`e.g. Emergency Patient Transfer to ${lguConfig.healthcare.referralHospital}`}
                                className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Dispatch Mission Type
                                </Label>
                                <Select
                                    value={scheduleForm.dispatchType}
                                    onValueChange={(val) => setScheduleForm({ ...scheduleForm, dispatchType: val })}
                                >
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs truncate">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white max-w-[340px]">
                                        {Object.entries(dispatchTypeLabels).map(([val, label]) => (
                                            <SelectItem key={val} value={val} className="text-xs font-bold">{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Urgency & Priority
                                </Label>
                                <Select
                                    value={scheduleForm.priority}
                                    onValueChange={(val) => setScheduleForm({ ...scheduleForm, priority: val })}
                                >
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs truncate">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white max-w-[300px]">
                                        <SelectItem value="CRITICAL" className="text-xs font-bold text-rose-600">CRITICAL (Emergency)</SelectItem>
                                        <SelectItem value="HIGH" className="text-xs font-bold text-amber-600">HIGH Priority</SelectItem>
                                        <SelectItem value="NORMAL" className="text-xs font-bold text-blue-600">NORMAL Priority</SelectItem>
                                        <SelectItem value="LOW" className="text-xs font-bold text-slate-500">LOW (Routine)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Ambulance & Driver Selector */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Assigned Ambulance Unit
                                </Label>
                                <Select
                                    value={scheduleForm.ambulanceId}
                                    onValueChange={(val) => setScheduleForm({ ...scheduleForm, ambulanceId: val })}
                                >
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs truncate">
                                        <SelectValue placeholder="Select vehicle..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white max-w-[340px]">
                                        <SelectItem value="NONE" className="text-xs font-bold text-slate-400">No Vehicle Assigned</SelectItem>
                                        {fleet.map(v => (
                                            <SelectItem key={v.id} value={v.id} className="text-xs font-bold">
                                                {v.unit} {v.plateNumber ? `(${v.plateNumber})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Assigned Driver
                                </Label>
                                <Select
                                    value={scheduleForm.driverId}
                                    onValueChange={(val) => setScheduleForm({ ...scheduleForm, driverId: val })}
                                >
                                    <SelectTrigger className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs truncate">
                                        <SelectValue placeholder="Select driver..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white max-w-[340px]">
                                        <SelectItem value="NONE" className="text-xs font-bold text-slate-400">No Driver Assigned</SelectItem>
                                        {drivers.map(d => (
                                            <SelectItem key={d.id} value={d.id} className="text-xs font-bold">
                                                {d.name} ({d.status})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Routing Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Pickup Location <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    value={scheduleForm.pickupLocation}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, pickupLocation: e.target.value })}
                                    placeholder="e.g. Municipal RHU / Barangay {{BARANGAY_NAME}}"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Destination Hospital / Facility <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    value={scheduleForm.destination}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, destination: e.target.value })}
                                    placeholder="e.g. {{PROVINCE_NAME}} Provincial Hospital"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>
                        </div>

                        {/* Timing */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full min-w-0">
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Date <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    type="date"
                                    required
                                    value={scheduleForm.scheduledDate}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduledDate: e.target.value })}
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Departure Time
                                </Label>
                                <Input
                                    value={scheduleForm.departureTime}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, departureTime: e.target.value })}
                                    placeholder="e.g. 08:30 AM"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Estimated Return
                                </Label>
                                <Input
                                    value={scheduleForm.returnTime}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, returnTime: e.target.value })}
                                    placeholder="e.g. 12:00 PM"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>
                        </div>

                        {/* Patient & Crew Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Patient Name (Optional)
                                </Label>
                                <Input
                                    value={scheduleForm.patientName}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, patientName: e.target.value })}
                                    placeholder="e.g. Juan Santos"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Patient / Companion Phone
                                </Label>
                                <Input
                                    value={scheduleForm.patientContact}
                                    onChange={(e) => setScheduleForm({ ...scheduleForm, patientContact: e.target.value })}
                                    placeholder="e.g. 09XX-XXX-XXXX"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Medical Escort / EMT Personnel
                            </Label>
                            <Input
                                value={scheduleForm.medicStaff}
                                onChange={(e) => setScheduleForm({ ...scheduleForm, medicStaff: e.target.value })}
                                placeholder="e.g. Nurse Maria, EMT Gary"
                                className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <div className="space-y-1.5 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Mission Notes / Medical Instructions
                            </Label>
                            <Textarea
                                value={scheduleForm.notes}
                                onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                                placeholder="e.g. Patient requires oxygen support; transfer coordinated with Dr. Santos at PPH ER."
                                className="w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                rows={2}
                            />
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsScheduleModalOpen(false)}
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
                                {editingSchedule ? "Save Changes" : "Confirm & Schedule"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
