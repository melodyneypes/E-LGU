"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
    Truck, 
    Trash2, 
    Plus, 
    Pencil, 
    PhoneCall, 
    MapPin, 
    Loader2, 
    Radio, 
    Car, 
    FolderArchive, 
    UserCheck, 
    Calendar, 
    ArrowLeft, 
    CheckCircle2 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { saveMDRRMOAmbulance, deleteMDRRMOAmbulance, saveMDRRMOHotline, deleteMDRRMOHotline } from "../actions";

interface MDRRMOAmbulanceClientProps {
    initialFleet: any[];
    initialHotlines: any[];
    initialDrivers: any[];
    isReadOnly?: boolean;
}

export default function MDRRMOAmbulanceClient({
    initialFleet = [],
    initialHotlines = [],
    initialDrivers = [],
    isReadOnly = false
}: MDRRMOAmbulanceClientProps) {
    let themeColor = "#ea580c";
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {}

    const [fleet, setFleet] = useState<any[]>(initialFleet);
    const [hotlines, setHotlines] = useState<any[]>(initialHotlines);
    const [drivers] = useState<any[]>(initialDrivers);

    // Modal State - Ambulance
    const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
    const [editingAmbulance, setEditingAmbulance] = useState<any | null>(null);
    const [isSavingAmbulance, setIsSavingAmbulance] = useState(false);
    const [ambulanceForm, setAmbulanceForm] = useState({
        unit: "",
        plateNumber: "",
        station: "MDRRMO Main Command Center",
        status: "STANDBY",
        assignedDriverId: "NONE",
        chassisNumber: "",
        engineNumber: "",
        orNumber: "",
        crNumber: "",
        registrationExpiry: "",
        insuranceExpiry: ""
    });

    // Modal State - Hotline
    const [isHotlineModalOpen, setIsHotlineModalOpen] = useState(false);
    const [editingHotline, setEditingHotline] = useState<any | null>(null);
    const [isSavingHotline, setIsSavingHotline] = useState(false);
    const [hotlineForm, setHotlineForm] = useState({
        name: "",
        number: "",
        status: "ACTIVE"
    });

    const getStatusColor = (status: string) => {
        if (status === "ACTIVE" || status === "STANDBY" || status === "ON DUTY") {
            return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
        } else if (status === "MAINTENANCE") {
            return "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
        } else {
            return "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
    };

    const handleOpenAddAmbulance = () => {
        setEditingAmbulance(null);
        setAmbulanceForm({
            unit: `Ambulance Unit ${fleet.length + 1}`,
            plateNumber: "",
            station: "MDRRMO Main Command Center",
            status: "STANDBY",
            assignedDriverId: "NONE",
            chassisNumber: "",
            engineNumber: "",
            orNumber: "",
            crNumber: "",
            registrationExpiry: "",
            insuranceExpiry: ""
        });
        setIsAmbulanceModalOpen(true);
    };

    const handleOpenEditAmbulance = (item: any) => {
        setEditingAmbulance(item);
        setAmbulanceForm({
            unit: item.unit || "",
            plateNumber: item.plateNumber || "",
            station: item.station || "MDRRMO Main Command Center",
            status: item.status || "STANDBY",
            assignedDriverId: item.assignedDriverId || (item.drivers?.[0]?.id) || "NONE",
            chassisNumber: item.chassisNumber || "",
            engineNumber: item.engineNumber || "",
            orNumber: item.orNumber || "",
            crNumber: item.crNumber || "",
            registrationExpiry: item.registrationExpiry ? new Date(item.registrationExpiry).toISOString().split("T")[0] : "",
            insuranceExpiry: item.insuranceExpiry ? new Date(item.insuranceExpiry).toISOString().split("T")[0] : ""
        });
        setIsAmbulanceModalOpen(true);
    };

    const handleSaveAmbulance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ambulanceForm.unit.trim()) {
            toast.error("Please enter a vehicle unit name.");
            return;
        }

        setIsSavingAmbulance(true);
        try {
            const res = await saveMDRRMOAmbulance({
                id: editingAmbulance?.id,
                ...ambulanceForm,
                assignedDriverId: ambulanceForm.assignedDriverId === "NONE" ? null : ambulanceForm.assignedDriverId
            });

            if (res.success && res.vehicle) {
                if (editingAmbulance) {
                    setFleet(prev => prev.map(v => v.id === res.vehicle.id ? { ...v, ...res.vehicle } : v));
                    toast.success("Ambulance vehicle details updated!");
                } else {
                    setFleet(prev => [...prev, res.vehicle]);
                    toast.success("New ambulance vehicle added to fleet!");
                }
                setIsAmbulanceModalOpen(false);
            } else {
                toast.error(res.error || "Failed to save ambulance unit");
            }
        } catch {
            toast.error("Network error saving ambulance unit");
        } finally {
            setIsSavingAmbulance(false);
        }
    };

    const handleDeleteAmbulance = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to remove ${name} from the fleet registry?`)) return;

        try {
            const res = await deleteMDRRMOAmbulance(id);
            if (res.success) {
                setFleet(prev => prev.filter(v => v.id !== id));
                toast.success(`${name} removed from fleet.`);
            } else {
                toast.error(res.error || "Failed to delete unit");
            }
        } catch {
            toast.error("Network error deleting unit");
        }
    };

    // Quick Status Switcher on Card
    const handleQuickStatusChange = async (vehicle: any, newStatus: string) => {
        try {
            const res = await saveMDRRMOAmbulance({
                id: vehicle.id,
                unit: vehicle.unit,
                plateNumber: vehicle.plateNumber,
                station: vehicle.station,
                status: newStatus
            });
            if (res.success) {
                setFleet(prev => prev.map(v => v.id === vehicle.id ? { ...v, status: newStatus } : v));
                toast.success(`Updated status for ${vehicle.unit} to ${newStatus}`);
            } else {
                toast.error(res.error || "Failed to update status");
            }
        } catch {
            toast.error("Failed to update vehicle status");
        }
    };

    // Hotline Handlers
    const handleOpenAddHotline = () => {
        setEditingHotline(null);
        setHotlineForm({ name: "", number: "", status: "ACTIVE" });
        setIsHotlineModalOpen(true);
    };

    const handleOpenEditHotline = (item: any) => {
        setEditingHotline(item);
        setHotlineForm({ name: item.name || "", number: item.number || "", status: item.status || "ACTIVE" });
        setIsHotlineModalOpen(true);
    };

    const handleSaveHotline = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hotlineForm.name.trim() || !hotlineForm.number.trim()) {
            toast.error("Please enter department name and phone number.");
            return;
        }

        setIsSavingHotline(true);
        try {
            const res = await saveMDRRMOHotline({
                id: editingHotline?.id,
                ...hotlineForm
            });
            if (res.success && res.hotline) {
                if (editingHotline) {
                    setHotlines(prev => prev.map(h => h.id === res.hotline.id ? res.hotline : h));
                    toast.success("Hotline updated!");
                } else {
                    setHotlines(prev => [...prev, res.hotline]);
                    toast.success("New emergency hotline added!");
                }
                setIsHotlineModalOpen(false);
            } else {
                toast.error(res.error || "Failed to save hotline");
            }
        } catch {
            toast.error("Error saving hotline");
        } finally {
            setIsSavingHotline(false);
        }
    };

    const handleDeleteHotline = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to remove ${name}?`)) return;

        try {
            const res = await deleteMDRRMOHotline(id);
            if (res.success) {
                setHotlines(prev => prev.filter(h => h.id !== id));
                toast.success(`${name} removed.`);
            } else {
                toast.error(res.error || "Failed to delete hotline");
            }
        } catch {
            toast.error("Error deleting hotline");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header & Back Link */}
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
                        <Truck className="w-7 h-7 shrink-0" style={{ color: themeColor }} />
                        Ambulance Fleet & Hotlines
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-2xl">
                        Full administrative registry of municipal emergency transport vehicles, station allocations, assigned drivers, and public direct dispatch lines.
                    </p>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-3 relative z-10">
                        <Button
                            onClick={handleOpenAddAmbulance}
                            className="h-11 px-5 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-lg transition-all hover:scale-105"
                            style={{
                                backgroundColor: themeColor,
                                boxShadow: `0 8px 20px -4px ${themeColor}50`
                            }}
                        >
                            <Plus className="w-4 h-4 mr-2" /> Add Ambulance Unit
                        </Button>
                    </div>
                )}
            </div>

            {/* ========================================================================= */}
            {/* SECTION 1: AMBULANCE FLEET REGISTRY */}
            {/* ========================================================================= */}
            <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden rounded-[1.75rem] bg-white dark:bg-[#161a24] relative">
                <div 
                    className="h-1.5 w-full"
                    style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc, ${themeColor}88)` }}
                />

                <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div 
                            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0 font-black text-white"
                            style={{ backgroundColor: themeColor }}
                        >
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Municipal Ambulance Fleet Registry
                            </CardTitle>
                            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Real-time dispatch status, assigned drivers, and station deployment
                            </CardDescription>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {fleet.filter(v => v.status === "ACTIVE" || v.status === "STANDBY" || v.status === "ON DUTY").length} Active
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-3 py-1 rounded-xl">
                            {fleet.length} Total Units
                        </span>
                    </div>
                </CardHeader>

                <CardContent className="p-6 md:p-8">
                    {fleet.length === 0 ? (
                        <div className="text-center p-12 text-slate-400 space-y-3">
                            <Truck className="w-10 h-10 mx-auto opacity-40" />
                            <p className="text-xs font-bold uppercase tracking-wider">No ambulance vehicles registered yet.</p>
                            {!isReadOnly && (
                                <Button onClick={handleOpenAddAmbulance} variant="outline" className="rounded-xl font-bold text-xs uppercase">
                                    + Register First Ambulance
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {fleet.map((vehicle) => {
                                const assignedDriver = drivers.find(d => d.assignedAmbulanceId === vehicle.id || d.id === vehicle.assignedDriverId);
                                const docCount = vehicle.documents?.length || 0;

                                return (
                                    <div
                                        key={vehicle.id}
                                        className="relative p-5 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#1a1f2c] hover:shadow-lg transition-all flex flex-col justify-between space-y-4 group"
                                    >
                                        <div className="space-y-3.5">
                                            {/* Header Row */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                                    <div 
                                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                                                        style={{
                                                            backgroundColor: `${themeColor}15`,
                                                            borderColor: `${themeColor}30`,
                                                            color: themeColor
                                                        }}
                                                    >
                                                        <Car className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                            {vehicle.unit}
                                                        </h4>
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
                                                            onClick={() => handleOpenEditAmbulance(vehicle)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 rounded-lg transition-colors"
                                                            title="Edit Vehicle"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteAmbulance(vehicle.id, vehicle.unit)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                                            title="Delete Vehicle"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Details Rows */}
                                            <div className="space-y-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                                <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded-xl border border-slate-200/70 dark:border-white/5">
                                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                    <span className="truncate">{vehicle.station || "MDRRMO Command Center"}</span>
                                                </div>
                                                <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-2 rounded-xl border border-slate-200/70 dark:border-white/5">
                                                    <UserCheck className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                                                    <span className="truncate">
                                                        Driver: <strong className="text-slate-800 dark:text-slate-200">{assignedDriver ? assignedDriver.name : "Unassigned"}</strong>
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Sub-links: Documents & Schedule */}
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider pt-1">
                                                <Link
                                                    href={`/admin/mdrrmo/documents?ambulanceId=${vehicle.id}`}
                                                    className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 hover:underline"
                                                >
                                                    <FolderArchive className="w-3.5 h-3.5" />
                                                    OR/CR Papers ({docCount})
                                                </Link>
                                                <Link
                                                    href={`/admin/mdrrmo/schedule?ambulanceId=${vehicle.id}`}
                                                    className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 hover:underline"
                                                >
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    Dispatches
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Status Switcher Bar */}
                                        <div className="pt-3 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between gap-2">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Status:</span>
                                            <Select
                                                disabled={isReadOnly}
                                                value={vehicle.status}
                                                onValueChange={(val) => handleQuickStatusChange(vehicle, val)}
                                            >
                                                <SelectTrigger className={cn("h-8 px-3 rounded-lg font-black text-[10px] uppercase tracking-wider border shadow-sm", getStatusColor(vehicle.status))}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                                    <SelectItem value="STANDBY" className="text-xs font-bold py-2 rounded-lg text-emerald-600">STANDBY</SelectItem>
                                                    <SelectItem value="ON DUTY" className="text-xs font-bold py-2 rounded-lg text-blue-600">ON DUTY</SelectItem>
                                                    <SelectItem value="ACTIVE" className="text-xs font-bold py-2 rounded-lg text-emerald-600">ACTIVE</SelectItem>
                                                    <SelectItem value="MAINTENANCE" className="text-xs font-bold py-2 rounded-lg text-amber-600">MAINTENANCE</SelectItem>
                                                    <SelectItem value="INACTIVE" className="text-xs font-bold py-2 rounded-lg text-slate-500">INACTIVE</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ========================================================================= */}
            {/* SECTION 2: EMERGENCY DISPATCH DIRECTORIES */}
            {/* ========================================================================= */}
            <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-xl overflow-hidden rounded-[1.75rem] bg-white dark:bg-[#161a24] relative">
                <div 
                    className="h-1.5 w-full"
                    style={{ background: `linear-gradient(to right, ${themeColor}, ${themeColor}cc, ${themeColor}88)` }}
                />

                <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 px-6 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div 
                            className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0 font-black text-white"
                            style={{ backgroundColor: themeColor }}
                        >
                            <Radio className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                24/7 Emergency Dispatch Hotlines
                            </CardTitle>
                            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                Direct public hotlines for MDRRMO, Police, Fire, and Health Responders
                            </CardDescription>
                        </div>
                    </div>

                    {!isReadOnly && (
                        <Button
                            onClick={handleOpenAddHotline}
                            variant="outline"
                            className="rounded-xl font-bold text-xs uppercase"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Hotline
                        </Button>
                    )}
                </CardHeader>

                <CardContent className="p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {hotlines.map((hotline) => (
                            <div
                                key={hotline.id}
                                className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#1a1f2c] flex items-center justify-between gap-3 shadow-sm"
                            >
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                                        <PhoneCall className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block truncate">
                                            {hotline.name}
                                        </span>
                                        <span className="text-xs font-black font-mono tracking-tight text-slate-900 dark:text-white block truncate">
                                            {hotline.number}
                                        </span>
                                    </div>
                                </div>

                                {!isReadOnly && (
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditHotline(hotline)}
                                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors"
                                            title="Edit Hotline"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteHotline(hotline.id, hotline.name)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                            title="Delete Hotline"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ========================================================================= */}
            {/* MODAL: ADD / EDIT AMBULANCE UNIT */}
            {/* ========================================================================= */}
            <Dialog open={isAmbulanceModalOpen} onOpenChange={setIsAmbulanceModalOpen}>
                <DialogContent className="sm:max-w-[560px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <Truck className="w-5 h-5" style={{ color: themeColor }} />
                            {editingAmbulance ? "Edit Ambulance Unit" : "Add Ambulance Unit"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Configure vehicle specifications, license plate, station, and driver assignment.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveAmbulance} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Unit Name / Description <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={ambulanceForm.unit}
                                onChange={(e) => setAmbulanceForm({ ...ambulanceForm, unit: e.target.value })}
                                placeholder="e.g. Ambulance Unit 1 (Toyota Hiace Commuter)"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    License Plate Number
                                </Label>
                                <Input
                                    value={ambulanceForm.plateNumber}
                                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, plateNumber: e.target.value })}
                                    placeholder="e.g. SAB-1234"
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs uppercase"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Availability Status
                                </Label>
                                <Select
                                    value={ambulanceForm.status}
                                    onValueChange={(val) => setAmbulanceForm({ ...ambulanceForm, status: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                        <SelectItem value="STANDBY" className="text-xs font-bold text-emerald-600">STANDBY</SelectItem>
                                        <SelectItem value="ON DUTY" className="text-xs font-bold text-blue-600">ON DUTY</SelectItem>
                                        <SelectItem value="ACTIVE" className="text-xs font-bold text-emerald-600">ACTIVE</SelectItem>
                                        <SelectItem value="MAINTENANCE" className="text-xs font-bold text-amber-600">MAINTENANCE</SelectItem>
                                        <SelectItem value="INACTIVE" className="text-xs font-bold text-slate-500">INACTIVE</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Assigned Station / Location
                                </Label>
                                <Input
                                    value={ambulanceForm.station}
                                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, station: e.target.value })}
                                    placeholder="e.g. Poblacion Central Station"
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Primary Assigned Driver
                                </Label>
                                <Select
                                    value={ambulanceForm.assignedDriverId}
                                    onValueChange={(val) => setAmbulanceForm({ ...ambulanceForm, assignedDriverId: val })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs">
                                        <SelectValue placeholder="Select driver..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                        <SelectItem value="NONE" className="text-xs font-bold text-slate-400">No Driver Assigned</SelectItem>
                                        {drivers.map(d => (
                                            <SelectItem key={d.id} value={d.id} className="text-xs font-bold">
                                                {d.name} ({d.dutyShift || "Driver"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Optional Vehicle Details for OR/CR tracking */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Engine Number (Optional)
                                </Label>
                                <Input
                                    value={ambulanceForm.engineNumber}
                                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, engineNumber: e.target.value })}
                                    placeholder="e.g. 2KD-FTV-8821"
                                    className="h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Chassis Number (Optional)
                                </Label>
                                <Input
                                    value={ambulanceForm.chassisNumber}
                                    onChange={(e) => setAmbulanceForm({ ...ambulanceForm, chassisNumber: e.target.value })}
                                    placeholder="e.g. KDH200-0012345"
                                    className="h-10 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs font-mono"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsAmbulanceModalOpen(false)}
                                className="rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingAmbulance}
                                className="rounded-xl font-black text-xs uppercase text-white"
                                style={{ backgroundColor: themeColor }}
                            >
                                {isSavingAmbulance ? (
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                ) : (
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                )}
                                {editingAmbulance ? "Save Changes" : "Register Unit"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: ADD / EDIT HOTLINE */}
            {/* ========================================================================= */}
            <Dialog open={isHotlineModalOpen} onOpenChange={setIsHotlineModalOpen}>
                <DialogContent className="sm:max-w-[460px] max-h-[88vh] overflow-y-auto overflow-x-hidden rounded-3xl bg-white dark:bg-[#161820] border-slate-200 dark:border-white/10 p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <PhoneCall className="w-5 h-5" style={{ color: themeColor }} />
                            {editingHotline ? "Edit Emergency Hotline" : "Add Emergency Hotline"}
                        </DialogTitle>
                        <DialogDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            Direct telephone or mobile numbers for emergency response.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveHotline} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Agency / Service Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={hotlineForm.name}
                                onChange={(e) => setHotlineForm({ ...hotlineForm, name: e.target.value })}
                                placeholder="e.g. MDRRMO Mapandan Command Hotline"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Phone / Mobile Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                required
                                value={hotlineForm.number}
                                onChange={(e) => setHotlineForm({ ...hotlineForm, number: e.target.value })}
                                placeholder="e.g. 0917-555-0199 or (075) 529-1234"
                                className="h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 font-bold text-xs font-mono"
                            />
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-200 dark:border-white/10">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsHotlineModalOpen(false)}
                                className="rounded-xl font-bold text-xs"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSavingHotline}
                                className="rounded-xl font-black text-xs uppercase text-white"
                                style={{ backgroundColor: themeColor }}
                            >
                                {isSavingHotline ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Save Hotline
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
