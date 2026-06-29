"use client";

import React, { useState } from "react";
import { Calendar, ArrowLeft, ChevronRight, Clock, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface SchedulePickerProps {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    selectedSlot: string;
    setSelectedSlot: (slot: string) => void;
    bookedSlots: { appointmentDate: Date; appointmentSlot: string }[];
    config: {
        maxSlots: number;
        maxSlotsAM?: number;
        maxSlotsPM?: number;
        blockedDates: string[];
        activeDays: number[];
    };
    themeColor?: string;
}

export default function SchedulePicker({
    selectedDate,
    setSelectedDate,
    selectedSlot,
    setSelectedSlot,
    bookedSlots,
    config,
    themeColor = "#2563eb"
}: SchedulePickerProps) {
    const SLOTS = [
        "08:00 AM - 11:00 AM",
        "01:00 PM - 04:00 PM"
    ];

    const [currentMonth, setCurrentMonth] = useState<Date>(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const changeMonth = (offset: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysCount = new Date(year, month + 1, 0).getDate();
        const firstDayIndex = new Date(year, month, 1).getDay();

        const days = [];
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(null);
        }
        for (let day = 1; day <= daysCount; day++) {
            days.push(new Date(year, month, day));
        }
        return days;
    };

    const formatDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Check if slot count exceeds config limit
    const getSlotAvailability = (dateStr: string, slot: string) => {
        if (!dateStr) return true;
        const targetDate = new Date(dateStr);
        const count = bookedSlots.filter(b => {
            const bDate = new Date(b.appointmentDate);
            return (
                bDate.getUTCFullYear() === targetDate.getUTCFullYear() &&
                bDate.getUTCMonth() === targetDate.getUTCMonth() &&
                bDate.getUTCDate() === targetDate.getUTCDate() &&
                b.appointmentSlot === slot
            );
        }).length;

        const isAM = slot.includes("AM") || slot.toUpperCase().includes("08:00 AM");
        const configAny = config as any;
        const maxLimit = isAM
            ? (configAny.maxSlotsAM ?? 25)
            : (configAny.maxSlotsPM ?? 25);

        return count < maxLimit;
    };

    // Check if a specific date is disabled
    const isDateDisabled = (date: Date | null) => {
        if (!date) return true;
        const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday

        // Disable weekends if not active
        if (!config.activeDays.includes(dayOfWeek)) return true;

        // Disable blocked dates
        const formattedDate = formatDateString(date);
        if (config.blockedDates.includes(formattedDate)) return true;

        // Disable past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date < today) return true;

        // Check if all slots are fully booked
        const totalMaxSlots = config.maxSlots;
        const bookedOnThisDay = bookedSlots.filter(b => {
            const bDate = new Date(b.appointmentDate);
            return (
                bDate.getFullYear() === date.getFullYear() &&
                bDate.getMonth() === date.getMonth() &&
                bDate.getDate() === date.getDate()
            );
        }).length;
        if (bookedOnThisDay >= totalMaxSlots) return true;

        return false;
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
            {/* Ambient background blur accent */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-10 dark:opacity-5 pointer-events-none" style={{ backgroundColor: themeColor }} />

            {/* Left Side: Appointment Date Selection */}
            <div className="space-y-6 relative z-10">
                <div className="space-y-4">
                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" style={{ color: themeColor }} /> 1. Select Date
                    </Label>

                    <div className="border border-slate-200/80 dark:border-white/10 rounded-[2.5rem] p-5 md:p-6 bg-white/60 dark:bg-[#0c0f16]/60 backdrop-blur-md shadow-xl dark:shadow-2xl/40 space-y-5 select-none transition-all">
                        {/* Calendar Header: Month, Year and Navigation */}
                        <div className="flex items-center justify-between px-1">
                            <span className="font-black text-sm md:text-base uppercase tracking-wider text-slate-900 dark:text-white italic">
                                {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => changeMonth(-1)}
                                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-650 dark:text-slate-400 flex items-center justify-center active:scale-90"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => changeMonth(1)}
                                    className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-650 dark:text-slate-400 flex items-center justify-center active:scale-90"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Weekdays Grid */}
                        <div className="grid grid-cols-7 text-center gap-1.5">
                            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                                <span key={day} className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500 py-1">
                                    {day}
                                </span>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1.5">
                            {getDaysInMonth(currentMonth).map((day, idx) => {
                                if (!day) {
                                    return <div key={`empty-${idx}`} />;
                                }
                                const formatted = formatDateString(day);
                                const disabled = isDateDisabled(day);
                                const isSelected = selectedDate === formatted;

                                return (
                                    <button
                                        key={formatted}
                                        type="button"
                                        disabled={disabled}
                                        onClick={() => {
                                            setSelectedDate(formatted);
                                            setSelectedSlot("");
                                        }}
                                        className={cn(
                                            "h-9 w-9 md:h-10 md:w-10 rounded-full mx-auto flex items-center justify-center text-xs font-bold transition-all duration-300 relative group",
                                            isSelected
                                                ? "text-white font-black shadow-lg scale-110 active:scale-95"
                                                : disabled
                                                    ? "text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-35"
                                                    : "text-slate-700 dark:text-slate-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-white/5 dark:hover:text-white"
                                        )}
                                        style={isSelected ? { backgroundColor: themeColor } : {}}
                                    >
                                        <span>{day.getDate()}</span>
                                        {!disabled && !isSelected && (
                                            <div className="absolute bottom-1 w-1 h-1 rounded-full bg-slate-300 dark:bg-white/20 group-hover:bg-primary" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side: Time Slots Selection */}
            <div className="space-y-6 relative z-10">
                <div className="space-y-4">
                    <Label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 italic ml-1 flex items-center gap-1.5">
                        <Clock className="w-4 h-4" style={{ color: themeColor }} /> 2. Choose Time Session
                    </Label>
                    {!selectedDate ? (
                        <div className="h-[260px] border border-dashed border-slate-200 dark:border-white/10 rounded-[2.5rem] bg-slate-50/50 dark:bg-white/[0.01] flex flex-col items-center justify-center gap-2 text-slate-400 italic text-xs shadow-inner">
                            <Calendar className="w-8 h-8 opacity-40 animate-pulse text-slate-400" />
                            <span>Select an appointment date first</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                            {SLOTS.map((slot) => {
                                const available = getSlotAvailability(selectedDate, slot);
                                const active = selectedSlot === slot;
                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        disabled={!available}
                                        onClick={() => setSelectedSlot(slot)}
                                        className={cn(
                                            "p-5 border rounded-[2rem] flex items-center justify-between text-left transition-all duration-300 shadow-sm relative overflow-hidden group/slot",
                                            !available
                                                ? "opacity-35 cursor-not-allowed bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/5"
                                                : active
                                                    ? "border-primary bg-primary/[0.04] dark:bg-primary/[0.08] scale-[1.01] ring-2 ring-primary/20"
                                                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.02] hover:border-slate-350 dark:hover:border-white/20 hover:scale-[1.01]"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Circular selector */}
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0",
                                                active
                                                    ? "bg-primary border-primary text-white"
                                                    : "border-slate-300 dark:border-white/20 bg-white dark:bg-black/20"
                                            )}
                                                style={active ? { borderColor: themeColor, backgroundColor: themeColor } : {}}
                                            >
                                                {active && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </div>
                                            <div className="space-y-0.5">
                                                <span className="font-black text-xs md:text-sm text-slate-800 dark:text-slate-100">{slot}</span>
                                                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Regular processing hours</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                                            available
                                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                : "bg-red-500/10 text-red-500 border border-red-500/20"
                                        )}>
                                            {available ? "Available" : "Full"}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
