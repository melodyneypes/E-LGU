"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Activity, Clock, CheckCircle2, Calendar,
    ArrowRight, ArrowUpRight, Building2
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import CounterSelectorHeader from "@/components/admin/CounterSelectorHeader";
import { getRHUAdminTransactions, getRHUDashboardStats } from "./actions";
import { fetchAndCallNextTicket } from "@/app/admin/transactions/calling-actions";
import { supabase } from "@/lib/supabase";

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getResidentSnapshot(tx: any): any {
    if (!tx?.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === 'string') {
        try {
            return JSON.parse(tx.residentSnapshot);
        } catch {
            return {};
        }
    }
    return tx.residentSnapshot;
}

function getAdditionalData(tx: any): any {
    if (!tx?.additionalData) return {};
    if (typeof tx.additionalData === 'string') {
        try {
            return JSON.parse(tx.additionalData);
        } catch {
            return {};
        }
    }
    return tx.additionalData;
}

export default function RHUDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<any>({ total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });
    const [recentBookings, setRecentBookings] = useState<any[]>([]);
    const [centerName, setCenterName] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [statsRes, recentRes] = await Promise.all([
                getRHUDashboardStats(),
                getRHUAdminTransactions({ page: 1, limit: 5 })
            ]);

            if (statsRes.success && statsRes.stats) {
                setStats(statsRes.stats);
                setCenterName(statsRes.centerName || null);
            }
            if (recentRes.success && recentRes.data) {
                setRecentBookings(recentRes.data);
            }
        } catch {
            toast.error("Error connecting to server.");
        } finally {
            if (!silent) setLoading(false);
        }
    }, []);

    // Supabase Real-time + 30-second Polling Fallback
    useEffect(() => {
        loadData(false);

        const pollInterval = setInterval(() => {
            loadData(true);
        }, 30000);

        let channel: any = null;
        if (supabase) {
            channel = supabase
                .channel("realtime-rhu-dashboard")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Transaction" },
                    (payload: any) => {
                        console.log("RHU Dashboard Realtime Update: Transaction change detected", payload);
                        loadData(true);
                    }
                )
                .subscribe();
        }

        return () => {
            clearInterval(pollInterval);
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [loadData]);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handleCallNextTicket = async () => {
        try {
            const result = await fetchAndCallNextTicket("Rural Health Unit");
            if (result.success && result.data) {
                const txData: any = result.data;
                toast.success(`Now Calling Ticket #${txData.controlNumber || txData.id.slice(0, 8)}`);
                loadData(false);
            } else {
                toast.info(result.error || "No waiting patients in queue.");
            }
        } catch {
            toast.error("Failed to call next ticket.");
        }
    };

    return (
        <div className="space-y-8 pb-16">
            {/* Header with Counter Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-6 h-6 text-rose-500" />
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            Rural Health Unit <span className="text-rose-500">Dashboard</span>
                        </h1>
                    </div>
                    {centerName && (
                        <p className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5 opacity-90 pl-1 mb-1 mt-0.5">
                            📍 {centerName}
                        </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Overview analytics, appointment summary metrics, and operational counter controls.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <CounterSelectorHeader />
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</span>
                    <div className="flex items-baseline justify-between mt-3">
                        {loading ? <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" /> : <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.total || 0}</span>}
                        <Activity className="w-4 h-4 text-rose-500 opacity-60" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-sky-500">Booked</span>
                    <div className="flex items-baseline justify-between mt-3">
                        {loading ? <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" /> : <span className="text-2xl font-black text-sky-600 font-mono">{stats.booked || 0}</span>}
                        <Clock className="w-4 h-4 text-sky-500 opacity-60" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Checked In</span>
                    <div className="flex items-baseline justify-between mt-3">
                        {loading ? <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" /> : <span className="text-2xl font-black text-indigo-600 font-mono">{stats.checkedIn || 0}</span>}
                        <CheckCircle2 className="w-4 h-4 text-indigo-500 opacity-60" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">Consultation</span>
                    <div className="flex items-baseline justify-between mt-3">
                        {loading ? <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" /> : <span className="text-2xl font-black text-amber-600 font-mono">{(stats.inConsultation || 0) + (stats.prescribed || 0)}</span>}
                        <Activity className="w-4 h-4 text-amber-500 opacity-60" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-500">Referred</span>
                    <div className="flex items-baseline justify-between mt-3">
                        {loading ? <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" /> : <span className="text-2xl font-black text-fuchsia-600 font-mono">{stats.referred || 0}</span>}
                        <Activity className="w-4 h-4 text-fuchsia-500 opacity-60" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Completed</span>
                    <div className="flex items-baseline justify-between mt-3">
                        {loading ? <Skeleton className="h-7 w-12 rounded-lg bg-slate-200 dark:bg-slate-800" /> : <span className="text-2xl font-black text-emerald-600 font-mono">{stats.completed || 0}</span>}
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-60" />
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Summary Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Consultations Snapshot */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4">
                        <div>
                            <h3 className="text-base font-black uppercase italic tracking-tight text-slate-800 dark:text-white">
                                Recent Appointments Snapshot
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">
                                Latest patient consultations filed
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            onClick={() => router.push("/admin/rhu/consultations")}
                            className="h-9 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 flex items-center gap-1.5"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 flex items-center justify-between gap-4">
                                        <div className="space-y-2 flex-1">
                                            <Skeleton className="h-4 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
                                            <Skeleton className="h-3 w-32 rounded-md bg-slate-100 dark:bg-slate-800/60" />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="h-6 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                                            <Skeleton className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-slate-800" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentBookings.length === 0 ? (
                            <div className="py-8 text-center text-xs font-bold text-slate-400 italic">No recent bookings</div>
                        ) : (
                            recentBookings.map((tx) => {
                                const resident = getResidentSnapshot(tx);
                                const addData = getAdditionalData(tx);
                                const patientName = resident.firstName
                                    ? `${resident.firstName} ${resident.lastName}`
                                    : tx.user?.name || "N/A";
                                const checkupDisplay = addData.checkupType === "OTHER"
                                    ? addData.customCheckupType || "Custom Check-up"
                                    : addData.checkupType || tx.type?.name || "Consultation";

                                return (
                                    <div
                                        key={tx.id}
                                        onClick={() => router.push(`/admin/rhu/${tx.id}`)}
                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-between hover:border-rose-300 dark:hover:border-rose-800 cursor-pointer transition-all"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{patientName}</span>
                                            <span className="text-[10px] font-bold text-slate-400 italic">
                                                {checkupDisplay} • Brgy. {resident.barangay || "Mapandan"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold text-rose-500 font-mono">
                                                {formatDateTime(tx.appointmentDate)}
                                            </span>
                                            <ArrowUpRight className="w-4 h-4 text-slate-400" />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Modules Navigation Links */}
                <div className="space-y-4">
                    <div
                        onClick={() => router.push("/admin/rhu/consultations")}
                        className="bg-rose-500 text-white rounded-3xl p-6 shadow-md cursor-pointer hover:bg-rose-600 transition-all flex flex-col justify-between min-h-[160px]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-rose-100">Consultations Hub</span>
                            <Activity className="w-6 h-6 text-rose-100" />
                        </div>
                        <div>
                            <h4 className="text-xl font-black uppercase italic tracking-tight">Manage Consultations</h4>
                            <p className="text-[10px] font-bold text-rose-100 uppercase tracking-wider mt-1">
                                Evaluate, confirm, and process patient check-ups
                            </p>
                        </div>
                    </div>

                    <div
                        onClick={() => router.push("/admin/rhu/centers")}
                        className="bg-slate-900 text-white rounded-3xl p-6 shadow-md cursor-pointer hover:bg-slate-800 transition-all flex flex-col justify-between min-h-[140px] border border-slate-800"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Locations & Facilities</span>
                            <Building2 className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase italic tracking-tight">Staff & Health Centers</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                Manage health centers, stations, and medical staff roster
                            </p>
                        </div>
                    </div>

                    <div
                        onClick={() => router.push("/admin/rhu/appointment-settings")}
                        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-white/10 cursor-pointer hover:border-rose-400 transition-all flex flex-col justify-between min-h-[140px]"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Settings</span>
                            <Calendar className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <h4 className="text-lg font-black uppercase italic tracking-tight">Appointment Settings</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                Manage daily capacity and operating schedule
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
