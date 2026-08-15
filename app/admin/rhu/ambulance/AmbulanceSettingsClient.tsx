"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Truck, Trash2, Plus } from "lucide-react";
import { getAmbulanceSettings, updateAmbulanceSettings } from "@/app/user/services/rural-health-unit/actions";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AmbulanceSettingsClientProps {
    isReadOnly?: boolean;
    healthCenters?: any[];
}

export default function AmbulanceSettingsClient({ isReadOnly = false, healthCenters = [] }: AmbulanceSettingsClientProps) {
    const [fleet, setFleet] = useState<any[]>([]);
    const [hotlines, setHotlines] = useState<any[]>([]);
    const [isSavingAmbulance, setIsSavingAmbulance] = useState(false);

    useEffect(() => {
        getAmbulanceSettings().then((res) => {
            if (res.success) {
                setFleet(res.fleet || []);
                setHotlines(res.hotlines || []);
            }
        });
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-slate-200 dark:border-[#2a3040] shadow-xl overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-[#1e2330]">
                <CardHeader className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-[#2a3040] p-5 md:p-6 px-4 md:px-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                                <Truck className="w-6 h-6 text-amber-500" />
                                Ambulance Dispatch Configuration
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                                Manage real-time ambulance availability status, plate numbers, stations, and emergency dispatch contact details.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 lg:p-8 px-4 md:px-8 space-y-6">
                    {/* Fleet Management */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Ambulance Fleet Status Registry</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {fleet.map((vehicle, idx) => (
                                <div key={idx} className="relative p-5 rounded-2xl border border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-black/10 space-y-4 pr-10">
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = fleet.filter((_, i) => i !== idx);
                                                setFleet(updated);
                                            }}
                                            className="absolute top-4 right-4 text-red-500 hover:text-red-650 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit Name</Label>
                                        <Input
                                            disabled={isReadOnly}
                                            value={vehicle.unit}
                                            onChange={(e) => {
                                                const updated = [...fleet];
                                                updated[idx].unit = e.target.value;
                                                setFleet(updated);
                                            }}
                                            className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plate Number</Label>
                                            <Input
                                                disabled={isReadOnly}
                                                value={vehicle.plateNumber}
                                                onChange={(e) => {
                                                    const updated = [...fleet];
                                                    updated[idx].plateNumber = e.target.value;
                                                    setFleet(updated);
                                                }}
                                                className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Station / Location</Label>
                                            <Select
                                                disabled={isReadOnly}
                                                value={vehicle.station}
                                                onValueChange={(val) => {
                                                    const updated = [...fleet];
                                                    updated[idx].station = val;
                                                    setFleet(updated);
                                                }}
                                            >
                                                <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs">
                                                    <SelectValue placeholder="Select center..." />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                                    {vehicle.station && !healthCenters.some((c: any) => c.name === vehicle.station) && (
                                                        <SelectItem value={vehicle.station} className="text-xs font-bold py-2 rounded-lg cursor-pointer opacity-75">
                                                            {vehicle.station}
                                                        </SelectItem>
                                                    )}
                                                    {healthCenters.map((center: any) => (
                                                        <SelectItem key={center.id} value={center.name} className="text-xs font-bold py-2 rounded-lg cursor-pointer">
                                                            {center.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Availability Status</Label>
                                        <Select
                                            disabled={isReadOnly}
                                            value={vehicle.status}
                                            onValueChange={(val) => {
                                                const updated = [...fleet];
                                                updated[idx].status = val;
                                                if (val === "STANDBY") {
                                                    updated[idx].statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
                                                } else if (val === "ON DUTY") {
                                                    updated[idx].statusColor = "text-blue-500 bg-blue-500/10 border-blue-500/20";
                                                } else {
                                                    updated[idx].statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
                                                }
                                                setFleet(updated);
                                            }}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white">
                                                <SelectItem value="STANDBY" className="text-xs font-bold py-2 rounded-lg">STANDBY</SelectItem>
                                                <SelectItem value="ON DUTY" className="text-xs font-bold py-2 rounded-lg">ON DUTY</SelectItem>
                                                <SelectItem value="MAINTENANCE" className="text-xs font-bold py-2 rounded-lg">MAINTENANCE</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            ))}
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFleet([
                                            ...fleet,
                                            {
                                                unit: `Ambulance Unit ${fleet.length + 1}`,
                                                plateNumber: "",
                                                station: healthCenters[0]?.name || "",
                                                status: "STANDBY",
                                                statusColor: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                            }
                                        ]);
                                    }}
                                    className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-[#2a3040] bg-slate-50/20 dark:bg-black/5 hover:bg-slate-50 dark:hover:bg-black/10 transition-all flex flex-col items-center justify-center gap-2 min-h-[220px]"
                                >
                                    <Plus className="w-8 h-8 text-slate-400" />
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Add Ambulance Unit</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-[#2a3040]" />

                    {/* Hotline Management */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Emergency Dispatch Contact Directories</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {hotlines.map((hotline, idx) => (
                                <div key={idx} className="relative p-5 rounded-2xl border border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-black/10 space-y-4 pr-10">
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const updated = hotlines.filter((_, i) => i !== idx);
                                                setHotlines(updated);
                                            }}
                                            className="absolute top-4 right-4 text-red-500 hover:text-red-650 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department / Officer Name</Label>
                                        <Input
                                            disabled={isReadOnly}
                                            value={hotline.name}
                                            onChange={(e) => {
                                                const updated = [...hotlines];
                                                updated[idx].name = e.target.value;
                                                setHotlines(updated);
                                            }}
                                            className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hotline Number</Label>
                                        <Input
                                            disabled={isReadOnly}
                                            value={hotline.number}
                                            onChange={(e) => {
                                                const updated = [...hotlines];
                                                updated[idx].number = e.target.value;
                                                setHotlines(updated);
                                            }}
                                            className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHotlines([
                                            ...hotlines,
                                            {
                                                name: "",
                                                number: ""
                                            }
                                        ]);
                                    }}
                                    className="p-5 rounded-2xl border border-dashed border-slate-300 dark:border-[#2a3040] bg-slate-50/20 dark:bg-black/5 hover:bg-slate-50 dark:hover:bg-black/10 transition-all flex flex-col items-center justify-center gap-2 min-h-[160px]"
                                >
                                    <Plus className="w-8 h-8 text-slate-400" />
                                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Add Emergency Hotline</span>
                                </button>
                            )}
                        </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-[#2a3040]" />

                    <div className="flex justify-end pt-2">
                        <Button
                            type="button"
                            onClick={async () => {
                                setIsSavingAmbulance(true);
                                try {
                                    const res = await updateAmbulanceSettings(fleet, hotlines);
                                    if (res.success) {
                                        toast.success("Ambulance configuration updated successfully!");
                                    } else {
                                        toast.error(res.error || "Failed to update configuration.");
                                    }
                                } catch {
                                    toast.error("An error occurred while saving settings.");
                                } finally {
                                    setIsSavingAmbulance(false);
                                }
                            }}
                            disabled={isSavingAmbulance || isReadOnly}
                            className={cn(
                                "h-12 px-10 font-black uppercase text-xs rounded-xl shadow-lg transition-all",
                                !isReadOnly
                                    ? "bg-amber-500 hover:bg-amber-600 text-white hover:opacity-90 active:scale-95 border-none"
                                    : "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                            )}
                        >
                            {isSavingAmbulance ? "Saving..." : "Save Ambulance Config"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
