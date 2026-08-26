"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
    Truck, 
    Trash2, 
    Plus, 
    Pencil, 
    PhoneCall, 
    User, 
    MapPin, 
    Loader2, 
    Radio, 
    Activity, 
    Siren,
    Phone,
    Car
} from "lucide-react";
import { getAmbulanceSettings, updateAmbulanceSettings } from "@/app/user/services/rural-health-unit/actions";
import { getRHUHealthCenters } from "@/app/admin/rhu/centers/actions";
import { useSystemTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AmbulanceSettingsClientProps {
    isReadOnly?: boolean;
    healthCenters?: any[];
    matchedCenterId?: string | null;
}

export default function AmbulanceSettingsClient({ isReadOnly = false, healthCenters = [], matchedCenterId = null }: AmbulanceSettingsClientProps) {
    let themeColor = "var(--primary-theme, #2563eb)";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {
        // fallback
    }

    const [fleet, setFleet] = useState<any[]>([]);
    const [hotlines, setHotlines] = useState<any[]>([]);
    const [centersList, setCentersList] = useState<any[]>(healthCenters || []);
    const [isLoading, setIsLoading] = useState(true);
    const [isSavingModal, setIsSavingModal] = useState(false);

    // Ambulance Modal State
    const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
    const [editingAmbulanceIdx, setEditingAmbulanceIdx] = useState<number | null>(null);
    const [ambulanceForm, setAmbulanceForm] = useState({
        unit: "",
        plateNumber: "",
        station: "",
        status: "ACTIVE"
    });

    // Hotline Modal State
    const [isHotlineModalOpen, setIsHotlineModalOpen] = useState(false);
    const [editingHotlineIdx, setEditingHotlineIdx] = useState<number | null>(null);
    const [hotlineForm, setHotlineForm] = useState({
        name: "",
        number: "",
        status: "ACTIVE"
    });

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            getAmbulanceSettings(),
            getRHUHealthCenters()
        ]).then(([ambRes, centersRes]) => {
            if (ambRes.success) {
                let fetchedFleet = ambRes.fleet || [];
                let fetchedHotlines = ambRes.hotlines || [];
                if (matchedCenterId) {
                    fetchedFleet = fetchedFleet.filter((v: any) => v.assigned_center_id === matchedCenterId);
                    fetchedHotlines = fetchedHotlines.filter((h: any) => h.assigned_center_id === matchedCenterId);
                }
                setFleet(fetchedFleet);
                setHotlines(fetchedHotlines);
            } else {
                toast.error(ambRes.error || "Failed to load ambulance settings");
            }
            if (centersRes.success && centersRes.data) {
                setCentersList(centersRes.data);
            }
        }).finally(() => {
            setIsLoading(false);
        });
    }, [matchedCenterId]);

    // Status styling helper
    const getStatusColor = (status: string) => {
        if (status === "ACTIVE" || status === "STANDBY" || status === "ON DUTY" || status === "MAINTENANCE") {
            return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
        } else {
            return "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
    };

    const getStatusDotColor = (status: string) => {
        if (status === "ACTIVE" || status === "STANDBY" || status === "ON DUTY" || status === "MAINTENANCE") return "bg-emerald-500 shadow-emerald-500/50";
        return "bg-slate-500 shadow-slate-500/50";
    };

    // Hotline category icon & badge styling helper
    const getHotlineMeta = (nameStr: string) => {
        const name = (nameStr || "").toLowerCase();
        if (name.includes("mdrrmo") || name.includes("disaster") || name.includes("emergency")) {
            return {
                icon: Siren,
                color: "text-rose-500 bg-rose-500/10 border-rose-500/20",
                badgeColor: "text-rose-500 bg-rose-500/10",
                accentBorder: "hover:border-rose-500/40 hover:bg-rose-500/5 dark:hover:bg-rose-500/10"
            };
        }
        if (name.includes("rhu") || name.includes("health") || name.includes("hospital")) {
            return {
                icon: PhoneCall,
                color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                badgeColor: "text-emerald-500 bg-emerald-500/10",
                accentBorder: "hover:border-emerald-500/40 hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10"
            };
        }
        return {
            icon: User,
            color: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
            badgeColor: "text-indigo-500 bg-indigo-500/10",
            accentBorder: "hover:border-indigo-500/40 hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10"
        };
    };

    // Open Add Ambulance Modal
    const handleOpenAddAmbulance = () => {
        setEditingAmbulanceIdx(null);
        setAmbulanceForm({
            unit: `Ambulance Unit ${fleet.length + 1}`,
            plateNumber: "",
            station: centersList[0]?.name || "",
            status: "ACTIVE"
        });
        setIsAmbulanceModalOpen(true);
    };

    // Open Edit Ambulance Modal
    const handleOpenEditAmbulance = (idx: number) => {
        const item = fleet[idx];
        setEditingAmbulanceIdx(idx);
        setAmbulanceForm({
            unit: item.unit || "",
            plateNumber: item.plateNumber || "",
            station: item.station || centersList[0]?.name || "",
            status: item.status || "ACTIVE"
        });
        setIsAmbulanceModalOpen(true);
    };

    // Save Ambulance from Modal
    const handleSaveAmbulance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ambulanceForm.unit.trim()) {
            toast.error("Please enter a unit name.");
            return;
        }

        if (matchedCenterId && editingAmbulanceIdx !== null && fleet[editingAmbulanceIdx]?.assigned_center_id !== matchedCenterId) {
            toast.error("Failsafe: You cannot edit an asset belonging to another facility.");
            return;
        }

        setIsSavingModal(true);
        try {
            const statusColor = getStatusColor(ambulanceForm.status);
            const updatedItem = {
                ...ambulanceForm,
                unit: ambulanceForm.unit.trim(),
                plateNumber: ambulanceForm.plateNumber.trim() || "N/A",
                station: ambulanceForm.station || "Main Station",
                statusColor,
                assigned_center_id: matchedCenterId
            };

            let updatedFleet: any[];
            if (editingAmbulanceIdx !== null) {
                updatedFleet = [...fleet];
                updatedFleet[editingAmbulanceIdx] = updatedItem;
            } else {
                updatedFleet = [...fleet, updatedItem];
            }

            const res = await updateAmbulanceSettings(updatedFleet, hotlines);
            if (res.success) {
                setFleet(updatedFleet);
                setIsAmbulanceModalOpen(false);
                toast.success(editingAmbulanceIdx !== null ? "Ambulance unit updated successfully!" : "New ambulance unit added successfully!");
            } else {
                toast.error(res.error || "Failed to save ambulance unit.");
            }
        } catch {
            toast.error("An error occurred while saving the ambulance unit.");
        } finally {
            setIsSavingModal(false);
        }
    };

    // Delete Ambulance
    const handleDeleteAmbulance = async (idx: number) => {
        const unitName = fleet[idx]?.unit || "Ambulance unit";
        if (!confirm(`Are you sure you want to remove ${unitName}?`)) return;

        const updatedFleet = fleet.filter((_, i) => i !== idx);
        try {
            const res = await updateAmbulanceSettings(updatedFleet, hotlines);
            if (res.success) {
                setFleet(updatedFleet);
                toast.success(`${unitName} removed successfully.`);
            } else {
                toast.error(res.error || "Failed to remove unit.");
            }
        } catch {
            toast.error("Failed to delete unit.");
        }
    };

    // Quick Status Change on card
    const handleQuickStatusChange = async (idx: number, newStatus: string) => {
        if (matchedCenterId && fleet[idx]?.assigned_center_id !== matchedCenterId) {
            toast.error("Failsafe: You cannot edit status of an asset belonging to another facility.");
            return;
        }

        const updatedFleet = [...fleet];
        updatedFleet[idx].status = newStatus;
        updatedFleet[idx].statusColor = getStatusColor(newStatus);
        setFleet(updatedFleet);

        try {
            const res = await updateAmbulanceSettings(updatedFleet, hotlines);
            if (res.success) {
                toast.success(`Updated ${updatedFleet[idx].unit} status to ${newStatus}`);
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch {
            toast.error("Failed to save status change.");
        }
    };

    // Open Add Hotline Modal
    const handleOpenAddHotline = () => {
        setEditingHotlineIdx(null);
        setHotlineForm({ name: "", number: "", status: "ACTIVE" });
        setIsHotlineModalOpen(true);
    };

    // Open Edit Hotline Modal
    const handleOpenEditHotline = (idx: number) => {
        const item = hotlines[idx];
        setEditingHotlineIdx(idx);
        setHotlineForm({
            name: item.name || "",
            number: item.number || "",
            status: item.status || "ACTIVE"
        });
        setIsHotlineModalOpen(true);
    };

    // Save Hotline Modal
    const handleSaveHotline = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hotlineForm.name.trim() || !hotlineForm.number.trim()) {
            toast.error("Please provide both department name and hotline number.");
            return;
        }

        if (matchedCenterId && editingHotlineIdx !== null && hotlines[editingHotlineIdx]?.assigned_center_id !== matchedCenterId) {
            toast.error("Failsafe: You cannot edit a hotline belonging to another facility.");
            return;
        }

        setIsSavingModal(true);
        try {
            const updatedItem = {
                name: hotlineForm.name.trim(),
                number: hotlineForm.number.trim(),
                status: hotlineForm.status || "ACTIVE",
                assigned_center_id: matchedCenterId
            };

            let updatedHotlines: any[];
            if (editingHotlineIdx !== null) {
                updatedHotlines = [...hotlines];
                updatedHotlines[editingHotlineIdx] = updatedItem;
            } else {
                updatedHotlines = [...hotlines, updatedItem];
            }

            const res = await updateAmbulanceSettings(fleet, updatedHotlines);
            if (res.success) {
                setHotlines(updatedHotlines);
                setIsHotlineModalOpen(false);
                toast.success(editingHotlineIdx !== null ? "Hotline updated successfully!" : "New emergency hotline added!");
            } else {
                toast.error(res.error || "Failed to save hotline.");
            }
        } catch {
            toast.error("An error occurred while saving hotline.");
        } finally {
            setIsSavingModal(false);
        }
    };

    // Delete Hotline
    const handleDeleteHotline = async (idx: number) => {
        const name = hotlines[idx]?.name || "Hotline";
        if (!confirm(`Are you sure you want to remove ${name}?`)) return;

        const updatedHotlines = hotlines.filter((_, i) => i !== idx);
        try {
            const res = await updateAmbulanceSettings(fleet, updatedHotlines);
            if (res.success) {
                setHotlines(updatedHotlines);
                toast.success(`${name} removed successfully.`);
            } else {
                toast.error(res.error || "Failed to remove hotline.");
            }
        } catch {
            toast.error("Failed to delete hotline.");
        }
    };

    // Counts
    const activeCount = fleet.filter(f => f.status === "ACTIVE" || f.status === "STANDBY" || f.status === "ON DUTY" || f.status === "MAINTENANCE").length;
    const inactiveCount = fleet.filter(f => f.status === "INACTIVE").length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#161a24] p-6 md:p-8 rounded-[1.75rem] border border-slate-200/80 dark:border-slate-800/80 shadow-md relative overflow-hidden transition-colors">
                <div 
                    className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 opacity-10 dark:opacity-20"
                    style={{ backgroundColor: themeColor }}
                />
                <div 
                    className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-5 dark:opacity-10"
                    style={{ backgroundColor: themeColor }}
                />

                <div className="space-y-2 relative z-10">
                    <div 
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm"
                        style={{
                            backgroundColor: `${themeColor}12`,
                            borderColor: `${themeColor}30`,
                            color: themeColor
                        }}
                    >
                        <Activity className="w-3.5 h-3.5" /> Emergency Logistics & Communication Hub
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <Truck className="w-7 h-7 shrink-0" style={{ color: themeColor }} />
                        Ambulance Dispatch Configuration
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-2xl">
                        Monitor fleet readiness, manage vehicle station assignments, and update real-time public emergency direct dispatch hotlines.
                    </p>
                </div>
            </div>

            {/* ======================================================== */}
            {/* SECTION 1: AMBULANCE FLEET STATUS REGISTRY */}
            {/* ======================================================== */}
            <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden rounded-[1.75rem] bg-white dark:bg-[#161a24] relative">
                {/* Visual Top Bar using themeColor */}
                <div 
                    className="h-1.5 w-full"
                    style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc, ${themeColor}88)` }}
                />
                
                <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 px-6 md:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div 
                                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0 font-black text-white"
                                style={{
                                    backgroundColor: themeColor,
                                    boxShadow: `0 8px 20px -4px ${themeColor}40`
                                }}
                            >
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    Ambulance Fleet Registry
                                </CardTitle>
                                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Vehicular dispatch readiness, station allocations & mechanical statuses
                                </CardDescription>
                            </div>
                        </div>

                        {/* Status Summary Counters */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-xl font-bold">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                {activeCount} Active
                            </span>
                            {inactiveCount > 0 && (
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 px-3 py-1 rounded-xl font-bold">
                                    <span className="w-2 h-2 rounded-full bg-slate-500" />
                                    {inactiveCount} Inactive
                                </span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1 rounded-xl font-bold">
                                {fleet.length} Total Units
                            </span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8 space-y-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-12 text-slate-400 gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" style={{ color: themeColor }} />
                            <span className="text-xs font-bold uppercase tracking-wider">Loading Fleet Status...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {fleet.map((vehicle, idx) => (
                                <div
                                    key={idx}
                                    className="relative p-5 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#1a1f2c] hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group"
                                >
                                    <div className="space-y-3.5">
                                        {/* Header Row: Vehicle Icon, Unit Name, Actions */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-start gap-3 min-w-0 flex-1">
                                                <div 
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border"
                                                    style={{
                                                        backgroundColor: `${themeColor}15`,
                                                        borderColor: `${themeColor}30`,
                                                        color: themeColor
                                                    }}
                                                >
                                                    <Car className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h5 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                        {vehicle.unit}
                                                    </h5>
                                                    {/* License Plate Style */}
                                                    <div 
                                                        className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-mono text-[10px] font-black tracking-widest"
                                                        style={{ color: themeColor }}
                                                    >
                                                        {vehicle.plateNumber || "NO PLATE"}
                                                    </div>
                                                </div>
                                            </div>

                                            {!isReadOnly && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditAmbulance(idx)}
                                                        className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                        title="Edit ambulance unit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteAmbulance(idx)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                        title="Delete ambulance unit"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Station Location Info */}
                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-black/20 p-2.5 rounded-xl border border-slate-200/70 dark:border-white/5">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: themeColor }} />
                                            <span className="truncate">{vehicle.station || "Unassigned Station"}</span>
                                        </div>
                                    </div>

                                    {/* Status Switcher Bar */}
                                    <div className="pt-3 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn("w-2 h-2 rounded-full shadow-sm", getStatusDotColor(vehicle.status))} />
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status:</span>
                                        </div>
                                        <Select
                                            disabled={isReadOnly}
                                            value={vehicle.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"}
                                            onValueChange={(val) => handleQuickStatusChange(idx, val)}
                                        >
                                            <SelectTrigger className={cn("h-8 px-3 rounded-lg font-black text-[10px] uppercase tracking-wider border shadow-sm", getStatusColor(vehicle.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"))}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                                <SelectItem value="ACTIVE" className="text-xs font-bold py-2 rounded-lg text-emerald-600 dark:text-emerald-400">ACTIVE</SelectItem>
                                                <SelectItem value="INACTIVE" className="text-xs font-bold py-2 rounded-lg text-slate-500 dark:text-slate-400">INACTIVE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}

                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={handleOpenAddAmbulance}
                                    className="p-6 rounded-2xl border-2 border-dashed hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 min-h-[175px] group cursor-pointer"
                                    style={{
                                        borderColor: `${themeColor}40`,
                                        backgroundColor: `${themeColor}06`
                                    }}
                                >
                                    <div 
                                        className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-sm group-hover:scale-105"
                                        style={{
                                            backgroundColor: `${themeColor}18`,
                                            border: `1px solid ${themeColor}35`,
                                            color: themeColor
                                        }}
                                    >
                                        <Plus className="w-5 h-5" />
                                    </div>
                                    <div className="text-center">
                                        <span 
                                            className="text-xs font-black uppercase tracking-wider transition-colors block"
                                            style={{ color: themeColor }}
                                        >
                                            + Add Ambulance Unit
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                                            Register a new vehicle to the fleet
                                        </span>
                                    </div>
                                </button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ================================================================= */}
            {/* SECTION 2: EMERGENCY DISPATCH CONTACT DIRECTORIES */}
            {/* ================================================================= */}
            <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden rounded-[1.75rem] bg-white dark:bg-[#161a24] relative">
                {/* Visual Top Bar using themeColor */}
                <div 
                    className="h-1.5 w-full"
                    style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc, ${themeColor}88)` }}
                />
                
                <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 px-6 md:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div 
                                className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0 font-black text-white"
                                style={{
                                    backgroundColor: themeColor,
                                    boxShadow: `0 8px 20px -4px ${themeColor}40`
                                }}
                            >
                                <Radio className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    Emergency Dispatch Hotlines
                                </CardTitle>
                                <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Public direct lines for MDRRMO, Municipal Health Officers, and RHU emergency response
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span 
                                className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-xl border"
                                style={{
                                    backgroundColor: `${themeColor}15`,
                                    borderColor: `${themeColor}30`,
                                    color: themeColor
                                }}
                            >
                                <Radio className="w-3 h-3" style={{ color: themeColor }} />
                                {hotlines.length} {hotlines.length === 1 ? "Hotline" : "Hotlines"} Active
                            </span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {hotlines.map((hotline, idx) => {
                            const meta = getHotlineMeta(hotline.name);
                            const IconComponent = meta.icon;

                            return (
                                <div
                                    key={idx}
                                    className={cn(
                                        "relative p-5 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#1a1f2c] transition-all flex items-center justify-between gap-3 group shadow-sm",
                                        meta.accentBorder
                                    )}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                        {/* Avatar / Category Badge */}
                                        <div className={cn(
                                            "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner transition-transform duration-200 group-hover:scale-105",
                                            hotline.status === "INACTIVE" 
                                                ? "text-slate-400 bg-slate-500/10 border-slate-500/20"
                                                : meta.color
                                        )}>
                                            <IconComponent className="w-5 h-5" />
                                        </div>

                                        {/* Contact Details */}
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                                                    {hotline.name}
                                                </span>
                                                {hotline.status === "INACTIVE" && (
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-md bg-slate-500/10 text-slate-500 border border-slate-500/20 uppercase tracking-wider leading-none">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Phone className="w-3 h-3 text-rose-500 shrink-0" />
                                                <span className="text-xs font-black tracking-tight text-slate-900 dark:text-white font-mono block truncate">
                                                    {hotline.number}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isReadOnly && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditHotline(idx)}
                                                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                title="Edit hotline"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteHotline(idx)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                title="Delete hotline"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={handleOpenAddHotline}
                                className="p-5 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center gap-3 min-h-[82px] group cursor-pointer"
                                style={{
                                    borderColor: `${themeColor}40`,
                                    backgroundColor: `${themeColor}06`
                                }}
                            >
                                <div 
                                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm group-hover:scale-105"
                                    style={{
                                        backgroundColor: `${themeColor}18`,
                                        border: `1px solid ${themeColor}35`,
                                        color: themeColor
                                    }}
                                >
                                    <Plus className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span 
                                        className="text-xs font-black uppercase tracking-wider transition-colors block"
                                        style={{ color: themeColor }}
                                    >
                                        + Add Emergency Hotline
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400 block">
                                        Link a 24/7 direct response line
                                    </span>
                                </div>
                            </button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Modal: Add/Edit Ambulance Unit */}
            <Dialog open={isAmbulanceModalOpen} onOpenChange={setIsAmbulanceModalOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <Truck className="w-5 h-5" style={{ color: themeColor }} />
                            {editingAmbulanceIdx !== null ? "Edit Ambulance Unit" : "Add Ambulance Unit"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            {editingAmbulanceIdx !== null
                                ? "Update vehicle specifications, station assignment, and dispatch status."
                                : "Register a new ambulance unit to the municipal emergency fleet."}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveAmbulance} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Unit Name / Model <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={ambulanceForm.unit}
                                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, unit: e.target.value })}
                                placeholder="e.g. Ambulance Unit 4 (Toyota Hiace)"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Plate Number
                                </Label>
                                <Input
                                    value={ambulanceForm.plateNumber}
                                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, plateNumber: e.target.value })}
                                    placeholder="e.g. SAB-1234"
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Availability Status
                                </Label>
                                <Select
                                    value={ambulanceForm.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"}
                                    onValueChange={(val) => setAmbulanceForm({ ...ambulanceForm, status: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                        <SelectItem value="ACTIVE" className="text-xs font-bold py-2 rounded-lg text-emerald-600 dark:text-emerald-400">ACTIVE</SelectItem>
                                        <SelectItem value="INACTIVE" className="text-xs font-bold py-2 rounded-lg text-slate-500 dark:text-slate-400">INACTIVE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Station / Location
                            </Label>
                            <Select
                                value={ambulanceForm.station}
                                onValueChange={(val) => setAmbulanceForm({ ...ambulanceForm, station: val })}
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                    <SelectValue placeholder="Select station or health center..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                    {centersList.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-slate-400 font-bold">
                                            No health centers registered
                                        </div>
                                    ) : (
                                        centersList.map((center: any) => (
                                             <SelectItem key={center.id} value={center.name} className="text-xs font-bold py-2 rounded-lg">
                                                 {center.name}
                                             </SelectItem>
                                         ))
                                    )}
                                    {ambulanceForm.station && !centersList.some((c: any) => c.name === ambulanceForm.station) && (
                                        <SelectItem value={ambulanceForm.station} className="text-xs font-bold py-2 rounded-lg opacity-70">
                                            {ambulanceForm.station} (Other)
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAmbulanceModalOpen(false)}
                                disabled={isSavingModal}
                                className="h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingModal}
                                className="h-10 px-6 rounded-xl text-white font-black uppercase text-xs tracking-wider shadow-lg"
                                style={{
                                    backgroundColor: themeColor,
                                    boxShadow: `0 8px 20px -4px ${themeColor}40`
                                }}
                            >
                                {isSavingModal ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        Saving...
                                    </>
                                ) : (
                                    editingAmbulanceIdx !== null ? "Save Changes" : "Save Ambulance Unit"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Add/Edit Hotline */}
            <Dialog open={isHotlineModalOpen} onOpenChange={setIsHotlineModalOpen}>
                <DialogContent className="sm:max-w-[420px] rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <Radio className="w-5 h-5" style={{ color: themeColor }} />
                            {editingHotlineIdx !== null ? "Edit Emergency Hotline" : "Add Emergency Hotline"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Configure direct dispatch phone numbers for public emergency access.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveHotline} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Department / Officer Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={hotlineForm.name}
                                onChange={(e) => setHotlineForm({ ...hotlineForm, name: e.target.value })}
                                placeholder="e.g. RHU Emergency Dispatch"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Hotline / Phone Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={hotlineForm.number}
                                onChange={(e) => setHotlineForm({ ...hotlineForm, number: e.target.value })}
                                placeholder="e.g. 0917-555-0199 or (075) 529-1234"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Hotline Status
                            </Label>
                            <Select
                                value={hotlineForm.status || "ACTIVE"}
                                onValueChange={(val) => setHotlineForm({ ...hotlineForm, status: val })}
                            >
                                <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                    <SelectItem value="ACTIVE" className="text-xs font-bold py-2 rounded-lg text-emerald-600 dark:text-emerald-400">ACTIVE</SelectItem>
                                    <SelectItem value="INACTIVE" className="text-xs font-bold py-2 rounded-lg text-slate-500 dark:text-slate-400">INACTIVE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter className="pt-4 flex flex-row items-center justify-end gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsHotlineModalOpen(false)}
                                disabled={isSavingModal}
                                className="h-10 px-5 rounded-xl text-xs font-black uppercase tracking-wider"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingModal}
                                className="h-10 px-6 rounded-xl text-white font-black uppercase text-xs tracking-wider shadow-lg"
                                style={{
                                    backgroundColor: themeColor,
                                    boxShadow: `0 8px 20px -4px ${themeColor}40`
                                }}
                            >
                                {isSavingModal ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                        Saving...
                                    </>
                                ) : (
                                    editingHotlineIdx !== null ? "Save Changes" : "Save Emergency Hotline"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
