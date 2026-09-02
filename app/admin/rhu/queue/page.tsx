"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Volume2,
    Users,
    Activity,
    Smile,
    ShieldAlert,
    UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { RHUWalkInModal } from "../consultations/RHUWalkInModal";
import {
    getRHUQueueTickets,
    fetchAndCallNextRHUTicket,
    callSpecificRHUTicket
} from "@/app/admin/transactions/calling-actions";

export default function RHUQueuePage() {
    const router = useRouter();
    const [counterName, setCounterName] = useState<string | null>(null);
    const [waitingQueue, setWaitingQueue] = useState<any[]>([]);
    const [currentlyServing, setCurrentlyServing] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [isWalkInModalOpen, setIsWalkInModalOpen] = useState(false);
    const hasFetchedRef = useRef(false);

    // Load active counter from localStorage
    const loadCounter = useCallback(() => {
        if (typeof window !== "undefined") {
            const activeCounter = localStorage.getItem("activeCounterName");
            setCounterName(activeCounter);
            setIsInitialized(true);
        }
    }, []);

    useEffect(() => {
        loadCounter();
        window.addEventListener("storage", loadCounter);
        return () => window.removeEventListener("storage", loadCounter);
    }, [loadCounter]);

    // Fetch queue list from backend
    const fetchQueue = useCallback(async () => {
        if (!isInitialized) return;

        if (!counterName) {
            setLoading(false);
            return;
        }

        try {
            if (!hasFetchedRef.current) {
                setLoading(true);
            }
            const res = await getRHUQueueTickets(counterName);
            if (res.success && res.data) {
                setWaitingQueue(res.data.waiting || []);
                setCurrentlyServing(res.data.serving?.[0] || null);
                hasFetchedRef.current = true;
            } else {
                toast.error(res.error || "Failed to load queue tickets.");
            }
        } catch (err) {
            console.error("Failed to load RHU queue:", err);
            toast.error("An error occurred while loading the RHU queue.");
        } finally {
            setLoading(false);
        }
    }, [counterName, isInitialized]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Supabase Real-time + 30-second Polling Fallback
    useEffect(() => {
        const pollInterval = setInterval(() => {
            fetchQueue();
        }, 30000);

        let channel: any = null;
        if (supabase) {
            channel = supabase
                .channel("realtime-rhu-queue-page")
                .on(
                    "postgres_changes",
                    { event: "*", schema: "public", table: "Transaction" },
                    (payload: any) => {
                        console.log("RHU Realtime Update: Transaction change detected", payload);
                        fetchQueue();
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
    }, [fetchQueue]);

    // Action: Call Next ticket
    const handleCallNext = async () => {
        if (!counterName) return;
        setActionLoading(true);
        try {
            const res = await fetchAndCallNextRHUTicket(counterName);
            if (res.success && res.data) {
                toast.success(`Calling ticket: ${(res.data as any).queueNumber || (res.data as any).controlNumber}`);
                await fetchQueue();
            } else {
                toast.error((res as any).error || "There is no patient in the line yet.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to call next ticket.");
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Recall currently serving
    const handleRecall = async () => {
        if (!currentlyServing || !counterName) return;
        setActionLoading(true);
        try {
            const res = await callSpecificRHUTicket(currentlyServing.id, counterName);
            if (res.success) {
                toast.success(`Re-calling ticket: ${currentlyServing.queueNumber || currentlyServing.controlNumber}`);
            } else {
                toast.error((res as any).error || "Failed to recall ticket.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to recall ticket.");
        } finally {
            setActionLoading(false);
        }
    };

    // Helper: get patient name from transaction
    const getPatientName = (tx: any) => {
        if (tx.user?.residentProfile) {
            const p = tx.user.residentProfile;
            return `${p.firstName} ${p.lastName}`;
        }
        const snap = tx.residentSnapshot;
        if (snap) {
            const parsed = typeof snap === "string" ? JSON.parse(snap) : snap;
            if (parsed.firstName) return `${parsed.firstName} ${parsed.lastName}`;
        }
        return tx.user?.name || "PATIENT";
    };

    const getCheckupType = (tx: any) => {
        const addData = typeof tx.additionalData === "string" ? JSON.parse(tx.additionalData) : tx.additionalData;
        if (addData?.checkupType === "OTHER") {
            return addData?.customCheckupType || "Custom Check-up";
        }
        return addData?.checkupType || tx.type?.name || "RHU Consultation";
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] pb-24">
            <div className="max-w-6xl mx-auto px-4 md:px-8 pt-4 md:pt-10 space-y-6 md:space-y-8">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040] pb-6">
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
                                RHU <span className="text-rose-500">Live Queue</span>
                            </h1>
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest italic pl-11">
                            Rural Health Unit medical queue control panel
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            onClick={() => setIsWalkInModalOpen(true)}
                            className="h-11 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-600/25 hover:scale-105 active:scale-95 transition-all gap-2 cursor-pointer"
                        >
                            <UserPlus className="w-4 h-4" /> Register Walk-In
                        </Button>

                        <div className="flex items-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl shadow-sm">
                            <Activity className="w-5 h-5 text-rose-500 animate-pulse" />
                            <div className="text-left">
                                <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Active Terminal</p>
                                <p className="text-xs font-bold text-slate-800 dark:text-white uppercase">
                                    {counterName || "NO WINDOW CONFIGURED"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {!isInitialized || (loading && counterName) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                        {/* LEFT COLUMN SKELETON */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="w-full h-16 rounded-2xl bg-slate-200/30 dark:bg-white/5 border border-slate-200/30 dark:border-white/10 animate-pulse" />
                            <Card className="rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-xl overflow-hidden bg-white/40 dark:bg-white/5 relative">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200/50 dark:bg-white/10" />
                                <CardContent className="p-8 space-y-8 flex flex-col items-center">
                                    <div className="h-3 w-48 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    <div className="h-6 w-24 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    <div className="h-20 w-64 bg-slate-200/60 dark:bg-white/10 rounded-3xl animate-pulse" />
                                    <div className="space-y-2 w-full max-w-xs flex flex-col items-center">
                                        <div className="h-2 w-20 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                        <div className="h-5 w-48 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    </div>
                                    <div className="h-5 w-32 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 w-full flex justify-center gap-4">
                                        <div className="h-12 w-32 bg-slate-200/60 dark:bg-white/10 rounded-xl animate-pulse" />
                                        <div className="h-12 w-44 bg-slate-200/60 dark:bg-white/10 rounded-xl animate-pulse" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        
                        {/* RIGHT COLUMN SKELETON */}
                        <div className="space-y-4">
                            <div className="h-4 w-36 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                            <Card className="rounded-2xl border border-slate-200/50 dark:border-[#2a3040] shadow-sm bg-white/40 dark:bg-white/5 overflow-hidden">
                                <CardContent className="p-3 space-y-3">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="flex items-center justify-between p-3.5 bg-slate-50/30 dark:bg-white/[0.02] rounded-xl border border-slate-100/50 dark:border-white/5">
                                            <div className="space-y-2">
                                                <div className="h-5 w-16 bg-slate-200/60 dark:bg-white/10 rounded-lg animate-pulse" />
                                                <div className="h-2.5 w-24 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                            </div>
                                            <div className="h-4 w-28 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : !counterName ? (
                    <Card className="border border-red-500/20 bg-red-500/5 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 uppercase">Window Counter Required</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Please configure your active counter/window first using the <strong>&quot;Set Counter&quot;</strong> selector located in the top navigation bar.
                        </p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">

                        {/* LEFT/MID COLUMN: Active Serving Ticket Info */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Call Next Button Bar */}
                            <Button
                                onClick={handleCallNext}
                                disabled={actionLoading}
                                className="w-full h-16 rounded-2xl bg-rose-600 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:bg-rose-700 transition-all shadow-lg hover:shadow-rose-600/20 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Volume2 className="w-5 h-5 animate-bounce" />
                                Call Next Patient in Queue
                            </Button>

                            {/* Currently Serving Terminal Display */}
                            <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden bg-white dark:bg-white/5 relative">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 to-amber-500" />

                                <CardContent className="p-8 space-y-6 text-center">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Now Processing at {counterName}</p>
                                    </div>

                                    {currentlyServing ? (
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <span className="inline-flex items-center gap-2 px-6 py-2 bg-amber-500/10 text-amber-500 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/20 italic animate-pulse">
                                                    <Activity className="w-4 h-4" />
                                                    Serving Patient
                                                </span>
                                                <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-950 dark:text-white uppercase italic leading-none font-mono py-4">
                                                    {currentlyServing.queueNumber
                                                        ? currentlyServing.queueNumber.split("-").pop()
                                                        : currentlyServing.controlNumber || "RHU-XXX"}
                                                </h2>
                                            </div>

                                            <div className="space-y-1 max-w-md mx-auto">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Patient Name</p>
                                                <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                    {getPatientName(currentlyServing)}
                                                </h3>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Consultation Type</p>
                                                <span className="text-xs font-bold text-rose-600 uppercase bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800 inline-block">
                                                    {getCheckupType(currentlyServing)}
                                                </span>
                                            </div>

                                            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-4">
                                                <Button
                                                    variant="outline"
                                                    className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 border-slate-200 dark:border-white/10 hover:border-amber-500/40 hover:text-amber-500"
                                                    onClick={handleRecall}
                                                    disabled={actionLoading}
                                                >
                                                    <Volume2 className="w-4 h-4" />
                                                    Recall Voice
                                                </Button>
                                                <Button
                                                    className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 text-white"
                                                    onClick={() => router.push(`/admin/rhu/${currentlyServing.id}`)}
                                                >
                                                    Process Patient Consultation
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-12 space-y-4">
                                            <Smile className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto" />
                                            <div className="space-y-1 max-w-sm mx-auto">
                                                <p className="text-base font-bold text-slate-400 uppercase italic">No Active Patient</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                                                    Click <strong>&quot;Call Next Patient in Queue&quot;</strong> to call the next waiting patient to your counter window.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: Waiting List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 italic flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Next Patients in Line ({waitingQueue.length})
                                </h3>
                            </div>

                            <Card className="rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm bg-white dark:bg-white/5 overflow-hidden">
                                <CardContent className="p-2 space-y-1.5 divide-y divide-slate-100 dark:divide-white/5">
                                    {loading ? (
                                        Array(3).fill(0).map((_, i) => (
                                            <div key={i} className="animate-pulse flex items-center justify-between py-1.5">
                                                <div className="space-y-1">
                                                    <div className="h-6 w-16 bg-slate-100 dark:bg-slate-800 rounded" />
                                                    <div className="h-3.5 w-24 bg-slate-100 dark:bg-slate-800 rounded" />
                                                </div>
                                            </div>
                                        ))
                                    ) : waitingQueue.length > 0 ? (
                                        waitingQueue.map((tx, idx) => {
                                            const queueNum = tx.queueNumber
                                                ? tx.queueNumber.split("-").pop()
                                                : tx.controlNumber || "RHU-XXX";
                                            const isPriority = tx.isPriority;

                                            return (
                                                <div key={tx.id} className={`flex flex-col items-center justify-center text-center py-2 ${idx === 0 ? "pt-1" : ""}`}>
                                                    <div className="space-y-0.5 min-w-0 flex flex-col items-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <span className="text-2xl font-black font-mono tracking-tighter text-slate-900 dark:text-white uppercase italic">
                                                                {queueNum}
                                                            </span>
                                                            {isPriority && (
                                                                <span className="text-[7px] font-black tracking-widest uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full italic animate-pulse">
                                                                    Priority
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase truncate max-w-[220px] leading-tight">
                                                            {getPatientName(tx)}
                                                        </p>
                                                        <p className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">
                                                            {getCheckupType(tx)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-10 space-y-3.5">
                                            <Smile className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-400 uppercase">Queue is Empty</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-medium max-w-[180px] mx-auto">
                                                    No RHU patients are currently waiting in line today.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>

            {/* Walk-in Patient Modal */}
            <RHUWalkInModal
                open={isWalkInModalOpen}
                onOpenChange={setIsWalkInModalOpen}
                onSuccess={() => fetchQueue()}
            />
        </div>
    );
}
