"use client";

import React, { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { 
    Truck, 
    UserCheck, 
    FolderArchive, 
    Calendar, 
    PhoneCall, 
    ShieldAlert, 
    Activity, 
    CheckCircle2, 
    Clock, 
    MapPin, 
    ArrowUpRight, 
    Car, 
    Phone, 
    User 
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSystemTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";
import { updateDriverDutyStatus, updateMDRRMOScheduleStatus } from "./actions";

interface MDRRMODashboardClientProps {
    initialStats: any;
    initialFleet: any[];
    initialDrivers: any[];
    initialExpiringDocs: any[];
    initialSchedules: any[];
    initialAnnouncements: any[];
    initialHotlines: any[];
    isReadOnly?: boolean;
    userRole?: string;
    userName?: string;
}

export default function MDRRMODashboardClient({
    initialStats,
    initialFleet,
    initialDrivers,
    initialExpiringDocs,
    initialSchedules,
    initialHotlines,
    isReadOnly = false
}: MDRRMODashboardClientProps) {
    let themeColor = "#ea580c"; // MDRRMO emergency orange
    try {
        const sys = useSystemTheme();
        if (sys?.themeColor) themeColor = sys.themeColor;
    } catch {}

    const [stats] = useState(initialStats);
    const [fleet] = useState(initialFleet);
    const [drivers, setDrivers] = useState(initialDrivers);
    const [schedules, setSchedules] = useState(initialSchedules);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

    // Helper for driver status colors
    const getDriverStatusColor = (status: string) => {
        switch (status) {
            case "ON_DUTY":
                return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
            case "ON_TRIP":
                return "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 animate-pulse";
            case "STANDBY":
                return "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
            case "ON_LEAVE":
                return "text-purple-700 dark:text-purple-400 bg-purple-500/10 border-purple-500/30";
            case "OFF_DUTY":
            default:
                return "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
    };

    // Helper for schedule status colors
    const getScheduleStatusColor = (status: string) => {
        switch (status) {
            case "DISPATCHED":
            case "IN_TRANSIT":
                return "text-blue-700 dark:text-blue-400 bg-blue-500/10 border-blue-500/30";
            case "SCHEDULED":
                return "text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30";
            case "COMPLETED":
                return "text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
            case "CANCELLED":
                return "text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30";
            default:
                return "text-slate-700 dark:text-slate-400 bg-slate-500/10 border-slate-500/30";
        }
    };

    // Fast inline driver duty status change
    const handleQuickDriverStatusChange = async (driverId: string, newStatus: string) => {
        setIsUpdatingStatus(driverId);
        try {
            const res = await updateDriverDutyStatus(driverId, newStatus);
            if (res.success && res.driver) {
                setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: newStatus } : d));
                toast.success(`Updated duty status for ${res.driver.name} to ${newStatus.replace("_", " ")}`);
            } else {
                toast.error(res.error || "Failed to update driver status");
            }
        } catch {
            toast.error("Network error updating driver status");
        } finally {
            setIsUpdatingStatus(null);
        }
    };

    // Fast schedule status progression
    const handleProgressScheduleStatus = async (scheduleId: string, currentStatus: string) => {
        let nextStatus = "DISPATCHED";
        if (currentStatus === "SCHEDULED") nextStatus = "DISPATCHED";
        else if (currentStatus === "DISPATCHED") nextStatus = "IN_TRANSIT";
        else if (currentStatus === "IN_TRANSIT") nextStatus = "COMPLETED";
        else return;

        try {
            const res = await updateMDRRMOScheduleStatus(scheduleId, nextStatus);
            if (res.success) {
                setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, status: nextStatus } : s));
                toast.success(`Trip status moved to ${nextStatus}`);
            } else {
                toast.error(res.error || "Failed to progress schedule status");
            }
        } catch {
            toast.error("Network error updating trip status");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ========================================================================= */}
            {/* TOP HEADER: MDRRMO COMMAND CENTER */}
            {/* ========================================================================= */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-[#161a24] p-6 md:p-8 rounded-[1.75rem] border border-slate-200/80 dark:border-slate-800/80 shadow-md relative overflow-hidden transition-colors">
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
                        <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                        Municipal Disaster Risk Reduction & Management Office
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                        <Truck className="w-8 h-8 shrink-0" style={{ color: themeColor }} />
                        MDRRMO Emergency Hub & Fleet Logistics
                    </h1>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 max-w-2xl">
                        Monitor active ambulance readiness, oversee on-duty driver rotations, manage digitized vehicle compliance records (OR/CR), and coordinate public emergency advisories.
                    </p>
                </div>

                {/* Sub-module Navigation Pills */}
                <div className="flex flex-wrap items-center gap-2 relative z-10">
                    <Link
                        href="/admin/mdrrmo/ambulance"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all shadow-sm"
                    >
                        <Truck className="w-4 h-4 text-emerald-500" />
                        Fleet Registry
                    </Link>
                    <Link
                        href="/admin/mdrrmo/drivers"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all shadow-sm"
                    >
                        <UserCheck className="w-4 h-4 text-blue-500" />
                        Drivers Board
                    </Link>
                    <Link
                        href="/admin/mdrrmo/documents"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all shadow-sm"
                    >
                        <FolderArchive className="w-4 h-4 text-amber-500" />
                        OR/CR Filing
                    </Link>
                    <Link
                        href="/admin/mdrrmo/schedule"
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all shadow-sm"
                    >
                        <Calendar className="w-4 h-4 text-purple-500" />
                        Dispatch Schedule
                    </Link>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 4 CORE KPI METRIC CARDS */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. Active Fleet Readiness */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="h-1 w-full bg-emerald-500" />
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fleet Readiness</span>
                            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <Truck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                {stats.activeFleet} / {stats.totalFleet}
                            </span>
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                Units Active
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                            <div 
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${stats.totalFleet > 0 ? (stats.activeFleet / stats.totalFleet) * 100 : 0}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Drivers On Duty */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="h-1 w-full bg-blue-500" />
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver Coverage</span>
                            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <UserCheck className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                {stats.driversOnDuty} / {stats.totalDrivers}
                            </span>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                                On Duty Now
                            </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {stats.totalDrivers - stats.driversOnDuty} standby or off-shift
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Active Dispatches */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className="h-1 w-full bg-purple-500" />
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dispatches & Trips</span>
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                <Activity className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                {stats.activeDispatches}
                            </span>
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                Live In-Transit
                            </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {initialSchedules.filter(s => s.status === "SCHEDULED").length} scheduled ahead
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Vehicle Compliance & Expiration Radar */}
                <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161a24] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                    <div className={cn("h-1 w-full", stats.expiredDocsCount > 0 ? "bg-rose-500" : stats.expiringDocsCount > 0 ? "bg-amber-500" : "bg-emerald-500")} />
                    <CardContent className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">OR/CR Compliance</span>
                            <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center",
                                stats.expiredDocsCount > 0 ? "bg-rose-500/10 text-rose-600" : stats.expiringDocsCount > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                            )}>
                                <FolderArchive className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                                {stats.expiringDocsCount + stats.expiredDocsCount}
                            </span>
                            <span className={cn(
                                "text-xs font-bold uppercase tracking-wider",
                                stats.expiredDocsCount > 0 ? "text-rose-600" : stats.expiringDocsCount > 0 ? "text-amber-600" : "text-emerald-600"
                            )}>
                                Expiry Warnings
                            </span>
                        </div>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                            {stats.expiredDocsCount > 0 ? `${stats.expiredDocsCount} expired papers require renewal` : "All fleet documents are up to date"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* ========================================================================= */}
            {/* TWO-COLUMN COMMAND CENTER LAYOUT */}
            {/* ========================================================================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT COLUMN: FLEET REGISTRY & LIVE DRIVERS (7 COLS) */}
                <div className="lg:col-span-7 space-y-8">
                    {/* SECTION 1: AMBULANCE FLEET MATRIX */}
                    <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-md rounded-[1.75rem] bg-white dark:bg-[#161a24] overflow-hidden">
                        <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 px-6 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        Ambulance Fleet Status
                                    </CardTitle>
                                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Vehicular allocation & station assignments
                                    </CardDescription>
                                </div>
                            </div>
                            <Link
                                href="/admin/mdrrmo/ambulance"
                                className="text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
                                style={{ color: themeColor }}
                            >
                                Manage Fleet <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </CardHeader>

                        <CardContent className="p-6 space-y-4">
                            {fleet.length === 0 ? (
                                <div className="text-center p-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    No ambulance vehicles registered in fleet.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {fleet.map((vehicle) => {
                                        const assignedDriver = drivers.find(d => d.assignedAmbulanceId === vehicle.id || d.id === vehicle.assignedDriverId);
                                        const isVehicleActive = vehicle.status === "ACTIVE" || vehicle.status === "STANDBY" || vehicle.status === "ON DUTY";

                                        return (
                                            <div
                                                key={vehicle.id}
                                                className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#1a1f2c] flex flex-col justify-between space-y-3 group hover:shadow-md transition-all"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                            {vehicle.unit}
                                                        </h4>
                                                        <div 
                                                            className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-200/80 dark:bg-black/40 border border-slate-300 dark:border-white/10 font-mono text-[10px] font-black tracking-widest"
                                                            style={{ color: themeColor }}
                                                        >
                                                            {vehicle.plateNumber || "NO PLATE"}
                                                        </div>
                                                    </div>
                                                    <span className={cn(
                                                        "text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border",
                                                        isVehicleActive
                                                            ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                                                            : "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20"
                                                    )}>
                                                        {vehicle.status}
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                        <span className="truncate">{vehicle.station || "Main Station"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                        <span className="truncate">
                                                            Driver: <span className="font-bold text-slate-800 dark:text-slate-200">{assignedDriver ? assignedDriver.name : "Unassigned"}</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between">
                                                    <Link
                                                        href={`/admin/mdrrmo/documents?ambulanceId=${vehicle.id}`}
                                                        className="text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1"
                                                    >
                                                        <FolderArchive className="w-3 h-3 text-amber-500" />
                                                        View Papers ({vehicle.documents?.length || 0})
                                                    </Link>
                                                    <Link
                                                        href={`/admin/mdrrmo/ambulance?edit=${vehicle.id}`}
                                                        className="text-[10px] font-black uppercase tracking-wider hover:underline"
                                                        style={{ color: themeColor }}
                                                    >
                                                        Details
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* SECTION 2: DRIVER ROSTER & LIVE DUTY MONITOR */}
                    <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-md rounded-[1.75rem] bg-white dark:bg-[#161a24] overflow-hidden">
                        <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 px-6 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <UserCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        Assigned Driver Duty Board
                                    </CardTitle>
                                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Live shifts, license status, and instant duty status toggles
                                    </CardDescription>
                                </div>
                            </div>
                            <Link
                                href="/admin/mdrrmo/drivers"
                                className="text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
                                style={{ color: themeColor }}
                            >
                                Full Roster <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </CardHeader>

                        <CardContent className="p-6 space-y-4">
                            {drivers.length === 0 ? (
                                <div className="text-center p-8 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    No drivers enrolled. Click &apos;Full Roster&apos; to register ambulance drivers.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {drivers.map((driver) => {
                                        const assignedVeh = fleet.find(f => f.id === driver.assignedAmbulanceId);

                                        return (
                                            <div
                                                key={driver.id}
                                                className="p-4 rounded-2xl border border-slate-200/90 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#1a1f2c] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                                    <div 
                                                        className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-black uppercase text-sm border shadow-inner"
                                                        style={{
                                                            backgroundColor: `${themeColor}15`,
                                                            borderColor: `${themeColor}30`,
                                                            color: themeColor
                                                        }}
                                                    >
                                                        {driver.name ? driver.name.substring(0, 2) : "DR"}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                                {driver.name}
                                                            </h5>
                                                            <span className={cn(
                                                                "text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                                                getDriverStatusColor(driver.status)
                                                            )}>
                                                                {driver.status?.replace("_", " ")}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                                            <span className="flex items-center gap-1 font-mono">
                                                                <Phone className="w-3 h-3 text-emerald-500" />
                                                                {driver.contactNumber}
                                                            </span>
                                                            <span className="flex items-center gap-1 truncate">
                                                                <Clock className="w-3 h-3 text-blue-500" />
                                                                {driver.dutyShift || "Day Shift"}
                                                            </span>
                                                            {assignedVeh && (
                                                                <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300 truncate">
                                                                    <Car className="w-3 h-3 text-amber-500" />
                                                                    {assignedVeh.unit}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Duty Status Fast Switcher */}
                                                {!isReadOnly && (
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isUpdatingStatus === driver.id}
                                                            onClick={() => handleQuickDriverStatusChange(driver.id, driver.status === "ON_DUTY" ? "STANDBY" : "ON_DUTY")}
                                                            className={cn(
                                                                "h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                                                                driver.status === "ON_DUTY"
                                                                    ? "border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
                                                                    : "border-slate-300 dark:border-white/10 hover:border-emerald-500"
                                                            )}
                                                        >
                                                            {driver.status === "ON_DUTY" ? "Set Standby" : "Set On Duty"}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isUpdatingStatus === driver.id}
                                                            onClick={() => handleQuickDriverStatusChange(driver.id, driver.status === "OFF_DUTY" ? "STANDBY" : "OFF_DUTY")}
                                                            className="h-8 px-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-700"
                                                        >
                                                            {driver.status === "OFF_DUTY" ? "Recall" : "Off Duty"}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* RIGHT COLUMN: DISPATCH SCHEDULES & EXPIRATION ALERTS (5 COLS) */}
                <div className="lg:col-span-5 space-y-8">
                    {/* SECTION 3: UPCOMING DISPATCH SCHEDULES */}
                    <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-md rounded-[1.75rem] bg-white dark:bg-[#161a24] overflow-hidden">
                        <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 px-6 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <Calendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        Dispatch Calendar
                                    </CardTitle>
                                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Scheduled patient transfers & runs
                                    </CardDescription>
                                </div>
                            </div>
                            <Link
                                href="/admin/mdrrmo/schedule"
                                className="text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
                                style={{ color: themeColor }}
                            >
                                Schedule <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </CardHeader>

                        <CardContent className="p-6 space-y-3">
                            {schedules.length === 0 ? (
                                <div className="text-center p-6 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    No pending dispatch runs scheduled.
                                </div>
                            ) : (
                                schedules.slice(0, 5).map((sched) => (
                                    <div
                                        key={sched.id}
                                        className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#2a3040] bg-slate-50/60 dark:bg-[#1a1f2c] space-y-2"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h5 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                    {sched.title}
                                                </h5>
                                                <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3 text-purple-500" />
                                                    {sched.departureTime || "ASAP"} &bull; {new Date(sched.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </p>
                                            </div>
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                                getScheduleStatusColor(sched.status)
                                            )}>
                                                {sched.status}
                                            </span>
                                        </div>

                                        <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 space-y-1">
                                            <div className="flex items-center gap-1 truncate">
                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                <span className="truncate">{sched.pickupLocation} &rarr; {sched.destination}</span>
                                            </div>
                                        </div>

                                        {sched.status !== "COMPLETED" && sched.status !== "CANCELLED" && !isReadOnly && (
                                            <div className="pt-2 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-end">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleProgressScheduleStatus(sched.id, sched.status)}
                                                    className="h-7 text-[10px] font-black uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10"
                                                    style={{ color: themeColor }}
                                                >
                                                    {sched.status === "SCHEDULED" ? "Mark Dispatched \u2192" : sched.status === "DISPATCHED" ? "In Transit \u2192" : "Complete Trip \u2713"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>

                    {/* SECTION 4: VEHICLE COMPLIANCE & EXPIRATION SENTINEL */}
                    <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-md rounded-[1.75rem] bg-white dark:bg-[#161a24] overflow-hidden">
                        <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 px-6 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <FolderArchive className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        OR/CR Expiration Alerts
                                    </CardTitle>
                                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Vehicle papers due for renewal
                                    </CardDescription>
                                </div>
                            </div>
                            <Link
                                href="/admin/mdrrmo/documents"
                                className="text-xs font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
                                style={{ color: themeColor }}
                            >
                                All Files <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                        </CardHeader>

                        <CardContent className="p-6 space-y-3">
                            {initialExpiringDocs.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    <div className="text-xs font-bold">
                                        All ambulance vehicle documents & insurance policies are currently valid!
                                    </div>
                                </div>
                            ) : (
                                initialExpiringDocs.map((doc) => {
                                    const isExpired = doc.expiryDate && new Date(doc.expiryDate) < new Date();

                                    return (
                                        <div
                                            key={doc.id}
                                            className={cn(
                                                "p-3.5 rounded-2xl border flex items-center justify-between gap-3",
                                                isExpired
                                                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400"
                                                    : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                                            )}
                                        >
                                            <div className="min-w-0 flex-1 space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black uppercase tracking-tight truncate">
                                                        {doc.title}
                                                    </span>
                                                    <Badge variant="outline" className="text-[8px] font-black uppercase">
                                                        {isExpired ? "Expired" : "Due Soon"}
                                                    </Badge>
                                                </div>
                                                <p className="text-[10px] font-bold opacity-80">
                                                    {doc.ambulance?.unit} &bull; Expiry: {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : "N/A"}
                                                </p>
                                            </div>

                                            <Link
                                                href={`/admin/mdrrmo/documents?ambulanceId=${doc.ambulanceId}`}
                                                className="p-1.5 rounded-lg bg-white/40 dark:bg-black/40 hover:bg-white/70 text-xs font-black"
                                                title="View in filing system"
                                            >
                                                <FolderArchive className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>

                    {/* SECTION 5: EMERGENCY HOTLINES SUMMARY */}
                    <Card className="border border-slate-200/80 dark:border-slate-800/80 shadow-md rounded-[1.75rem] bg-white dark:bg-[#161a24] overflow-hidden">
                        <CardHeader className="bg-slate-50/80 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-slate-800/80 p-5 px-6 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm shrink-0"
                                    style={{ backgroundColor: themeColor }}
                                >
                                    <PhoneCall className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                        24/7 Dispatch Hotlines
                                    </CardTitle>
                                    <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Public emergency direct response lines
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-2.5">
                            {initialHotlines.map((hl) => (
                                <div
                                    key={hl.id}
                                    className="p-3 rounded-xl border border-slate-200/80 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a1f2c] flex items-center justify-between gap-2"
                                >
                                    <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 truncate">
                                        {hl.name}
                                    </span>
                                    <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                                        {hl.number}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
