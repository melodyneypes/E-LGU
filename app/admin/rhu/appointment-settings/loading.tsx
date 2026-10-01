import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Activity, Clock, CalendarDays, Plus } from "lucide-react";

export default function AppointmentSettingsLoading() {
    return (
        <div className="p-4 md:p-8 max-w-full mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
            {/* Main Configuration Card Skeleton */}
            <Card className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161a24] shadow-sm overflow-hidden">
                {/* Header Banner */}
                <CardHeader className="p-6 md:p-8 bg-slate-50/50 dark:bg-black/20 border-b border-slate-100 dark:border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Activity className="w-6 h-6 text-rose-500 shrink-0" />
                                <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                                    RHU Appointment Configuration
                                </h1>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Configure booking slot limits, active weekdays, and blocked dates for Rural Health Unit appointments.
                            </p>
                        </div>

                        {/* Special Medical Events Button Skeleton */}
                        <div className="h-12 px-6 rounded-xl bg-gradient-to-r from-rose-600/80 to-pink-600/80 text-white font-black uppercase text-xs flex items-center gap-2 shadow-xl shrink-0">
                            <CalendarDays className="w-4 h-4 text-white" />
                            <span>Special Medical Events Schedule</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-4 md:p-6 lg:p-8 px-4 md:px-8 space-y-6">
                    {/* Notice Banner Skeleton */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center gap-3">
                        <Clock className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="space-y-1 flex-1">
                            <Skeleton className="h-4 w-52 rounded bg-amber-500/20" />
                            <Skeleton className="h-3 w-full max-w-xl rounded bg-amber-500/15" />
                        </div>
                    </div>

                    {/* Configure Schedule for Health Center Skeleton */}
                    <div className="space-y-2 p-4 rounded-2xl bg-slate-50/50 dark:bg-black/10 border border-slate-100 dark:border-[#2a3040]">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                            Configure Schedule for Health Center:
                        </span>
                        <Skeleton className="w-full sm:max-w-md h-12 rounded-xl bg-slate-100 dark:bg-slate-900" />
                    </div>

                    {/* 2-Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* Left Side: Sessions & Active Days */}
                        <div className="space-y-6">
                            {/* AM Session Box */}
                            <div className="p-4 rounded-2xl border border-rose-500/20 bg-slate-50/80 dark:bg-black/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-rose-500" />
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            AM Session (Morning)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                            Active
                                        </span>
                                        <Skeleton className="h-6 w-11 rounded-full bg-rose-500/20" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">AM Slots Capacity</span>
                                        <Skeleton className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-900" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">AM Session Hours</span>
                                        <Skeleton className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-900" />
                                    </div>
                                </div>
                            </div>

                            {/* PM Session Box */}
                            <div className="p-4 rounded-2xl border border-rose-500/20 bg-slate-50/80 dark:bg-black/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-rose-500" />
                                        <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                            PM Session (Afternoon)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                            Active
                                        </span>
                                        <Skeleton className="h-6 w-11 rounded-full bg-rose-500/20" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">PM Slots Capacity</span>
                                        <Skeleton className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-900" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">PM Session Hours</span>
                                        <Skeleton className="h-11 w-full rounded-xl bg-slate-100 dark:bg-slate-900" />
                                    </div>
                                </div>
                            </div>

                            {/* Active Days */}
                            <div className="space-y-2 p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-black/10">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Active Operating Weekdays</span>
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                                        <Skeleton key={i} className="h-9 w-14 rounded-xl bg-slate-200 dark:bg-slate-700/60" />
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Blocked Dates & Actions */}
                        <div className="space-y-6">
                            {/* Blocked Dates Box */}
                            <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-black/10 space-y-3">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 block">
                                    Blocked / Holiday Dates
                                </span>
                                <div className="flex gap-2">
                                    <Skeleton className="h-11 flex-1 rounded-xl bg-slate-100 dark:bg-slate-900" />
                                    <div className="h-11 px-5 rounded-xl bg-rose-600/80 text-white font-bold text-xs uppercase flex items-center gap-1.5 shrink-0">
                                        <Plus className="w-4 h-4" />
                                        <span>Block</span>
                                    </div>
                                </div>
                                <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-[#2a3040] flex items-center justify-center">
                                    <span className="text-xs text-slate-400 font-bold uppercase italic tracking-wider">
                                        No Dates Blocked Currently
                                    </span>
                                </div>
                            </div>

                            {/* Save Button Skeleton */}
                            <div className="pt-2">
                                <Skeleton className="h-12 w-full rounded-2xl bg-rose-600/80" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
