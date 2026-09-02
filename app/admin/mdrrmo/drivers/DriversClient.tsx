"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
    UserCheck, 
    Trash2, 
    Plus, 
    Pencil, 
    Phone, 
    Loader2, 
    Car, 
    Clock, 
    ArrowLeft, 
    CheckCircle2, 
    Search, 
    Award 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { saveMDRRMODriver, updateDriverDutyStatus, deleteMDRRMODriver } from "../actions";

interface DriversClientProps {
    initialDrivers: any[];
    fleet: any[];
    isReadOnly?: boolean;
}

export default function DriversClient({
    initialDrivers = [],
    fleet = [],
    isReadOnly = false
}: DriversClientProps) {
    let themeColor = "#ea580c";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {}

    const [drivers, setDrivers] = useState<any[]>(initialDrivers);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Modal State
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<any | null>(null);
    const [isSavingDriver, setIsSavingDriver] = useState(false);
    const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    // Dynamic Shift Schedule Builder State
    const [shiftType, setShiftType] = useState<string>("DAY");
    const [shiftStartTime, setShiftStartTime] = useState<string>("06:00");
    const [shiftEndTime, setShiftEndTime] = useState<string>("14:00");
    const [shiftDays, setShiftDays] = useState<string>("Mon - Fri (Weekdays)");
    const [isCustomShiftText, setIsCustomShiftText] = useState<boolean>(false);

    const [driverForm, setDriverForm] = useState({
        name: "",
        contactNumber: "",
        licenseNumber: "",
        licenseExpiry: "",
        status: "STANDBY",
        dutyShift: "Day Shift (6:00 AM - 2:00 PM) • Mon - Fri (Weekdays)",
        emergencyContact: "",
        notes: "",
        assignedAmbulanceId: "NONE"
    });

    const formatTime12 = (t: string) => {
        if (!t) return "";
        const parts = t.split(":");
        if (parts.length < 2) return t;
        const h = parseInt(parts[0], 10);
        const m = parts[1];
        if (isNaN(h)) return t;
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h % 12 === 0 ? 12 : h % 12;
        return `${h12}:${m} ${ampm}`;
    };

    const generateShiftString = (type: string, start: string, end: string, days: string) => {
        if (type === "24H") {
            return `24-Hour Duty Rotation (${days})`;
        }
        if (type === "ON_CALL") {
            return `24/7 On-Call Standby (${days})`;
        }
        const label = type === "AFTERNOON" ? "Afternoon Shift" : type === "NIGHT" ? "Night Shift" : type === "CUSTOM" ? "Custom Shift" : "Day Shift";
        const timeRange = start && end ? `(${formatTime12(start)} - ${formatTime12(end)})` : "";
        return `${label} ${timeRange} • ${days}`.trim();
    };

    const applyShiftPreset = (preset: { id: string; label: string; start: string; end: string }) => {
        setShiftType(preset.id);
        setShiftStartTime(preset.start);
        setShiftEndTime(preset.end);
        const str = generateShiftString(preset.id, preset.start, preset.end, shiftDays);
        setDriverForm(prev => ({ ...prev, dutyShift: str }));
    };

    const updateShiftTimes = (start: string, end: string, days: string, type = shiftType) => {
        setShiftStartTime(start);
        setShiftEndTime(end);
        setShiftDays(days);
        const str = generateShiftString(type, start, end, days);
        setDriverForm(prev => ({ ...prev, dutyShift: str }));
    };

    const getDutyStatusBadge = (status: string) => {
        switch (status) {
            case "ON_DUTY":
                return { label: "ON DUTY", className: "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30" };
            case "ON_TRIP":
                return { label: "ON TRIP", className: "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 animate-pulse" };
            case "STANDBY":
                return { label: "STANDBY", className: "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30" };
            case "ON_LEAVE":
                return { label: "ON LEAVE", className: "text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30" };
            case "OFF_DUTY":
            default:
                return { label: "OFF DUTY", className: "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20" };
        }
    };

    const formatSafeDateForInput = (d: any) => {
        if (!d) return "";
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return "";
            return date.toISOString().split("T")[0];
        } catch {
            return "";
        }
    };

    const handleOpenAddDriver = () => {
        setEditingDriver(null);
        setSelectedPhotoFile(null);
        setPhotoPreview(null);
        setIsCustomShiftText(false);
        setShiftType("DAY");
        setShiftStartTime("06:00");
        setShiftEndTime("14:00");
        setShiftDays("Mon - Fri (Weekdays)");
        setDriverForm({
            name: "",
            contactNumber: "",
            licenseNumber: "",
            licenseExpiry: "",
            status: "STANDBY",
            dutyShift: "Day Shift (6:00 AM - 2:00 PM) • Mon - Fri (Weekdays)",
            emergencyContact: "",
            notes: "",
            assignedAmbulanceId: "NONE"
        });
        setIsDriverModalOpen(true);
    };

    const handleOpenEditDriver = (driver: any) => {
        try {
            setEditingDriver(driver);
            setSelectedPhotoFile(null);
            setPhotoPreview(driver.photoUrl || null);
            setIsCustomShiftText(true);
            setDriverForm({
                name: driver.name || "",
                contactNumber: driver.contactNumber || "",
                licenseNumber: driver.licenseNumber || "",
                licenseExpiry: formatSafeDateForInput(driver.licenseExpiry),
                status: driver.status || "STANDBY",
                dutyShift: driver.dutyShift || "Day Shift (6:00 AM - 2:00 PM)",
                emergencyContact: driver.emergencyContact || "",
                notes: driver.notes || "",
                assignedAmbulanceId: driver.assignedAmbulanceId || "NONE"
            });
            setIsDriverModalOpen(true);
        } catch (err) {
            console.error("Error opening edit driver modal:", err);
            toast.error("Failed to open edit modal.");
        }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!driverForm.name.trim() || !driverForm.contactNumber.trim() || !driverForm.licenseNumber.trim()) {
            toast.error("Please provide Driver Name, Contact Number, and License Number.");
            return;
        }

        setIsSavingDriver(true);
        try {
            const formData = new FormData();
            if (editingDriver?.id) formData.append("id", editingDriver.id);
            formData.append("name", driverForm.name);
            formData.append("contactNumber", driverForm.contactNumber);
            formData.append("licenseNumber", driverForm.licenseNumber);
            if (driverForm.licenseExpiry) formData.append("licenseExpiry", driverForm.licenseExpiry);
            formData.append("status", driverForm.status);
            formData.append("dutyShift", driverForm.dutyShift);
            if (driverForm.emergencyContact) formData.append("emergencyContact", driverForm.emergencyContact);
            if (driverForm.notes) formData.append("notes", driverForm.notes);
            formData.append("assignedAmbulanceId", driverForm.assignedAmbulanceId);
            if (selectedPhotoFile) formData.append("photoFile", selectedPhotoFile);

            const res = await saveMDRRMODriver(formData);
            if (res.success && res.driver) {
                if (editingDriver) {
                    setDrivers(prev => prev.map(d => d.id === res.driver.id ? { ...d, ...res.driver } : d));
                    toast.success("Driver details updated successfully!");
                } else {
                    setDrivers(prev => [...prev, res.driver]);
                    toast.success("New driver registered to MDRRMO roster!");
                }
                setIsDriverModalOpen(false);
            } else {
                toast.error(res.error || "Failed to save driver");
            }
        } catch {
            toast.error("Network error saving driver profile");
        } finally {
            setIsSavingDriver(false);
        }
    };

    const handleQuickDutyToggle = async (driverId: string, nextStatus: string) => {
        try {
            const res = await updateDriverDutyStatus(driverId, nextStatus);
            if (res.success) {
                setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: nextStatus } : d));
                toast.success(`Updated duty status to ${nextStatus.replace("_", " ")}`);
            } else {
                toast.error(res.error || "Failed to update duty status");
            }
        } catch {
            toast.error("Network error updating status");
        }
    };

    const handleDeleteDriver = async (driverId: string, name: string) => {
        if (!confirm(`Are you sure you want to remove driver ${name} from the roster?`)) return;

        try {
            const res = await deleteMDRRMODriver(driverId);
            if (res.success) {
                setDrivers(prev => prev.filter(d => d.id !== driverId));
                toast.success(`${name} removed from roster.`);
            } else {
                toast.error(res.error || "Failed to delete driver");
            }
        } catch {
            toast.error("Network error deleting driver");
        }
    };

    // Filtered Drivers
    const filteredDrivers = drivers.filter(d => {
        const matchesQuery = 
            d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.contactNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (d.assignedAmbulance?.unit || "").toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "ALL" || d.status === statusFilter;
        return matchesQuery && matchesStatus;
    });

    const onDutyCount = drivers.filter(d => d.status === "ON_DUTY" || d.status === "ON_TRIP").length;
    const standbyCount = drivers.filter(d => d.status === "STANDBY").length;
    const offDutyCount = drivers.filter(d => d.status === "OFF_DUTY" || d.status === "ON_LEAVE").length;

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
                        <UserCheck className="w-7 h-7 shrink-0" style={{ color: themeColor }} />
                        Ambulance Drivers & Duty Monitoring
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-2xl">
                        Monitor active driver shifts, manage ambulance assignments, track professional driver license expirations, and oversee 24/7 emergency response readiness.
                    </p>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-3 relative z-10">
                        <Button
                            onClick={handleOpenAddDriver}
                            className="h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColor,
                                boxShadow: `0 8px 20px -4px ${themeColor}50`
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Driver
                        </Button>
                    </div>
                )}
            </div>

            {/* Quick Counters & Filters */}
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
                        All ({drivers.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("ON_DUTY")}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            statusFilter === "ON_DUTY"
                                ? "bg-emerald-500 text-white"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                        )}
                    >
                        On Duty ({onDutyCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("STANDBY")}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            statusFilter === "STANDBY"
                                ? "bg-amber-500 text-white"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                        )}
                    >
                        Standby ({standbyCount})
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter("OFF_DUTY")}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                            statusFilter === "OFF_DUTY"
                                ? "bg-slate-500 text-white"
                                : "bg-slate-500/10 text-slate-600 dark:text-slate-400 hover:bg-slate-500/20"
                        )}
                    >
                        Off Duty ({offDutyCount})
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search name, license, plate..."
                            className="h-10 pl-9 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10"
                        />
                    </div>
                </div>
            </div>

            {/* Drivers Grid */}
            {filteredDrivers.length === 0 ? (
                <Card className="rounded-[1.75rem] border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] p-12 text-center text-slate-400 space-y-3">
                    <UserCheck className="w-12 h-12 mx-auto opacity-30" />
                    <h3 className="text-sm font-black uppercase tracking-wider">No drivers found matching your filter</h3>
                    {!isReadOnly && (
                        <Button onClick={handleOpenAddDriver} variant="outline" className="rounded-xl font-bold text-xs uppercase">
                            + Add New Driver
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDrivers.map((driver) => {
                        const badge = getDutyStatusBadge(driver.status);
                        const assignedVeh = fleet.find(f => f.id === driver.assignedAmbulanceId);
                        const isLicenseExpired = driver.licenseExpiry && new Date(driver.licenseExpiry) < new Date();

                        return (
                            <div
                                key={driver.id}
                                className="p-5 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-white dark:bg-[#161a24] hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group"
                            >
                                <div className="space-y-3.5">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            {driver.photoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img 
                                                    src={driver.photoUrl} 
                                                    alt={driver.name}
                                                    className="w-12 h-12 rounded-2xl object-cover border-2 shadow-sm shrink-0"
                                                    style={{ borderColor: themeColor }}
                                                />
                                            ) : (
                                                <div 
                                                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black uppercase text-sm border shadow-inner shrink-0"
                                                    style={{
                                                        backgroundColor: `${themeColor}15`,
                                                        borderColor: `${themeColor}30`,
                                                        color: themeColor
                                                    }}
                                                >
                                                    {driver.name ? driver.name.substring(0, 2) : "DR"}
                                                </div>
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                    {driver.name}
                                                </h4>
                                                <span className={cn(
                                                    "inline-block mt-0.5 text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                                    badge.className
                                                )}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        </div>

                                        {!isReadOnly && (
                                            <div className="flex items-center gap-1.5 shrink-0 z-10">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleOpenEditDriver(driver);
                                                    }}
                                                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:text-white hover:bg-rose-600 dark:hover:bg-rose-600 transition-all cursor-pointer shadow-xs"
                                                    title="Edit Driver Profile"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteDriver(driver.id, driver.name);
                                                    }}
                                                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-400 hover:text-white hover:bg-rose-600 transition-all cursor-pointer shadow-xs"
                                                    title="Remove Driver"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Rows */}
                                    <div className="space-y-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/70 dark:border-white/5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                <Phone className="w-3 h-3 text-emerald-500" /> Phone:
                                            </span>
                                            <a href={`tel:${driver.contactNumber}`} className="font-bold text-slate-900 dark:text-white hover:underline font-mono">
                                                {driver.contactNumber}
                                            </a>
                                        </div>

                                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/70 dark:border-white/5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3 text-blue-500" /> Shift:
                                            </span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                                                {driver.dutyShift || "Day Shift"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/70 dark:border-white/5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                <Award className="w-3 h-3 text-purple-500" /> License:
                                            </span>
                                            <span className={cn(
                                                "font-mono font-bold truncate",
                                                isLicenseExpired ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200"
                                            )}>
                                                {driver.licenseNumber} {isLicenseExpired && "(EXPIRED)"}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200/70 dark:border-white/5">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                                                <Car className="w-3 h-3 text-amber-500" /> Assigned:
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white truncate">
                                                {assignedVeh ? assignedVeh.unit : "Unassigned"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Duty Status Action Buttons */}
                                {!isReadOnly && (
                                    <div className="pt-3 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between gap-1.5">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleQuickDutyToggle(driver.id, "ON_DUTY")}
                                            className={cn(
                                                "flex-1 h-8 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                                driver.status === "ON_DUTY"
                                                    ? "bg-emerald-500 text-white border-emerald-500"
                                                    : "hover:bg-emerald-500/10 text-emerald-600"
                                            )}
                                        >
                                            On Duty
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleQuickDutyToggle(driver.id, "STANDBY")}
                                            className={cn(
                                                "flex-1 h-8 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                                driver.status === "STANDBY"
                                                    ? "bg-amber-500 text-white border-amber-500"
                                                    : "hover:bg-amber-500/10 text-amber-600"
                                            )}
                                        >
                                            Standby
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleQuickDutyToggle(driver.id, "OFF_DUTY")}
                                            className={cn(
                                                "flex-1 h-8 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
                                                driver.status === "OFF_DUTY"
                                                    ? "bg-slate-500 text-white border-slate-500"
                                                    : "hover:bg-slate-500/10 text-slate-500"
                                            )}
                                        >
                                            Off Duty
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL: ADD / EDIT DRIVER */}
            {/* ========================================================================= */}
            <Dialog open={isDriverModalOpen} onOpenChange={setIsDriverModalOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader className="space-y-1">
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <UserCheck className="w-5 h-5 shrink-0" style={{ color: themeColor }} />
                            {editingDriver ? "Edit Ambulance Driver" : "Register Ambulance Driver"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Roster profile, professional license details, vehicle assignment, and shift schedule.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveDriver} className="space-y-4 py-2 w-full min-w-0 max-w-full overflow-hidden">
                        {/* Photo Preview & Upload */}
                        <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full min-w-0 overflow-hidden">
                            {photoPreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={photoPreview} alt="Preview" className="w-14 h-14 rounded-2xl object-cover border shadow-sm shrink-0" />
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                                    No Photo
                                </div>
                            )}
                            <div className="space-y-1 flex-1 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                                    Driver ID Photo (Optional)
                                </Label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-slate-200 dark:file:bg-white/10 hover:file:bg-slate-300 cursor-pointer w-full max-w-full truncate"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Full Driver Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    value={driverForm.name}
                                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                                    placeholder="e.g. Juan Dela Cruz"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Contact / Mobile Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    value={driverForm.contactNumber}
                                    onChange={(e) => setDriverForm({ ...driverForm, contactNumber: e.target.value })}
                                    placeholder="e.g. 0917-123-4567"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Driver License Number <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    required
                                    value={driverForm.licenseNumber}
                                    onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                                    placeholder="e.g. N01-12-345678"
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs uppercase font-mono"
                                />
                            </div>

                            <div className="space-y-1.5 min-w-0">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    License Expiry Date
                                </Label>
                                <Input
                                    type="date"
                                    value={driverForm.licenseExpiry}
                                    onChange={(e) => setDriverForm({ ...driverForm, licenseExpiry: e.target.value })}
                                    className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>
                        </div>

                        {/* Dynamic Duty Shift & Schedule Builder */}
                        <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full min-w-0">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" style={{ color: themeColor }} />
                                    Duty Shift & Exact Schedule
                                </Label>
                                <button
                                    type="button"
                                    onClick={() => setIsCustomShiftText(!isCustomShiftText)}
                                    className="text-[10px] font-bold transition-colors hover:underline cursor-pointer"
                                    style={{ color: themeColor }}
                                >
                                    {isCustomShiftText ? "← Use Visual Builder" : "✎ Freeform Custom Text"}
                                </button>
                            </div>

                            {isCustomShiftText ? (
                                <div className="space-y-1">
                                    <Input
                                        value={driverForm.dutyShift}
                                        onChange={(e) => setDriverForm({ ...driverForm, dutyShift: e.target.value })}
                                        placeholder="e.g. Day Shift (7:00 AM - 3:00 PM) • Mon - Fri"
                                        className="h-10 w-full min-w-0 rounded-xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 font-bold text-xs"
                                    />
                                    <span className="text-[9px] font-semibold text-slate-400 block">
                                        Type any customized rotation notes, weekly schedule, or on-call hours.
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {/* Preset Shift Pills */}
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 w-full">
                                        {[
                                            { id: "DAY", label: "Day (6AM-2PM)", start: "06:00", end: "14:00" },
                                            { id: "AFTERNOON", label: "Afternoon (2-10)", start: "14:00", end: "22:00" },
                                            { id: "NIGHT", label: "Night (10PM-6AM)", start: "22:00", end: "06:00" },
                                            { id: "24H", label: "24-Hour Duty", start: "08:00", end: "08:00" },
                                            { id: "ON_CALL", label: "24/7 On-Call", start: "", end: "" },
                                        ].map(p => {
                                            const isActive = shiftType === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => applyShiftPreset(p)}
                                                    className={`py-1.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border text-center ${
                                                        isActive
                                                            ? "bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs scale-102"
                                                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20"
                                                    }`}
                                                    style={isActive ? { borderColor: themeColor, color: themeColor } : {}}
                                                >
                                                    {p.label}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Exact Time Pickers & Working Days */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full min-w-0">
                                        <div className="space-y-1 min-w-0">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Start Time</span>
                                            <Input
                                                type="time"
                                                disabled={shiftType === "ON_CALL" || shiftType === "24H"}
                                                value={shiftStartTime}
                                                onChange={(e) => updateShiftTimes(e.target.value, shiftEndTime, shiftDays)}
                                                className="h-9 w-full min-w-0 rounded-lg bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 text-xs font-mono font-bold"
                                            />
                                        </div>

                                        <div className="space-y-1 min-w-0">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">End Time</span>
                                            <Input
                                                type="time"
                                                disabled={shiftType === "ON_CALL" || shiftType === "24H"}
                                                value={shiftEndTime}
                                                onChange={(e) => updateShiftTimes(shiftStartTime, e.target.value, shiftDays)}
                                                className="h-9 w-full min-w-0 rounded-lg bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 text-xs font-mono font-bold"
                                            />
                                        </div>

                                        <div className="space-y-1 min-w-0">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Duty Days</span>
                                            <Select
                                                value={shiftDays}
                                                onValueChange={(val) => updateShiftTimes(shiftStartTime, shiftEndTime, val)}
                                            >
                                                <SelectTrigger className="h-9 w-full min-w-0 rounded-lg bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 text-xs font-bold truncate">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white max-w-[280px]">
                                                    <SelectItem value="Mon - Fri (Weekdays)" className="text-xs font-bold">Mon - Fri (Weekdays)</SelectItem>
                                                    <SelectItem value="Daily (Mon - Sun)" className="text-xs font-bold">Daily (Mon - Sun)</SelectItem>
                                                    <SelectItem value="Sat - Sun (Weekends)" className="text-xs font-bold">Sat - Sun (Weekends)</SelectItem>
                                                    <SelectItem value="4-Day On / 2-Day Off" className="text-xs font-bold">4-Day On / 2-Day Off</SelectItem>
                                                    <SelectItem value="24/7 Emergency Rotation" className="text-xs font-bold">24/7 Emergency Rotation</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    {/* Editable Live Schedule Preview */}
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 pt-1 w-full min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 shrink-0">Exact Schedule:</span>
                                        <Input
                                            value={driverForm.dutyShift}
                                            onChange={(e) => setDriverForm({ ...driverForm, dutyShift: e.target.value })}
                                            className="h-8 w-full min-w-0 rounded-lg bg-white dark:bg-[#161820] border border-dashed border-slate-300 dark:border-white/20 text-xs font-bold text-slate-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Assigned Ambulance Unit
                            </Label>
                            <Select
                                value={driverForm.assignedAmbulanceId || "NONE"}
                                onValueChange={(val) => setDriverForm({ ...driverForm, assignedAmbulanceId: val })}
                            >
                                <SelectTrigger className="h-11 w-full rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                    <SelectValue placeholder="Assign vehicle..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                    <SelectItem value="NONE" className="text-xs font-bold text-slate-400">
                                        No Vehicle Assigned (Standby / Floating)
                                    </SelectItem>
                                    {fleet.map(v => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs font-bold">
                                            {v.unit} {v.plateNumber ? `(${v.plateNumber})` : ""} — {v.status || "STANDBY"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5 min-w-0">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Emergency Contact Person & Phone
                            </Label>
                            <Input
                                value={driverForm.emergencyContact}
                                onChange={(e) => setDriverForm({ ...driverForm, emergencyContact: e.target.value })}
                                placeholder="e.g. Maria Dela Cruz (Spouse) - 0918-987-6543"
                                className="h-11 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsDriverModalOpen(false)}
                                className="rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingDriver}
                                className="rounded-xl font-black text-xs uppercase text-white"
                                style={{ backgroundColor: themeColor }}
                            >
                                {isSavingDriver ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                                {editingDriver ? "Save Driver Profile" : "Register Driver"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
