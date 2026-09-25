"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Volume2,
    Users,
    Activity,
    Smile,
    ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
    getTreasuryQueueTickets,
    callTicketToCounter,
    fetchAndCallNextTicket
} from "@/app/admin/transactions/calling-actions";

function getCitizenName(item: any): string {
    if (!item) return "NON-RESIDENT / WALK-IN";

    // 1. If this is a Cedula or appointment processed for a RELATIVE, prioritize the relative's name
    const addData = typeof item.additionalData === "string"
        ? (() => { try { return JSON.parse(item.additionalData); } catch { return {}; } })()
        : (item.additionalData || {});

    const snap = typeof item.residentSnapshot === "string"
        ? (() => { try { return JSON.parse(item.residentSnapshot); } catch { return {}; } })()
        : (item.residentSnapshot || {});

    if (addData.applicantTarget === "RELATIVE" || addData.relationshipToApplicant) {
        if (snap.firstName || snap.lastName) {
            const relativeFullName = [snap.firstName, snap.middleName, snap.lastName, snap.suffix]
                .filter(Boolean)
                .join(" ")
                .trim();
            if (relativeFullName) {
                return relativeFullName;
            }
        }
        if (snap.fullName && typeof snap.fullName === "string") {
            return snap.fullName.trim();
        }
        if (snap.name && typeof snap.name === "string") {
            return snap.name.trim();
        }
    }

    // 2. Standard authenticated user profile name
    if (item.user?.residentProfile?.firstName || item.user?.residentProfile?.lastName) {
        return `${item.user.residentProfile.firstName || ""} ${item.user.residentProfile.lastName || ""}`.trim();
    }
    if (item.user?.name) {
        return item.user.name;
    }

    // 3. Fallback to resident snapshot for non-relative walk-ins or unlinked profiles
    if (snap.fullName && typeof snap.fullName === "string") {
        return snap.fullName;
    }
    if (snap.name && typeof snap.name === "string") {
        return snap.name;
    }
    if (snap.firstName || snap.lastName) {
        const full = `${snap.firstName || ""} ${snap.lastName || ""}`.trim();
        if (full) return full;
    }

    // 4. POSO citation fine violator name
    if (addData.violatorName && typeof addData.violatorName === "string") {
        return addData.violatorName;
    }

    return "NON-RESIDENT / WALK-IN";
}

function getCitizenDetails(item: any): { name: string; isRelative: boolean; relationship?: string; applicantName?: string } {
    if (!item) return { name: "NON-RESIDENT / WALK-IN", isRelative: false };

    const addData = typeof item.additionalData === "string"
        ? (() => { try { return JSON.parse(item.additionalData); } catch { return {}; } })()
        : (item.additionalData || {});

    const snap = typeof item.residentSnapshot === "string"
        ? (() => { try { return JSON.parse(item.residentSnapshot); } catch { return {}; } })()
        : (item.residentSnapshot || {});

    const isRelative = Boolean(addData.applicantTarget === "RELATIVE" || addData.relationshipToApplicant);
    const relationship = addData.relationshipToApplicant || "";
    const applicantName = item.user?.residentProfile
        ? `${item.user.residentProfile.firstName || ""} ${item.user.residentProfile.lastName || ""}`.trim()
        : item.user?.name || "";

    if (isRelative) {
        if (snap.firstName || snap.lastName) {
            const relFullName = [snap.firstName, snap.middleName, snap.lastName, snap.suffix]
                .filter(Boolean)
                .join(" ")
                .trim();
            if (relFullName) {
                return { name: relFullName, isRelative: true, relationship, applicantName };
            }
        }
        if (snap.fullName && typeof snap.fullName === "string") {
            return { name: snap.fullName.trim(), isRelative: true, relationship, applicantName };
        }
        if (snap.name && typeof snap.name === "string") {
            return { name: snap.name.trim(), isRelative: true, relationship, applicantName };
        }
    }

    const standardName = getCitizenName(item);
    return { name: standardName, isRelative: false };
}

