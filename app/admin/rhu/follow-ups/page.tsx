"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft,
    Repeat,
    Clock,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Search,
    Stethoscope,
    AlertTriangle,
    X,
    CalendarDays,
    FileText,
    PlayCircle,
    Lock,
    Pill,
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
    getRHUFollowUpAppointments,
    injectDailyFollowUpQueue,
    cancelRHUFollowUp,
    checkInRHUFollowUpPatient
} from "../actions";

interface FollowUpItem {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string | null;
    doctorName: string | null;
    healthCenterId: string | null;
    healthCenterName: string | null;
    scheduledDate: string | Date;
    status: string;
    notes: string | null;
    sourceTransactionId: string | null;
    injectedTransactionId: string | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    injectedStatus?: string | null;
    injectedRhuStatus?: string | null;
    injectedDispensedAt?: string | null;
    injectedQueueNumber?: string | null;
}

export default function RHUFollowUpsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role || "";
    const userEmail = ((session?.user as any)?.email || "").toLowerCase();
    const isSecretary = userRole === "ASST_SEC" || userRole === "ADMIN" || userRole === "RHU_ADMIN";
    const isPharmacy = userRole === "RHU_PHARMACY" || userEmail.includes("pharmacy");
    const isDoctor = userRole === "RHU_DOCTOR" || userRole === "RHU_STAFF";
    const isCenterAdmin = userRole === "ADMIN" || userRole === "RHU_ADMIN" || userRole === "RHU_CENTER_ADMIN" || userRole === "ADMIN_AIDE";

    const [appointments, setAppointments] = useState<FollowUpItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("ALL");
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [syncing, setSyncing] = useState(false);
    const [checkingInId, setCheckingInId] = useState<string | null>(null);

    // Cancel modal state
    const [cancelModalOpen, setCancelModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<FollowUpItem | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelling, setCancelling] = useState(false);

    // Check In / Open Follow-up Consultation
    const handleCheckInFollowUp = async (appointment: FollowUpItem) => {
        if (appointment.injectedTransactionId) {
            const isRx = appointment.injectedStatus === "PRESCRIBED";
            router.push(`/admin/rhu/${appointment.injectedTransactionId}${isRx && isPharmacy ? '?dispense=true' : ''}`);
            return;
        }

        // If not secretary and not already checked in:
        if (!isSecretary) {
            toast.error("Only Assistant Secretary accounts are authorized to check in patients and record vital signs.");
            return;
        }

        // Guard against premature check-in (cannot check in before scheduled date)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scheduled = new Date(appointment.scheduledDate);
        scheduled.setHours(0, 0, 0, 0);
        if (scheduled.getTime() > today.getTime()) {
            const formatted = new Date(appointment.scheduledDate).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
            toast.error(`Cannot check in yet: this follow-up is scheduled for ${formatted}.`);
            return;
        }

        setCheckingInId(appointment.id);
        try {
            const res = await checkInRHUFollowUpPatient(appointment.id);
            if (res.success && res.transactionId) {
                toast.success(`Patient checked in for follow-up! Queue #${res.queueNumber || ""}`);
                router.push(`/admin/rhu/${res.transactionId}`);
            } else {
                toast.error(res.error || "Failed to check in patient.");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to check in patient.");
        } finally {
            setCheckingInId(null);
        }
    };

    // Fetch follow-ups
    const loadFollowUps = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getRHUFollowUpAppointments({
                status: statusFilter,
                dateFilter: dateFilter,
                search: searchQuery
            });
            if (res.success && res.data) {
                setAppointments(res.data);
            } else {
                toast.error(res.error || "Failed to load follow-up appointments.");
            }
        } catch (err: any) {
            console.error("loadFollowUps error:", err);
            toast.error("An error occurred while loading follow-ups.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateFilter, searchQuery]);

    useEffect(() => {
        loadFollowUps();
    }, [loadFollowUps]);

    // Daily queue injection trigger
    const handleSyncQueue = async () => {
        setSyncing(true);
        try {
            const res = await injectDailyFollowUpQueue();
            if (res.success) {
                if (res.injected && res.injected > 0) {
                    toast.success(`Successfully injected ${res.injected} return patient(s) into today's queue!`);
                } else {
                    toast.info(res.message || "All return patients scheduled for today are already queued.");
                }
                await loadFollowUps();
            } else {
                toast.error(res.error || "Failed to sync follow-ups to queue.");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to trigger queue injection.");
        } finally {
            setSyncing(false);
        }
    };

    // Confirm cancellation
    const handleConfirmCancel = async () => {
        if (!selectedAppointment) return;
        setCancelling(true);
        try {
            const res = await cancelRHUFollowUp(selectedAppointment.id, cancelReason);
            if (res.success) {
                toast.success("Follow-up appointment cancelled.");
                setCancelModalOpen(false);
                setSelectedAppointment(null);
                setCancelReason("");
                await loadFollowUps();
            } else {
                toast.error(res.error || "Failed to cancel appointment.");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to cancel.");
        } finally {
            setCancelling(false);
        }
    };

    // Calculate Summary Stats
    const stats = useMemo(() => {
        const manilaDateString = new Intl.DateTimeFormat("en-US", {
            timeZone: "Asia/Manila",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        }).format(new Date());
        const [month, day, year] = manilaDateString.split("/");
        const todayStr = `${year}-${month}-${day}`;

        let todayCount = 0;
        let upcomingCount = 0;
        let completedCount = 0;
        let missedCount = 0;

        appointments.forEach(a => {
            const dateStr = new Date(a.scheduledDate).toISOString().split("T")[0];
            if (dateStr === todayStr && a.status === "Pending") {
                todayCount++;
            } else if (new Date(a.scheduledDate) > new Date() && a.status === "Pending") {
                upcomingCount++;
            }
            if (a.status === "Completed") completedCount++;
            if (a.status === "Missed") missedCount++;
        });

        return {
            total: appointments.length,
            today: todayCount,
            upcoming: upcomingCount,
            completed: completedCount,
            missed: missedCount
        };
    }, [appointments]);

    // Format Scheduled Date with relative badge
    const renderDateBadge = (dateVal: string | Date) => {
        const scheduled = new Date(dateVal);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const scheduledMidnight = new Date(scheduled);
        scheduledMidnight.setHours(0, 0, 0, 0);

        const diffTime = scheduledMidnight.getTime() - today.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        const formatted = scheduled.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric"
        });

        if (diffDays === 0) {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="font-bold text-amber-400">{formatted}</span>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                        Today
                    </span>
                </div>
            );
        } else if (diffDays === 1) {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-teal-300">{formatted}</span>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Tomorrow
                    </span>
                </div>
            );
        } else if (diffDays > 1) {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">{formatted}</span>
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400">
                        In {diffDays}d
                    </span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 line-through">{formatted}</span>
                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Past
                    </span>
                </div>
            );
        }
    };

    // Format Status Badge
    const renderStatusBadge = (status: string) => {
        switch (status) {
            case "Pending":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Pending
                    </span>
                );
            case "Completed":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                );
            case "Missed":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <AlertCircle className="w-3 h-3" /> Missed
                    </span>
                );
            case "Cancelled":
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-500/15 text-slate-400 border border-slate-500/30">
                        <X className="w-3 h-3" /> Cancelled
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/5 text-slate-300">
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-white pb-24">
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 md:pt-10 space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-xl border-slate-200 dark:border-white/10"
                                onClick={() => router.push("/admin/rhu")}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none text-slate-900 dark:text-white">
                                RHU <span className="text-teal-500">Return Visits</span> &amp; Follow-Ups
                            </h1>
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest italic pl-11">
                            Follow-Up Consultation Scheduling &amp; Automated Queue Injection Engine
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={handleSyncQueue}
                            disabled={syncing}
                            className="h-11 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 hover:scale-105 active:scale-95 transition-all gap-2 cursor-pointer"
                        >
                            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                            Sync Today&apos;s Queue Now
                        </Button>

                        <Button
                            variant="outline"
                            onClick={() => router.push("/admin/rhu/queue")}
                            className="h-11 px-5 rounded-2xl border-slate-200 dark:border-white/10 text-xs font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                            View Live Queue
                        </Button>
                    </div>
                </div>

                {/* Summary Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: "Today's Returnees", value: stats.today, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                        { label: "Upcoming Scheduled", value: stats.upcoming, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
                        { label: "Completed Visits", value: stats.completed, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                        { label: "Missed Slots", value: stats.missed, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
                        { label: "Total Tracked", value: stats.total, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
                    ].map((stat, i) => (
                        <Card key={i} className={`rounded-2xl border ${stat.bg} p-4 space-y-1 shadow-sm`}>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                            <p className={`text-2xl md:text-3xl font-black font-mono tracking-tight ${stat.color}`}>
                                {loading ? "..." : stat.value}
                            </p>
                        </Card>
                    ))}
                </div>

                {/* Filter Controls */}
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            <Input
                                placeholder="Search by patient name, doctor, or return clinical instructions..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-11 rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-medium"
                            />
                        </div>

                        {/* Status Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 border-t md:border-t-0 md:border-l border-slate-200 dark:border-white/10 pt-3 md:pt-0 md:pl-4">
                            {[
                                { id: "ALL", label: "All Statuses" },
                                { id: "Pending", label: "Pending" },
                                { id: "Completed", label: "Completed" },
                                { id: "Missed", label: "Missed" },
                                { id: "Cancelled", label: "Cancelled" },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setStatusFilter(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                        statusFilter === tab.id
                                            ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                                            : "bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Sub-Filters */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1 flex items-center gap-1">
                            <CalendarDays className="w-3.5 h-3.5 text-slate-400" /> Date Filter:
                        </span>
                        {[
                            { id: "all", label: "All Scheduled Dates" },
                            { id: "today", label: "Scheduled Today" },
                            { id: "upcoming", label: "Upcoming Returnees" },
                            { id: "past", label: "Past Scheduled" },
                        ].map((df) => (
                            <button
                                key={df.id}
                                onClick={() => setDateFilter(df.id)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                    dateFilter === df.id
                                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                }`}
                            >
                                {df.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Follow-Ups Table */}
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/10">
                                <TableRow>
                                    <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">Scheduled Date</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">Patient Name</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">Attending Physician</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">Return Purpose &amp; Notes</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">Status</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400">Queue State</TableHead>
                                    <TableHead className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="divide-y divide-slate-100 dark:divide-white/5 text-xs">
                                {loading ? (
                                    Array(5).fill(0).map((_, idx) => (
                                        <TableRow key={idx} className="animate-pulse">
                                            <TableCell><div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" /></TableCell>
                                            <TableCell><div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : appointments.length > 0 ? (
                                    appointments.map((a) => (
                                        <TableRow key={a.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                            <TableCell className="font-mono">
                                                {renderDateBadge(a.scheduledDate)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className="font-black text-slate-900 dark:text-white uppercase">
                                                        {a.patientName}
                                                    </p>
                                                    {a.healthCenterName && (
                                                        <p className="text-[10px] text-slate-400 uppercase">
                                                            {a.healthCenterName}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                    <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                                                    <span className="font-bold text-xs">{a.doctorName || "Attending Physician"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="max-w-xs truncate text-slate-600 dark:text-slate-300 font-medium" title={a.notes || ""}>
                                                    {a.notes ? `"${a.notes}"` : <span className="text-slate-500 italic">No notes provided</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {renderStatusBadge(a.status)}
                                            </TableCell>
                                             <TableCell>
                                                {a.injectedTransactionId ? (() => {
                                                    const txStatus = a.injectedStatus || a.injectedRhuStatus || "CHECK_IN";
                                                    if (txStatus === "PRESCRIBED") {
                                                        return (
                                                            <button
                                                                onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}${isPharmacy ? '?dispense=true' : ''}`)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-all cursor-pointer"
                                                                title="Click to dispense prescribed medication"
                                                            >
                                                                <Pill className="w-3 h-3 text-teal-400" /> Awaiting Dispense
                                                            </button>
                                                        );
                                                    }
                                                    if (txStatus === "FOR_CLAIM" || txStatus === "PO_APPROVED") {
                                                        return (
                                                            <button
                                                                onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
                                                                title="Click to view / approve PO"
                                                            >
                                                                <Clock className="w-3 h-3 text-amber-400" /> Dispensed · Awaiting PO
                                                            </button>
                                                        );
                                                    }
                                                    if (txStatus === "COMPLETED") {
                                                        return (
                                                            <button
                                                                onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
                                                                title="Click to view completed consultation"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
                                                            </button>
                                                        );
                                                    }
                                                    return (
                                                        <button
                                                            onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all cursor-pointer"
                                                            title="Click to open active consultation"
                                                        >
                                                            <Repeat className="w-3 h-3 text-indigo-400" /> In Consultation
                                                        </button>
                                                    );
                                                })() : (() => {
                                                    const today = new Date();
                                                    today.setHours(0, 0, 0, 0);
                                                    const scheduled = new Date(a.scheduledDate);
                                                    scheduled.setHours(0, 0, 0, 0);
                                                    const isFuture = scheduled.getTime() > today.getTime();

                                                    if (a.status === "Pending") {
                                                        if (isFuture) {
                                                            return (
                                                                <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                                                                    <Clock className="w-3 h-3 text-slate-500" /> Upcoming Schedule
                                                                </span>
                                                            );
                                                        }
                                                        return (
                                                            <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 font-bold">
                                                                <Clock className="w-3 h-3 text-amber-400 animate-pulse" /> Ready for Triage
                                                            </span>
                                                        );
                                                    }
                                                    return (
                                                        <span className="text-[10px] text-slate-400 italic">
                                                            Scheduled / Pending Check-In
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Prior consultation record */}
                                                    {a.sourceTransactionId && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.push(`/admin/rhu/${a.sourceTransactionId}`)}
                                                            className="h-8 px-2.5 text-[10px] font-black uppercase text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 gap-1 rounded-xl"
                                                            title="View Previous Consultation Record & Diagnosis"
                                                        >
                                                            <FileText className="w-3 h-3" /> Prior Record
                                                        </Button>
                                                    )}

                                                    {/* Check In / Dispense / Open Consultation */}
                                                    {a.status === "Pending" && (() => {
                                                        const today = new Date();
                                                        today.setHours(0, 0, 0, 0);
                                                        const scheduled = new Date(a.scheduledDate);
                                                        scheduled.setHours(0, 0, 0, 0);
                                                        const isFuture = scheduled.getTime() > today.getTime();

                                                        if (a.injectedTransactionId) {
                                                            const txStatus = a.injectedStatus || a.injectedRhuStatus || "CHECK_IN";

                                                            // Status is PRESCRIBED -> Ready for Pharmacy dispensing
                                                            if (txStatus === "PRESCRIBED") {
                                                                if (isPharmacy || isCenterAdmin) {
                                                                    return (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}?dispense=true`)}
                                                                            className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl transition-all shadow-sm bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20"
                                                                        >
                                                                            <Pill className="w-3.5 h-3.5" />
                                                                            Dispense
                                                                        </Button>
                                                                    );
                                                                }
                                                                return (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                        className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl border-teal-500/30 text-teal-400 hover:bg-teal-500/10"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                        At Pharmacy
                                                                    </Button>
                                                                );
                                                            }

                                                            // Status is in consultation (CHECK_IN or IN_CONSULTATION)
                                                            if (txStatus === "CHECK_IN" || txStatus === "IN_CONSULTATION") {
                                                                if (isDoctor || isCenterAdmin) {
                                                                    return (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                            className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                                                                        >
                                                                            <Stethoscope className="w-3 h-3" />
                                                                            Open Consultation
                                                                        </Button>
                                                                    );
                                                                }
                                                                if (isPharmacy) {
                                                                    return (
                                                                        <span
                                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 select-none"
                                                                            title="Patient is currently in consultation with the attending physician."
                                                                        >
                                                                            <Clock className="w-3 h-3 text-indigo-400 animate-pulse" />
                                                                            In Consultation
                                                                        </span>
                                                                    );
                                                                }
                                                                return (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                        className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                        In Consultation
                                                                    </Button>
                                                                );
                                                            }

                                                            // Status is FOR_CLAIM or PO_APPROVED
                                                            if (txStatus === "FOR_CLAIM" || txStatus === "PO_APPROVED") {
                                                                if (isCenterAdmin) {
                                                                    return (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                            className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                                                        >
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            Approve PO
                                                                        </Button>
                                                                    );
                                                                }
                                                                return (
                                                                    <span
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 select-none"
                                                                    >
                                                                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                                                                        Awaiting PO
                                                                    </span>
                                                                );
                                                            }

                                                            // Status is COMPLETED
                                                            if (txStatus === "COMPLETED") {
                                                                return (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                        className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                                                    >
                                                                        <CheckCircle2 className="w-3 h-3" />
                                                                        View Record
                                                                    </Button>
                                                                );
                                                            }

                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl transition-all shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                                                                >
                                                                    <PlayCircle className="w-3 h-3" />
                                                                    Open Consultation
                                                                </Button>
                                                            );
                                                        }

                                                        if (isFuture) {
                                                            return (
                                                                <Button
                                                                    size="sm"
                                                                    disabled
                                                                    className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5 cursor-not-allowed shadow-none"
                                                                    title={`Cannot check in yet. This follow-up visit is scheduled on ${new Date(a.scheduledDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}.`}
                                                                >
                                                                    <Lock className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                                                                    Not Yet Due
                                                                </Button>
                                                            );
                                                        }

                                                        if (!isSecretary) {
                                                            return (
                                                                <span
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 select-none shadow-none"
                                                                    title="Patient check-in and vital signs intake is handled by the Assistant Secretary."
                                                                >
                                                                    <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                                                                    Awaiting Secretary Triage
                                                                </span>
                                                            );
                                                        }

                                                        return (
                                                            <Button
                                                                size="sm"
                                                                disabled={checkingInId === a.id}
                                                                onClick={() => handleCheckInFollowUp(a)}
                                                                className="h-8 px-3 text-[10px] font-black uppercase tracking-wider gap-1.5 rounded-xl transition-all shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                                                            >
                                                                {checkingInId === a.id ? (
                                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle2 className="w-3 h-3" />
                                                                )}
                                                                Check In (Triage)
                                                            </Button>
                                                        );
                                                    })()}

                                                    {/* Completed Follow-Up Link */}
                                                    {a.status === "Completed" && a.injectedTransactionId && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => router.push(`/admin/rhu/${a.injectedTransactionId}`)}
                                                            className="h-8 px-2.5 text-[10px] font-black uppercase text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1 rounded-xl border border-emerald-500/30"
                                                            title="View Completed Consultation Record"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" /> Record
                                                        </Button>
                                                    )}

                                                    {/* Cancel button */}
                                                    {a.status === "Pending" && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedAppointment(a);
                                                                setCancelModalOpen(true);
                                                            }}
                                                            className="h-8 px-2 text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-16 text-slate-400">
                                            <Repeat className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                                            <p className="text-sm font-bold uppercase">No Follow-Up Appointments Found</p>
                                            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                                Doctors can schedule return visits directly within the Doctor Consultation Console during prescription sign-off.
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Cancel Follow-Up Modal */}
            <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
                <DialogContent className="max-w-md bg-[#0f172a] border border-rose-500/30 text-white rounded-3xl p-6 space-y-4">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight text-rose-400 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-rose-400" />
                            Cancel Return Consultation
                        </DialogTitle>
                    </DialogHeader>

                    {selectedAppointment && (
                        <div className="space-y-3 text-xs">
                            <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                                <p className="text-slate-400">Patient: <strong className="text-white uppercase">{selectedAppointment.patientName}</strong></p>
                                <p className="text-slate-400">Scheduled Date: <strong className="text-teal-300">{new Date(selectedAppointment.scheduledDate).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</strong></p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Reason for Cancellation
                                </label>
                                <Input
                                    placeholder="e.g. Patient recovered, patient relocated, duplicate..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    className="bg-white/5 border-white/10 text-xs rounded-xl text-white"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex gap-2 justify-end pt-2">
                        <Button
                            variant="ghost"
                            onClick={() => setCancelModalOpen(false)}
                            className="text-xs text-slate-400 hover:text-white"
                        >
                            Nevermind
                        </Button>
                        <Button
                            disabled={cancelling}
                            onClick={handleConfirmCancel}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase rounded-xl"
                        >
                            {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
