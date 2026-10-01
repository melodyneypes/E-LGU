import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Megaphone, CheckCircle2, Pin, AlertTriangle, Search, Plus, MapPin } from "lucide-react";

export default function AnnouncementsLoading() {
    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <Activity className="mr-3 w-10 h-10 text-emerald-500" />
                        RHU Health Advisories
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                        Manage Rural Health Unit advisories, immunization drives, and public medical announcements.
                    </p>
                </div>
            </div>

            {/* Stat Cards Skeleton (4 Cards) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { title: "Total Notices", icon: Megaphone, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { title: "Active Notices", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { title: "Pinned Briefs", icon: Pin, color: "text-orange-500", bg: "bg-orange-500/10" },
                    { title: "Critical Alerts", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
                ].map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <Card key={idx} className="border-none shadow-sm bg-white dark:bg-[#151b2b] rounded-xl overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                            <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                            {card.title}
                                        </p>
                                        <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                    </div>
                                    <div className={`p-2.5 rounded-xl shadow-inner shrink-0 ${card.bg}`}>
                                        <Icon className={`w-4 h-4 ${card.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Filter and Table Container */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden">
                {/* Filter Bar Skeleton */}
                <div className="p-6 border-b border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#151b2b]">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                        <div className="flex flex-wrap flex-1 gap-4 w-full sm:w-auto">
                            {/* Search Input Skeleton */}
                            <div className="relative flex-1 min-w-[280px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <div className="pl-10 h-12 bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center text-xs text-slate-400 font-bold italic">
                                    Search title or details...
                                </div>
                            </div>

                            {/* Priority Dropdown Skeleton */}
                            <div className="w-[150px] h-12 bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center px-3 justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">All Priorities</span>
                            </div>

                            {/* Location Dropdown Skeleton */}
                            <div className="w-[160px] h-12 bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3040] rounded-xl flex items-center px-3 gap-2">
                                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span className="text-xs font-bold italic text-slate-400">All Locations</span>
                            </div>
                        </div>

                        {/* New Notice Button Skeleton */}
                        <div className="w-full sm:w-auto h-12 text-white font-black uppercase tracking-widest text-[10px] px-8 rounded-xl bg-red-600/80 flex items-center justify-center gap-2 shadow-lg">
                            <Plus className="w-4 h-4" />
                            <span>New Notice</span>
                        </div>
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-3 px-8 py-4 bg-slate-50/60 dark:bg-[#1a1f2e]/60 border-b border-slate-200 dark:border-[#2a3040] text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                    <div className="col-span-4">Notice Details</div>
                    <div className="col-span-3">Scope / Barangay</div>
                    <div className="col-span-2">Priority</div>
                    <div className="col-span-1">Date Posted</div>
                    <div className="col-span-1 text-center">Active</div>
                    <div className="col-span-1 text-right">Actions</div>
                </div>

                {/* Shimmering Table Rows */}
                <div className="divide-y divide-slate-100 dark:divide-[#2a3040]/50">
                    {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-3 px-8 py-5 items-center">
                            {/* Notice Details */}
                            <div className="col-span-4 flex items-start gap-2">
                                <Pin className="w-3.5 h-3.5 text-orange-500 mt-1 shrink-0" />
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <Skeleton className="h-4 w-56 rounded bg-slate-200 dark:bg-slate-700/60" />
                                    <Skeleton className="h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                                </div>
                            </div>

                            {/* Scope */}
                            <div className="col-span-3">
                                <Skeleton className="h-6 w-32 rounded-full bg-purple-500/10" />
                            </div>

                            {/* Priority */}
                            <div className="col-span-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <Skeleton className="h-3.5 w-16 rounded bg-slate-200 dark:bg-slate-700/60" />
                            </div>

                            {/* Date */}
                            <div className="col-span-1">
                                <Skeleton className="h-3.5 w-20 rounded bg-slate-200 dark:bg-slate-700/60" />
                            </div>

                            {/* Active Switch */}
                            <div className="col-span-1 flex justify-center">
                                <Skeleton className="h-5 w-9 rounded-full bg-rose-500/20" />
                            </div>

                            {/* Actions */}
                            <div className="col-span-1 flex justify-end gap-1.5">
                                <Skeleton className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                <Skeleton className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