function isTicketForToday(tx: any): boolean {
    const today = new Date();
    const addData = typeof tx?.additionalData === "string" 
        ? (() => { try { return JSON.parse(tx.additionalData); } catch { return {}; } })()
        : (tx?.additionalData || {});

    // Rule 1: Must have explicit checkIn details
    const isCheckedIn = Boolean(addData.checkedIn === true);
    if (!isCheckedIn || !addData.checkedInAt) {
        return false;
    }

    // Rule 2: checkInAt date must equal today's date
    const checkInDate = new Date(addData.checkedInAt);
    if (
        isNaN(checkInDate.getTime()) ||
        checkInDate.getFullYear() !== today.getFullYear() ||
        checkInDate.getMonth() !== today.getMonth() ||
        checkInDate.getDate() !== today.getDate()
    ) {
        return false;
    }

    // Rule 3: For standard single-day appointments, appointmentDate must match today.
    // Multi-day workflows (Business Permits, POSO fines, UNPAID payment check-ins) are allowed based on their check-in today.
    const isBusinessPermit = (tx.type?.category || "").toUpperCase().includes("BUSINESS") || (tx.type?.code || "").toUpperCase().startsWith("BUSINESS_PERMIT");
    const isMultiDayService = isBusinessPermit || ["UNPAID", "PAID", "FOR_CLAIM", "EVALUATED", "FOR_PAYMENT", "FOR_PROCESSING"].includes(tx.status);

    if (tx?.appointmentDate && !isMultiDayService) {
        const apptDate = new Date(tx.appointmentDate);
        if (
            isNaN(apptDate.getTime()) ||
            apptDate.getFullYear() !== today.getFullYear() ||
            apptDate.getMonth() !== today.getMonth() ||
            apptDate.getDate() !== today.getDate()
        ) {
            return false;
        }
    }

    return true;
}

