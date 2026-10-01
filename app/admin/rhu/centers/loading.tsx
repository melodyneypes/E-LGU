import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
    Building2,
    Hospital,
    Users,
    Search,
    Stethoscope,
    Plus,
    MapPin,
    Clock,
    Phone,
    Mail
} from "lucide-react";

export default function RHUCentersLoading() {
    return (
        <div className="p-6 md:p-8 min-h-screen bg-slate-50 dark:bg-slate-950 space-y-6 animate-in fade-in duration-300">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-2xl shrink-0">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                Health Centers &amp; Medical Roster
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Manage municipal health centers, barangay health sub-stations, and assign Doctors, Nurses, Midwives &amp; Dentists to specific services.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-row items-center gap-2.5 shrink-0 flex-nowrap">
                    <div className="bg-rose-600/80 text-white font-bold text-xs rounded-xl h-11 px-5 shadow-lg shadow-rose-600/20 shrink-0 flex items-center gap-2 whitespace-nowrap">
                        <Stethoscope className="w-4 h-4" /> Assign Medical Personnel
                    </div>
                    <div className="bg-slate-900/80 dark:bg-slate-800 text-white font-bold text-xs rounded-xl h-11 px-5 shrink-0 flex items-center gap-2 whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Add Health Center
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-white/10 pb-2">
                <div className="px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 bg-rose-600 text-white shadow-md shadow-rose-600/20">
                    <Hospital className="w-4 h-4" /> Health Centers
                </div>
                <div className="px-5 py-2.5 text-xs font-bold rounded-xl flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                    <Users className="w-4 h-4" /> Medical Personnel &amp; Staff
                </div>
            </div>

            {/* Metric Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1 min-w-0 flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Center Status</p>
                            <h3 className="font-black text-slate-900 dark:text-white text-xl">
                                ACTIVE
                            </h3>
                        </div>
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl shrink-0 ml-2">
                            <Building2 className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Centers</p>
                            <Skeleton className="h-7 w-10 rounded-lg bg-rose-500/20" />
                        </div>
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl">
                            <Hospital className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Center Staffs</p>
                            <Skeleton className="h-7 w-10 rounded-lg bg-blue-500/20" />
                        </div>
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-2xl">
                            <Users className="w-4 h-4" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <div className="pl-10 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-center text-slate-400">
                        Search center name, code, barangay, address, or assigned staff...
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-10 text-xs w-[160px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 flex items-center justify-between text-slate-500">
                        <span>All Barangays</span>
                        <div className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700" />
                    </div>

                    <div className="h-10 text-xs w-[150px] rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 flex items-center justify-between text-slate-500">
                        <span>All Status</span>
                        <div className="w-3 h-3 rounded bg-slate-300 dark:bg-slate-700" />
                    </div>
                </div>
            </div>

            {/* Health Center Cards Grid Skeleton (6 cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Card
                        key={i}
                        className="rounded-2xl border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900 flex flex-col justify-between overflow-hidden p-5 space-y-4 animate-pulse"
                    >
                        <CardContent className="p-0 space-y-4">
                            {/* Header badge + title */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-20 rounded-md bg-blue-500/15" />
                                    <Skeleton className="h-5 w-44 rounded-lg bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-full bg-emerald-500/15 shrink-0" />
                            </div>

                            {/* Details List */}
                            <div className="space-y-2.5 pt-1 text-xs">
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-rose-500/60 shrink-0 mt-0.5" />
                                    <Skeleton className="h-3.5 w-56 rounded bg-slate-200 dark:bg-slate-700/60" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-amber-500/60 shrink-0" />
                                    <Skeleton className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-700/60" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-blue-500/60 shrink-0" />
                                    <Skeleton className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-700/60" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-emerald-500/60 shrink-0" />
                                    <Skeleton className="h-3.5 w-48 rounded bg-slate-200 dark:bg-slate-700/60" />
                                </div>
                            </div>

                            {/* Assigned services tags placeholder */}
                            <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Skeleton className="h-5 w-24 rounded-lg bg-slate-100 dark:bg-slate-800" />
                                <Skeleton className="h-5 w-28 rounded-lg bg-slate-100 dark:bg-slate-800" />
                                <Skeleton className="h-5 w-20 rounded-lg bg-slate-100 dark:bg-slate-800" />
                            </div>
                        </CardContent>

                        {/* Bottom action row */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                            <Skeleton className="h-8 w-20 rounded-xl bg-slate-100 dark:bg-slate-800" />
                            <div className="flex gap-1.5">
                                <Skeleton className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
                                <Skeleton className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
