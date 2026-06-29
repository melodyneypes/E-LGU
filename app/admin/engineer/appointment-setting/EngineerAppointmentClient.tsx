"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Plus, Trash2 } from "lucide-react";
import { updateAppointmentConfig } from "@/app/admin/settings/actions";
import { cn } from "@/lib/utils";

interface EngineerAppointmentClientProps {
    themeColor?: string;
    appointmentConfig: {
        id: string;
        department: string;
        maxSlots: number;
        maxSlotsAM: number;
        maxSlotsPM: number;
        activeDays: number[];
        blockedDates: string[];
    };
}

export default function EngineerAppointmentClient({ 
    themeColor = "#e11d48",
    appointmentConfig
}: EngineerAppointmentClientProps) {
    // Appointment Settings State
    const [maxSlotsAM, setMaxSlotsAM] = useState<number>(appointmentConfig.maxSlotsAM ?? 25);
    const [maxSlotsPM, setMaxSlotsPM] = useState<number>(appointmentConfig.maxSlotsPM ?? 25);
    const [activeDays, setActiveDays] = useState<number[]>(appointmentConfig.activeDays);
    const [blockedDates, setBlockedDates] = useState<string[]>(appointmentConfig.blockedDates);
    const [newBlockedDate, setNewBlockedDate] = useState("");
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    const toggleDay = (dayNum: number) => {
        setActiveDays(prev => 
            prev.includes(dayNum) 
                ? prev.filter(d => d !== dayNum) 
                : [...prev, dayNum].sort()
        );
    };

    const addBlockedDate = () => {
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
        setIsSavingConfig(true);
        try {
            const res = await updateAppointmentConfig("ENGINEERING", {
                maxSlots: maxSlotsAM + maxSlotsPM,
                maxSlotsAM,
                maxSlotsPM,
                activeDays,
                blockedDates
            });
            if (res.success) {
                toast.success("Engineering Appointment settings updated successfully!");
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
        if (appointmentConfig) {
            setMaxSlotsAM(appointmentConfig.maxSlotsAM ?? 25);
            setMaxSlotsPM(appointmentConfig.maxSlotsPM ?? 25);
            setActiveDays(appointmentConfig.activeDays);
            setBlockedDates(appointmentConfig.blockedDates);
        }
    }, [appointmentConfig]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Appointment Schedule Settings Card */}
            <Card className="border-slate-200 dark:border-[#2a3040] shadow-xl overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-white dark:bg-[#1e2330]">
                <CardHeader className="bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-[#2a3040] p-5 md:p-6 px-4 md:px-8">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-3 text-2xl font-black italic uppercase tracking-tighter">
                            <Calendar className="w-6 h-6" style={{ color: themeColor }} />
                            Engineering Appointment Configuration
                        </CardTitle>
                        <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-60">
                            Configure booking slot limits, active weekdays, and blocked dates for Engineering appointments.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-4 md:p-6 lg:p-8 px-4 md:px-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* Left Side: General Limits & Active Days */}
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">AM Slots Capacity</Label>
                                    <div className="relative inline-flex items-center w-full">
                                        <Clock className="absolute left-4 w-4 h-4 text-slate-400" />
                                        <Input 
                                            type="number" 
                                            value={maxSlotsAM} 
                                            onChange={(e) => setMaxSlotsAM(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="h-12 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">PM Slots Capacity</Label>
                                    <div className="relative inline-flex items-center w-full">
                                        <Clock className="absolute left-4 w-4 h-4 text-slate-400" />
                                        <Input 
                                            type="number" 
                                            value={maxSlotsPM} 
                                            onChange={(e) => setMaxSlotsPM(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="h-12 pl-11 pr-4 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-sm"
                                        />
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
                                                onClick={() => toggleDay(d.dayNum)}
                                                className={cn(
                                                    "px-4 py-2 text-xs font-black uppercase rounded-full border transition-all duration-200 active:scale-95",
                                                    isActive 
                                                        ? "text-white border-transparent"
                                                        : "bg-slate-50 dark:bg-black/20 text-slate-500 border-slate-200 dark:border-white/5 hover:border-slate-350"
                                                )}
                                                style={isActive ? { backgroundColor: themeColor } : {}}
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
                                    value={newBlockedDate}
                                    onChange={(e) => setNewBlockedDate(e.target.value)}
                                    className="h-12 rounded-xl bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-[#2a3040] font-bold text-xs"
                                />
                                <Button 
                                    type="button"
                                    onClick={addBlockedDate}
                                    className="h-12 px-5 font-black uppercase text-xs rounded-xl flex items-center gap-1.5"
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
                                            <button 
                                                type="button"
                                                onClick={() => removeBlockedDate(dateStr)}
                                                className="text-red-500 hover:text-red-650 p-1 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <Separator className="bg-slate-100 dark:bg-[#2a3040] my-2" />

                    <Button
                        onClick={handleSaveAppointmentConfig}
                        disabled={isSavingConfig}
                        className="w-full h-12 text-white rounded-xl font-black uppercase tracking-widest transition-all active:scale-[0.99] border-none hover:opacity-90"
                        style={{ backgroundColor: themeColor }}
                    >
                        {isSavingConfig ? "Saving Schedule..." : "Save Appointment Settings"}
                    </Button>
                </CardContent>
            </Card>

            {/* Bottom Info */}
            <div className="max-w-3xl mx-auto text-center space-y-2 opacity-40">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] italic">Mapandan Municipal Portal • Unified Engineering Services</p>
                <div className="h-0.5 w-12 bg-slate-300 dark:bg-white/10 mx-auto rounded-full" />
            </div>
        </div>
    );
}