export default function TreasuryQueuePage() {
    const router = useRouter();
    const [counterName, setCounterName] = useState<string | null>(null);
    const [waitingQueue, setWaitingQueue] = useState<any[]>([]);
    const [currentlyServingList, setCurrentlyServingList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
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
            const res = await getTreasuryQueueTickets(counterName);
            if (res.success && res.data) {
                const todayWaiting = (res.data.waiting || []).filter(isTicketForToday);
                const todayServing = (res.data.serving || []).filter(isTicketForToday);
                setWaitingQueue(todayWaiting);
                setCurrentlyServingList(todayServing);
                hasFetchedRef.current = true;
            } else {
                toast.error(res.error || "Failed to load queue tickets.");
            }
        } catch (err) {
            console.error("Failed to load queue:", err);
            toast.error("An error occurred while loading Treasury queue.");
        } finally {
            setLoading(false);
        }
    }, [counterName, isInitialized]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Supabase Real-time updates + Adaptive Polling Fallback
    useEffect(() => {
        // Track realtime connection state without causing re-renders
        const realtimeConnectedRef = { current: false };

        // Lightweight polling fallback (every 10 seconds unconditionally to sync state)
        const pollInterval = setInterval(() => {
            fetchQueue();
        }, 10000);

        // 2. Real-time WebSocket subscription
        let channel: any = null;
        if (supabase) {
            console.log("[DEBUG REALTIME] Supabase client initialized. Setting up subscription channel...");
            channel = supabase
                .channel("realtime-treasury-queue-page")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction"
                    },
                    (payload: any) => {
                        console.log("[DEBUG REALTIME] Realtime update detected on 'Transaction' table! Payload:", payload);
                        fetchQueue();
                    }
                )
                .subscribe((status: string) => {
                    console.log("[DEBUG REALTIME] Channel subscription status changed to:", status);
                    const wasConnected = realtimeConnectedRef.current;
                    realtimeConnectedRef.current = status === "SUBSCRIBED";

                    // Fetch immediately when we detect a disconnect
                    if (wasConnected && status === "CHANNEL_ERROR") {
                        console.warn("[Treasury Queue] Realtime disconnected — syncing immediately");
                        fetchQueue();
                    }
                });
        } else {
            console.error("[DEBUG REALTIME] Supabase client is NULL. Realtime subscription skipped.");
        }

        return () => {
            clearInterval(pollInterval);
            if (supabase && channel) {
                console.log("[DEBUG REALTIME] Cleaning up subscription channel...");
                supabase.removeChannel(channel);
            }
        };
    }, [fetchQueue]);

    // Action: Call Next ticket
    const handleCallNext = async () => {
        if (!counterName) return;
        setActionLoading(true);
        try {
            const res = await fetchAndCallNextTicket(counterName);
            if (res.success && res.data) {
                toast.success(`Calling ticket: ${res.data.queueNumber}`);
                await fetchQueue();
            } else {
                toast.error(res.error || "There is no one in the line yet");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to call next ticket.");
        } finally {
            setActionLoading(false);
        }
    };



    // Action: Recall a specific serving ticket
    const handleRecall = async (ticket: any) => {
        if (!ticket || !counterName) return;
        setActionLoading(true);
        try {
            const res = await callTicketToCounter(ticket.id, counterName);
            if (res.success) {
                toast.success(`Re-calling ticket: ${ticket.queueNumber}`);
            } else {
                toast.error(res.error || "Failed to recall ticket.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to recall ticket.");
        } finally {
            setActionLoading(false);
        }
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
                                onClick={() => router.push("/admin/treasury")}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                            <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter leading-none text-slate-900 dark:text-white">
                                Treasury <span className="text-primary">Live Queue</span>
                            </h1>
                        </div>
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest italic pl-11">
                            Treasury queue control panel
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-2xl shadow-sm">
                        <Activity className="w-5 h-5 text-primary animate-pulse" />
                        <div className="text-left">
                            <p className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Active Terminal</p>
                            <p className="text-xs font-bold text-slate-800 dark:text-white uppercase">
                                {counterName || "NO WINDOW CONFIGURED"}
                            </p>
                        </div>
                    </div>
                </div>

                {!isInitialized || (loading && counterName) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
                        {/* LEFT COLUMN SKELETON */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Call Next Button Skeleton */}
                            <div className="w-full h-16 rounded-2xl bg-slate-200/30 dark:bg-white/5 border border-slate-200/30 dark:border-white/10 animate-pulse" />

                            {/* Serving Card Skeleton */}
                            <Card className="rounded-3xl border border-slate-200/50 dark:border-white/10 shadow-xl overflow-hidden bg-white/40 dark:bg-white/5 relative">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-200/50 dark:bg-white/10" />
                                <CardContent className="p-8 space-y-8 flex flex-col items-center">
                                    {/* Subtitle placeholder */}
                                    <div className="h-3 w-48 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    {/* Serving badge placeholder */}
                                    <div className="h-6 w-24 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    {/* Number placeholder */}
                                    <div className="h-20 w-64 bg-slate-200/60 dark:bg-white/10 rounded-3xl animate-pulse" />
                                    {/* Name placeholder */}
                                    <div className="space-y-2 w-full max-w-xs flex flex-col items-center">
                                        <div className="h-2 w-20 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                        <div className="h-5 w-48 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    </div>
                                    {/* Service placeholder */}
                                    <div className="h-5 w-32 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    {/* Buttons placeholder */}
                                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 w-full flex justify-center gap-4">
                                        <div className="h-12 w-32 bg-slate-200/60 dark:bg-white/10 rounded-xl animate-pulse" />
                                        <div className="h-12 w-44 bg-slate-200/60 dark:bg-white/10 rounded-xl animate-pulse" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN SKELETON */}
                        <div className="space-y-4">
                            {/* Title placeholder */}
                            <div className="h-4 w-36 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                            {/* List Card Placeholder */}
                            <div className="space-y-3">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                                        <div className="space-y-2">
                                            <div className="h-5 w-16 bg-slate-200/60 dark:bg-white/10 rounded-lg animate-pulse" />
                                            <div className="h-2.5 w-24 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                        </div>
                                        <div className="h-4 w-28 bg-slate-200/60 dark:bg-white/10 rounded-full animate-pulse" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : !counterName ? (
                    <Card className="border border-red-500/20 bg-red-500/5 rounded-3xl p-8 text-center max-w-xl mx-auto space-y-4">
                        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 uppercase">Window Counter Required</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                            Please configure your active counter/window first using the **&quot;Set Counter&quot;** selector located in the top navigation bar.
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
                                className="w-full h-16 rounded-2xl bg-primary text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-lg"
                            >
                                <Volume2 className="w-5 h-5 animate-bounce" />
                                Call Next in Queue
                            </Button>

                            {/* Currently Serving Terminal Display */}
                            <Card className="rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden bg-white dark:bg-white/5 relative">
                                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-blue-600" />

                                <CardContent className="p-8 space-y-6 text-center">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Now Processing at {counterName}</p>
                                    </div>
                                    {(() => {
                                        const currentlyServing = currentlyServingList[0] || null;
                                        return currentlyServing ? (
                                            <div className="space-y-6">
                                                <div className="space-y-2">
                                                    <span className="inline-flex items-center gap-2 px-6 py-2 bg-amber-500/10 text-amber-500 rounded-full text-xs font-black uppercase tracking-widest border border-amber-500/20 italic animate-pulse mx-auto">
                                                        <Activity className="w-4 h-4" />
                                                        Serving
                                                    </span>
                                                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-950 dark:text-white uppercase italic leading-none font-mono py-4">
                                                        {currentlyServing.queueNumber
                                                            ? currentlyServing.queueNumber.split("-").pop()
                                                            : "TR-XXX"}
                                                    </h2>
                                                </div>

                                                {(() => {
                                                    const details = getCitizenDetails(currentlyServing);
                                                    return (
                                                        <div className="space-y-1.5 max-w-md mx-auto">
                                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                                                    {details.isRelative ? "Relative&apos;s Name (Cedula Holder)" : "Citizen Name"}
                                                                </p>
                                                                {details.isRelative && (
                                                                    <span className="text-[8px] font-black tracking-widest uppercase bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full italic">
                                                                        {details.relationship ? `Relative: ${details.relationship}` : "Relative"}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h3 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                                {details.name}
                                                            </h3>
                                                            {details.isRelative && details.applicantName && (
                                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                                                    Processed by: <span className="text-slate-600 dark:text-slate-300 font-bold">{details.applicantName}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                <div className="space-y-1">
                                                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Service Type</p>
                                                    <span className="text-xs font-bold text-primary uppercase bg-primary/5 px-3 py-1 rounded-full border border-primary/10 inline-block">
                                                        {currentlyServing.type?.name}
                                                    </span>
                                                </div>

                                                <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-4">
                                                    <Button
                                                        variant="outline"
                                                        className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 border-slate-200 dark:border-white/10 hover:border-amber-500/40 hover:text-amber-500"
                                                        onClick={() => handleRecall(currentlyServing)}
                                                        disabled={actionLoading}
                                                    >
                                                        <Volume2 className="w-4 h-4" />
                                                        Recall Voice
                                                    </Button>
                                                    <Button
                                                        className="h-12 px-6 rounded-xl font-black uppercase tracking-widest text-[10px]"
                                                        onClick={() => router.push(`/admin/treasury/${currentlyServing.id}`)}
                                                    >
                                                        Process Request
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="py-12 space-y-4">
                                                <Smile className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto" />
                                                <div className="space-y-1 max-w-sm mx-auto">
                                                    <p className="text-base font-bold text-slate-400 uppercase italic">No Active Ticket</p>
                                                    <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-medium">
                                                        Click **&quot;Call Next in Queue&quot;** to pull the next waiting citizen to your counter.
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: Waiting List (Next in Line) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 italic flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    Next in Line ({waitingQueue.length})
                                </h3>
                            </div>

                            <div className="space-y-3">
                                {waitingQueue.length > 0 ? (
                                    waitingQueue.map((tx) => {
                                        const queueNum = tx.queueNumber || "TR-XXX";
                                        const isPriority = tx.isPriority;

                                        return (
                                            <div
                                                key={tx.id}
                                                className="flex items-center justify-between p-3.5 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm transition-all hover:bg-slate-50 dark:hover:bg-white/[0.08]"
                                            >
                                                <div className="flex flex-col items-start gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm sm:text-base font-black font-mono tracking-tight text-slate-900 dark:text-white uppercase italic">
                                                            {queueNum}
                                                        </span>
                                                        {isPriority && (
                                                            <span className="text-[8px] font-black tracking-widest uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-full italic animate-pulse">
                                                                Priority
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                                        Status: <span className="text-primary">{tx.status === "UNPAID" ? "FOR PAYMENT" : tx.status?.replace(/_/g, " ")}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {(() => {
                                                        const details = getCitizenDetails(tx);
                                                        return (
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase truncate max-w-[180px] leading-tight">
                                                                    {details.name}
                                                                </p>
                                                                {details.isRelative && (
                                                                    <p className="text-[8px] font-black uppercase text-primary tracking-wider">
                                                                        {details.relationship ? `Relative (${details.relationship})` : "Relative"}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <Card className="rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm bg-white dark:bg-white/5 overflow-hidden">
                                        <CardContent className="p-3 text-center py-10 space-y-3.5">
                                            <Smile className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto" />
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-slate-400 uppercase">Queue is Empty</p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-medium max-w-[180px] mx-auto">
                                                    No citizens are checked in for payment today.
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
