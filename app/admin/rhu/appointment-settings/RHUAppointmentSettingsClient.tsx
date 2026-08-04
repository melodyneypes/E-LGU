"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Activity, Clock, Eye, Plus, Trash2 } from "lucide-react";
import { getCenterAppointmentConfig, updateCenterAppointmentConfig } from "@/app/user/services/rural-health-unit/actions";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface RHUAppointmentSettingsClientProps {
    themeColor?: string;
    appointmentConfig: {
        id: string;
        department: string;
        maxSlots: number;
        maxSlotsAM: number;
        maxSlotsPM: number;
        activeDays: number[];
        blockedDates: string[];
        amTimeLabel?: string;
        pmTimeLabel?: string;
    };
    isCenterAdmin?: boolean;
    healthCenters?: any[];
    assignedCenterId?: string | null;
    canManageSchedule?: boolean;
}

export default function RHUAppointmentSettingsClient({ 
    appointmentConfig,
    isCenterAdmin = true,
    healthCenters = [],
    assignedCenterId = null,
    canManageSchedule = true
}: RHUAppointmentSettingsClientProps) {
    const isReadOnly = !canManageSchedule;
    const [selectedCenterId, setSelectedCenterId] = useState<string>(assignedCenterId || healthCenters?.[0]?.id || "NONE");
    const [isAMEnabled, setIsAMEnabled] = useState<boolean>((appointmentConfig?.maxSlotsAM ?? 25) > 0);
    const [isPMEnabled, setIsPMEnabled] = useState<boolean>((appointmentConfig?.maxSlotsPM ?? 25) > 0);
    const [isAMUnlimited, setIsAMUnlimited] = useState<boolean>((appointmentConfig?.maxSlotsAM ?? 25) >= 99999);
    const [isPMUnlimited, setIsPMUnlimited] = useState<boolean>((appointmentConfig?.maxSlotsPM ?? 25) >= 99999);
    const [maxSlotsAM, setMaxSlotsAM] = useState<number>(appointmentConfig?.maxSlotsAM && appointmentConfig.maxSlotsAM < 99999 ? appointmentConfig.maxSlotsAM : 25);
    const [maxSlotsPM, setMaxSlotsPM] = useState<number>(appointmentConfig?.maxSlotsPM && appointmentConfig.maxSlotsPM < 99999 ? appointmentConfig.maxSlotsPM : 25);
    const [amTimeLabel, setAmTimeLabel] = useState<string>(appointmentConfig?.amTimeLabel || "08:00 AM - 11:00 AM");
    const [pmTimeLabel, setPmTimeLabel] = useState<string>(appointmentConfig?.pmTimeLabel || "01:00 PM - 04:00 PM");
    const [activeDays, setActiveDays] = useState<number[]>(appointmentConfig?.activeDays || [1, 2, 3, 4, 5]);
    const [blockedDates, setBlockedDates] = useState<string[]>(appointmentConfig?.blockedDates || []);
    const [newBlockedDate, setNewBlockedDate] = useState("");
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const isEditable = !isReadOnly && selectedCenterId !== undefined && selectedCenterId !== null && selectedCenterId !== "NONE";

    const toggleDay = (dayNum: number) => {
        if (!isEditable) return;
        setActiveDays(prev => 
            prev.includes(dayNum) 
                ? prev.filter(d => d !== dayNum) 
                : [...prev, dayNum].sort()
        );
    };

    const addBlockedDate = () => {
        if (!isEditable) return;
        if (!newBlockedDate) return;
        if (blockedDates.includes(newBlockedDate)) {
            toast.error("Date is already blocked!");
            return;
        }
        setBlockedDates(prev => [...prev, newBlockedDate].sort());
        setNewBlockedDate("");
    };

    const removeBlockedDate = (dateStr: string) => {
        setBlockedDates(prev => prev.filter(d => d !== dateStr));
    };

    const handleSaveAppointmentConfig = async () => {
        if (!selectedCenterId || selectedCenterId === "NONE") {
            toast.error("Please select a health center first.");
            return;
        }

        if (!isAMEnabled && !isPMEnabled) {
            toast.error("At least one session (AM or PM) must be active!");
            return;
        }

        if (isAMEnabled && (!amTimeLabel || !amTimeLabel.trim())) {
            toast.error("AM Session hours cannot be empty!");
            return;
        }

        if (isPMEnabled && (!pmTimeLabel || !pmTimeLabel.trim())) {
            toast.error("PM Session hours cannot be empty!");
            return;
        }

        const effectiveAMSlots = isAMEnabled ? (isAMUnlimited ? 99999 : (maxSlotsAM > 0 ? maxSlotsAM : 25)) : 0;
        const effectivePMSlots = isPMEnabled ? (isPMUnlimited ? 99999 : (maxSlotsPM > 0 ? maxSlotsPM : 25)) : 0;

        setIsSavingConfig(true);
        try {
            const res = await updateCenterAppointmentConfig(selectedCenterId, {
                maxSlots: effectiveAMSlots + effectivePMSlots,
                maxSlotsAM: effectiveAMSlots,
                maxSlotsPM: effectivePMSlots,
                activeDays,
                blockedDates,
                amTimeLabel: isAMEnabled ? amTimeLabel.trim() : "Disabled",
                pmTimeLabel: isPMEnabled ? pmTimeLabel.trim() : "Disabled"
            });
            if (res.success) {
                toast.success("Health Center schedule settings updated successfully!");
            } else {
                toast.error(res.error || "Failed to update configuration");
            }
        } catch {
            toast.error("An error occurred while saving appointment settings");
        } finally {
            setIsSavingConfig(false);
        }
    };

    React.useEffect(() => {
        if (!selectedCenterId || selectedCenterId === "NONE") return;
        
        async function fetchConfig() {
            const res = await getCenterAppointmentConfig(selectedCenterId);
            if (res.success && res.data) {
                const config = res.data;
                const amSlots = config.maxSlotsAM ?? 25;
                const pmSlots = config.maxSlotsPM ?? 25;
                setIsAMEnabled(amSlots > 0 && config.amTimeLabel !== "Disabled");
                setIsPMEnabled(pmSlots > 0 && config.pmTimeLabel !== "Disabled");
                setIsAMUnlimited(amSlots >= 99999);
                setIsPMUnlimited(pmSlots >= 99999);
                setMaxSlotsAM(amSlots > 0 && amSlots < 99999 ? amSlots : 25);
                setMaxSlotsPM(pmSlots > 0 && pmSlots < 99999 ? pmSlots : 25);
                setAmTimeLabel(config.amTimeLabel && config.amTimeLabel !== "Disabled" ? config.amTimeLabel : "08:00 AM - 11:00 AM");
                setPmTimeLabel(config.pmTimeLabel && config.pmTimeLabel !== "Disabled" ? config.pmTimeLabel : "01:00 PM - 04:00 PM");
                setActiveDays(config.activeDays || [1, 2, 3, 4, 5]);
                setBlockedDates(config.blockedDates || []);
            }
        }
        
        fetchConfig();
    }, [selectedCenterId]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Appointment Schedule Settings Card */}
            <Card className="border-slate-200 dark:border-[#2a3040] shadow-xl overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-[#1e2330]">
                <CardHeader className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-[#2a3040] p-5 md:p-6 px-4 md:px-8">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                            <Activity className="w-6 h-6 text-rose-500" />
                            RHU Appointment Configuration
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                            Configure booking slot limits, active weekdays, and blocked dates for Rural Health Unit appointments.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 lg:p-8 px-4 md:px-8 space-y-6">
                    {isReadOnly ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-3 text-xs font-semibold">
                            <Eye className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <p className="font-bold text-amber-800 dark:text-amber-200">Read-Only Staff Access</p>
                                <p className="text-[11px] opacity-90">You are viewing slot capacities, active weekdays, and session hours for your health center in read-only mode. Only Center Medical Admins can modify schedule settings.</p>
                            </div>
                        </div>
                    ) : !isCenterAdmin ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-3 text-xs font-semibold">
                            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                            <div>
                                <p className="font-bold text-amber-800 dark:text-amber-200">Main Admin Dashboard (Global View)</p>
                                <p className="text-[11px] opacity-90">As a Main Admin, you can configure the specific schedule settings, active days, and slot capacities for any Health Center using the selection dropdown below.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-3 text-xs font-semibold">
                            <Clock className="w-5 h-5 text-rose-500 shrink-0" />
                            <div>
                                <p className="font-bold text-rose-800 dark:text-rose-200">Health Center Admin Dashboard</p>
                                <p className="text-[11px] opacity-90">You are configuring the schedule settings, active days, and slot capacities for your assigned health center: <span className="font-extrabold underline">{healthCenters.find(c => c.id === selectedCenterId)?.name || "Lalas Medical Clinic"}</span>.</p>
                            </div>
                        </div>
                    )}

                    {!isCenterAdmin && healthCenters.length > 0 && (
                        <div className="space-y-2 p-4 rounded-2xl bg-slate-50/50 dark:bg-black/10 border border-slate-100 dark:border-[#2a3040]">
                            <Label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                                Configure Schedule for Health Center:
                            </Label>
                            <Select
                                value={selectedCenterId}
                                onValueChange={setSelectedCenterId}
                            >
                                <SelectTrigger className="w-full sm:max-w-md h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs">
                                    <SelectValue placeholder="Select a Health Center..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161820] text-slate-900 dark:text-white shadow-xl">
                                    {healthCenters.map((center: any) => (
                                        <SelectItem key={center.id} value={center.id} className="text-xs font-bold py-2.5 rounded-lg focus:bg-rose-500/10 focus:text-rose-500 cursor-pointer">
                                            {center.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* Left Side: General Limits & Active Days */}
                        <div className="space-y-6">
                            {/* Session Controls: AM & PM Toggles */}
                            <div className="space-y-4">
                                {/* AM Session Box */}
                                <div className={cn(
                                    "p-4 rounded-2xl border transition-all space-y-3",
                                    isAMEnabled 
                                        ? "bg-slate-50/80 dark:bg-black/20 border-rose-500/30" 
                                        : "bg-slate-100/40 dark:bg-black/40 border-slate-200 dark:border-white/5 opacity-60"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock className={cn("w-4 h-4", isAMEnabled ? "text-rose-500" : "text-slate-400")} />
                                            <Label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                AM Session (Morning)
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border",
                                                isAMEnabled 
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                                    : "bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                                            )}>
                                                {isAMEnabled ? "Active" : "Disabled"}
                                            </span>
                                            <Switch
                                                disabled={!isEditable}
                                                checked={isAMEnabled}
                                                onCheckedChange={(checked) => {
                                                    if (!isEditable) return;
                                                    setIsAMEnabled(checked);
                                                    if (checked && maxSlotsAM <= 0) setMaxSlotsAM(25);
                                                    if (checked && amTimeLabel === "Disabled") setAmTimeLabel("08:00 AM - 11:00 AM");
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">AM Slots Capacity</Label>
                                                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 hover:text-rose-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAMUnlimited}
                                                        disabled={!isAMEnabled || !isEditable}
                                                        onChange={(e) => isEditable && setIsAMUnlimited(e.target.checked)}
                                                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3 h-3"
                                                    />
                                                    Unlimited
                                                </label>
                                            </div>
                                            {isAMUnlimited ? (
                                                <div className="h-11 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between font-bold text-xs text-rose-600 dark:text-rose-400">
                                                    <span>Unlimited Slots</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider bg-rose-500/10 px-2 py-0.5 rounded">No Limit</span>
                                                </div>
                                            ) : (
                                                <Input 
                                                    type="number" 
                                                    disabled={!isAMEnabled || !isEditable}
                                                    value={isAMEnabled ? maxSlotsAM : 0} 
                                                    onChange={(e) => isEditable && setMaxSlotsAM(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">AM Session Hours *</Label>
                                            <Input 
                                                type="text" 
                                                disabled={!isAMEnabled || !isEditable}
                                                value={isAMEnabled ? amTimeLabel : "Disabled"} 
                                                onChange={(e) => isEditable && setAmTimeLabel(e.target.value)}
                                                placeholder="08:00 AM - 11:00 AM"
                                                className={cn(
                                                    "h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs",
                                                    isAMEnabled && !amTimeLabel.trim() && "border-rose-500 ring-1 ring-rose-500"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* PM Session Box */}
                                <div className={cn(
                                    "p-4 rounded-2xl border transition-all space-y-3",
                                    isPMEnabled 
                                        ? "bg-slate-50/80 dark:bg-black/20 border-rose-500/30" 
                                        : "bg-slate-100/40 dark:bg-black/40 border-slate-200 dark:border-white/5 opacity-60"
                                )}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Clock className={cn("w-4 h-4", isPMEnabled ? "text-rose-500" : "text-slate-400")} />
                                            <Label className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                PM Session (Afternoon)
                                            </Label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border",
                                                isPMEnabled 
                                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                                    : "bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700"
                                            )}>
                                                {isPMEnabled ? "Active" : "Disabled"}
                                            </span>
                                            <Switch
                                                disabled={!isEditable}
                                                checked={isPMEnabled}
                                                onCheckedChange={(checked) => {
                                                    if (!isEditable) return;
                                                    setIsPMEnabled(checked);
                                                    if (checked && maxSlotsPM <= 0) setMaxSlotsPM(25);
                                                    if (checked && pmTimeLabel === "Disabled") setPmTimeLabel("01:00 PM - 04:00 PM");
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">PM Slots Capacity</Label>
                                                <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 hover:text-rose-500">
                                                    <input
                                                        type="checkbox"
                                                        checked={isPMUnlimited}
                                                        disabled={!isPMEnabled || !isEditable}
                                                        onChange={(e) => isEditable && setIsPMUnlimited(e.target.checked)}
                                                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-3 h-3"
                                                    />
                                                    Unlimited
                                                </label>
                                            </div>
                                            {isPMUnlimited ? (
                                                <div className="h-11 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex items-center justify-between font-bold text-xs text-rose-600 dark:text-rose-400">
                                                    <span>Unlimited Slots</span>
                                                    <span className="text-[10px] uppercase font-black tracking-wider bg-rose-500/10 px-2 py-0.5 rounded">No Limit</span>
                                                </div>
                                            ) : (
                                                <Input 
                                                    type="number" 
                                                    disabled={!isPMEnabled || !isEditable}
                                                    value={isPMEnabled ? maxSlotsPM : 0} 
                                                    onChange={(e) => isEditable && setMaxSlotsPM(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">PM Session Hours *</Label>
                                            <Input 
                                                type="text" 
                                                disabled={!isPMEnabled || !isEditable}
                                                value={isPMEnabled ? pmTimeLabel : "Disabled"} 
                                                onChange={(e) => isEditable && setPmTimeLabel(e.target.value)}
                                                placeholder="01:00 PM - 04:00 PM"
                                                className={cn(
                                                    "h-11 px-4 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] font-bold text-xs",
                                                    isPMEnabled && !pmTimeLabel.trim() && "border-rose-500 ring-1 ring-rose-500"
                                                )}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Active Scheduling Days</Label>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { dayNum: 1, label: "Mon" },
                                        { dayNum: 2, label: "Tue" },
                                        { dayNum: 3, label: "Wed" },
                                        { dayNum: 4, label: "Thu" },
                                        { dayNum: 5, label: "Fri" },
                                        { dayNum: 6, label: "Sat" },
                                        { dayNum: 0, label: "Sun" },
                                    ].map((d) => {
                                        const isActive = activeDays.includes(d.dayNum);
                                        return (
                                            <button
                                                key={d.dayNum}
                                                type="button"
                                                disabled={!isEditable}
                                                onClick={() => toggleDay(d.dayNum)}
                                                className={cn(
                                                    "px-4 py-2 text-xs font-black uppercase rounded-full border transition-all duration-200 active:scale-95",
                                                    isActive 
                                                        ? "bg-rose-600 text-white border-transparent shadow-md"
                                                        : "bg-slate-50 dark:bg-black/20 text-slate-500 border-slate-200 dark:border-white/5 hover:border-slate-350",
                                                    !isEditable && "opacity-60 cursor-not-allowed"
                                                )}
                                            >
                                                {d.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Blocked Dates Management */}
                        <div className="space-y-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Blocked / Holiday Dates</Label>
                            <div className="flex gap-2">
                                <Input 
                                    type="date"
                                    disabled={!isEditable}
                                    value={newBlockedDate}
                                    onChange={(e) => isEditable && setNewBlockedDate(e.target.value)}
                                    className="h-12 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                />
                                <Button 
                                    type="button"
                                    disabled={!isEditable}
                                    onClick={addBlockedDate}
                                    className="h-12 px-5 font-black uppercase text-xs rounded-xl flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
                                >
                                    <Plus className="w-4 h-4" /> Block
                                </Button>
                            </div>

                            <div className="border border-slate-100 dark:border-[#2a3040] rounded-2xl bg-slate-50/50 dark:bg-black/10 p-3 max-h-[140px] overflow-y-auto space-y-1.5 custom-scrollbar">
                                {blockedDates.length === 0 ? (
                                    <p className="text-[10px] text-slate-400 font-bold uppercase italic text-center py-6">No dates blocked currently</p>
                                ) : (
                                    blockedDates.map(dateStr => (
                                        <div key={dateStr} className="flex items-center justify-between bg-white dark:bg-[#1e2330] px-3 py-1.5 rounded-xl border border-slate-100 dark:border-[#2a3040] shadow-sm">
                                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                                                {new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </span>
                                            {isEditable && (
                                                <button 
                                                    type="button"
                                                    onClick={() => removeBlockedDate(dateStr)}
                                                    className="text-red-500 hover:text-red-650 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-[#2a3040]" />

                    <div className="flex justify-end pt-2">
                        <Button 
                            type="button"
                            onClick={handleSaveAppointmentConfig}
                            disabled={isSavingConfig || !isEditable}
                            className={cn(
                                "h-12 px-10 font-black uppercase text-xs rounded-xl shadow-lg transition-all",
                                isEditable 
                                    ? "bg-rose-600 hover:bg-rose-700 text-white hover:opacity-90 active:scale-95" 
                                    : "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                            )}
                        >
                            {isReadOnly ? "Read-Only View Mode" : (isEditable ? (isSavingConfig ? "Saving..." : "Save Settings") : "Select a Health Center to Edit")}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
