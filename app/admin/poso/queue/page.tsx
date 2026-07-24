"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Volume2,
    Users,
    Activity,
    ShieldAlert,
    Search,
    UserCheck,
    CheckCircle2,
    Clock,
    Plus,
    RefreshCw,
    Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import CounterSelectorHeader from "@/components/admin/CounterSelectorHeader";
import {
    getPosoQueueTickets,
    fetchAndCallNextPosoTicket,
    callSpecificPosoTicket,
    checkInPosoTicket,
    completePosoServingTicket
} from "@/app/admin/transactions/poso-calling-actions";
import { getTickets } from "@/app/admin/poso/actions";

export default function PosoQueuePage() {
    const router = useRouter();
    const [counterName, setCounterName] = useState<string | null>(null);
    const [waitingQueue, setWaitingQueue] = useState<any[]>([]);
    const [currentlyServingList, setCurrentlyServingList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const hasFetchedRef = useRef(false);

    // Check-in Modal States
    const [isCheckInOpen, setIsCheckInOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [allTickets, setAllTickets] = useState<any[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [isPriority, setIsPriority] = useState(false);
    const [checkInLoading, setCheckInLoading] = useState(false);

    // Load active counter from localStorage
    const loadCounter = useCallback(() => {
        if (typeof window !== "undefined") {
            const activeCounter = localStorage.getItem("activeCounterName") || "POSO Counter 1 - Adjudication";
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
            const res = await getPosoQueueTickets(counterName);
            if (res.success && res.data) {
                setWaitingQueue(res.data.waiting || []);
                setCurrentlyServingList(res.data.serving || []);
                hasFetchedRef.current = true;
            } else {
                toast.error(res.error || "Failed to load POSO queue tickets.");
            }
        } catch (err) {
            console.error("Failed to load POSO queue:", err);
            toast.error("An error occurred while loading POSO queue.");
        } finally {
            setLoading(false);
        }
    }, [counterName, isInitialized]);

    useEffect(() => {
        fetchQueue();
    }, [fetchQueue]);

    // Supabase Real-time updates + Adaptive Polling Fallback
    useEffect(() => {
        const realtimeConnectedRef = { current: false };

        const pollInterval = setInterval(() => {
            if (!realtimeConnectedRef.current) {
                fetchQueue();
            }
        }, 10000);

        let channel: any = null;
        if (supabase) {
            channel = supabase
                .channel("realtime-poso-queue-page")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "TicketHeader"
                    },
                    () => {
                        fetchQueue();
                    }
                )
                .subscribe((status: string) => {
                    realtimeConnectedRef.current = status === "SUBSCRIBED";
                    if (status === "CHANNEL_ERROR") {
                        fetchQueue();
                    }
                });
        }

        return () => {
            clearInterval(pollInterval);
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchQueue]);

    // Fetch traffic tickets for check-in modal
    const loadCheckInTickets = async () => {
        try {
            const res = await getTickets({ page: 1, pageSize: 100 });
            if (res.success && res.tickets) {
                // Only show tickets that are not yet paid or released
                const available = res.tickets.filter((t: any) => !t.isPaid && t.status !== "CANCELLED");
                setAllTickets(available);
                setFilteredTickets(available);
            }
        } catch (err) {
            console.error("Failed to load tickets for check in:", err);
        }
    };

    useEffect(() => {
        if (isCheckInOpen) {
            loadCheckInTickets();
        }
    }, [isCheckInOpen]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTickets(allTickets);
        } else {
            const q = searchQuery.toLowerCase().trim();
            const matched = allTickets.filter(
                (t: any) =>
                    t.ticketNo?.toLowerCase().includes(q) ||
                    t.violatorName?.toLowerCase().includes(q) ||
                    t.plateNo?.toLowerCase().includes(q)
            );
            setFilteredTickets(matched);
        }
    }, [searchQuery, allTickets]);

    // Speak Queue Announcement (Voice TTS)
    const announceTicket = (queueNo: string, violatorName?: string) => {
        try {
            if ("speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const text = `Now serving POSO Ticket number ${queueNo.replace(/-/g, " ")}, ${violatorName || "Citizen"}, please proceed to ${counterName || "POSO Counter"}.`;
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.error("Voice announcement error:", e);
        }
    };

    // Action: Call Next ticket
    const handleCallNext = async () => {
        if (!counterName) return;
        setActionLoading(true);
        try {
            const res = await fetchAndCallNextPosoTicket(counterName);
            if (res.success && "data" in res && res.data) {
                toast.success(`Calling POSO ticket: ${res.data.queueNumber}`);
                announceTicket(res.data.queueNumber, res.data.violatorName);
                await fetchQueue();
            } else {
                toast.error(res.error || "There are no citizens waiting in line yet.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to call next ticket.");
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Call Specific Ticket
    const handleCallSpecific = async (ticketId: string) => {
        if (!counterName) return;
        setActionLoading(true);
        try {
            const res = await callSpecificPosoTicket(ticketId, counterName);
            if (res.success && "data" in res && res.data) {
                toast.success(`Calling POSO ticket: ${res.data.queueNumber}`);
                announceTicket(res.data.queueNumber, res.data.violatorName);
                await fetchQueue();
            } else {
                toast.error(res.error || "Failed to call ticket.");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to call ticket.");
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Complete Serving Ticket
    const handleCompleteServing = async (ticketId: string) => {
        setActionLoading(true);
        try {
            const res = await completePosoServingTicket(ticketId);
            if (res.success) {
                toast.success("Ticket queue serving completed!");
                await fetchQueue();
            } else {
                toast.error(res.error || "Failed to complete serving.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred.");
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Submit Check-in
    const handleCheckInSubmit = async () => {
        if (!selectedTicketId) {
            toast.error("Please select a citation ticket to check in.");
            return;
        }

        setCheckInLoading(true);
        try {
            const res = await checkInPosoTicket({
                ticketId: selectedTicketId,
                isPriority
            });

            if (res.success) {
                if (res.alreadyCheckedIn) {
                    toast.info(`Ticket is already checked in with Queue #${res.queueNumber}`);
                } else {
                    toast.success(`Successfully checked in! Queue #${res.queueNumber}`);
                }
                setIsCheckInOpen(false);
                setSelectedTicketId(null);
                setSearchQuery("");
                await fetchQueue();
            } else {
                toast.error(res.error || "Failed to check in ticket.");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred during check in.");
        } finally {
            setCheckInLoading(false);
        }
    };

    const currentServing = currentlyServingList[0] || null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Top Navigation & Counter Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push("/admin/poso/tickets")}
                        className="rounded-xl hover:bg-slate-900 text-slate-400 hover:text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <ShieldAlert className="w-6 h-6 text-rose-500" />
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase italic">
                                POSO Traffic Queue Management
                            </h1>
                        </div>
                        <p className="text-xs text-slate-400">
                            Public Order & Safety Office — Citation Adjudication & Fine Queue
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Button
                        onClick={() => setIsCheckInOpen(true)}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl h-10 px-4 gap-2 shadow-lg shadow-rose-600/20"
                    >
                        <Plus className="w-4 h-4" />
                        Check-In Citation Ticket
                    </Button>

                    <CounterSelectorHeader
                        userDepartment="POSO"
                    />
                </div>
            </div>

            {/* Currently Serving Hero Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/40 border-slate-800 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
                    <CardContent className="p-6 relative z-10 space-y-6">
                        <div className="flex items-center justify-between">
                            <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs font-black uppercase tracking-widest px-3 py-1 gap-1.5">
                                <Activity className="w-3.5 h-3.5 animate-pulse" />
                                Currently Serving at Counter
                            </Badge>

                            {currentServing && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => announceTicket(currentServing.queueNumber, currentServing.violatorName)}
                                    className="bg-slate-900/80 border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl h-8 px-3 gap-1.5"
                                >
                                    <Volume2 className="w-3.5 h-3.5 text-rose-400" />
                                    Announce Voice
                                </Button>
                            )}
                        </div>

                        {currentServing ? (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Queue Number</p>
                                    <h2 className="text-4xl sm:text-6xl font-black tracking-tighter text-white font-mono drop-shadow-md">
                                        {currentServing.queueNumber}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Violator Name</p>
                                        <p className="text-base font-bold text-white tracking-wide">
                                            {currentServing.violatorName || "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Ticket Number / Plate</p>
                                        <p className="text-sm font-semibold text-rose-400 font-mono">
                                            {currentServing.ticketNo} {currentServing.plateNo ? `• ${currentServing.plateNo}` : ""}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                    <div className="flex items-center gap-2">
                                        {currentServing.isPriority ? (
                                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px] uppercase font-black tracking-wider px-2.5 py-1">
                                                Priority Queue
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-slate-800 text-slate-300 text-[10px] uppercase font-bold px-2.5 py-1">
                                                Regular Queue
                                            </Badge>
                                        )}
                                        <span className="text-xs text-slate-400 font-mono">
                                            Fined: ₱{currentServing.totalAmount?.toLocaleString() || "0"}
                                        </span>
                                    </div>

                                    <Button
                                        onClick={() => handleCompleteServing(currentServing.id)}
                                        disabled={actionLoading}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl h-10 px-5 gap-2 shadow-lg shadow-emerald-600/20"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Complete Serving
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-10 text-center space-y-3">
                                <Users className="w-12 h-12 text-slate-700 mx-auto" />
                                <div className="space-y-1">
                                    <p className="text-base font-bold text-slate-300">No Citizen Currently Being Served</p>
                                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                        Click "Call Next Ticket" below to call the highest priority citizen waiting in line.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">
                                Active Counter: <strong className="text-white">{counterName}</strong>
                            </span>

                            <Button
                                onClick={handleCallNext}
                                disabled={actionLoading || waitingQueue.length === 0}
                                className="bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl h-11 px-6 gap-2 shadow-xl shadow-rose-600/25 active:scale-95 transition-all"
                            >
                                <Volume2 className="w-4 h-4" />
                                {actionLoading ? "Calling..." : "Call Next Ticket"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Waiting Queue Summary & Quick Stats */}
                <Card className="lg:col-span-5 bg-slate-900/90 border-slate-800 shadow-xl flex flex-col justify-between">
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-rose-400" />
                                <h3 className="font-bold text-white text-base">Queue Overview</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchQueue}
                                className="h-8 px-2 text-slate-400 hover:text-white"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Total Waiting</p>
                                <p className="text-3xl font-black text-rose-400 font-mono">{waitingQueue.length}</p>
                            </div>
                            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Priority Waiting</p>
                                <p className="text-3xl font-black text-amber-400 font-mono">
                                    {waitingQueue.filter(t => t.isPriority).length}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Next In Line</p>
                            {waitingQueue.length > 0 ? (
                                <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                                    {waitingQueue.slice(0, 4).map((ticket, idx) => (
                                        <div
                                            key={ticket.id}
                                            className="flex items-center justify-between p-3 bg-slate-950/90 border border-slate-800 rounded-xl hover:border-slate-700 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-bold text-slate-500 font-mono w-5">#{idx + 1}</span>
                                                <div>
                                                    <p className="text-sm font-black text-white font-mono">{ticket.queueNumber}</p>
                                                    <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                                        {ticket.violatorName}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => handleCallSpecific(ticket.id)}
                                                disabled={actionLoading}
                                                className="bg-slate-800 hover:bg-rose-600 text-white font-bold text-[11px] h-7 px-3 rounded-lg"
                                            >
                                                Call Now
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl">
                                    <p className="text-xs text-slate-500">Waiting line is empty</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Waiting Queue Detailed Table */}
            <Card className="bg-slate-900/90 border-slate-800 shadow-xl overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-rose-400" />
                        <h3 className="font-bold text-white text-base">Waiting Citizens Line</h3>
                    </div>
                    <Badge className="bg-slate-800 text-slate-300 font-mono text-xs">
                        {waitingQueue.length} Tickets
                    </Badge>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
                            <tr>
                                <th className="p-3.5 pl-5">Queue Ticket #</th>
                                <th className="p-3.5">Violator / Citizen</th>
                                <th className="p-3.5">Citation Ticket #</th>
                                <th className="p-3.5">Priority Status</th>
                                <th className="p-3.5">Fine Amount</th>
                                <th className="p-3.5 text-right pr-5">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-medium">
                            {waitingQueue.length > 0 ? (
                                waitingQueue.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3.5 pl-5 font-mono font-black text-rose-400 text-sm">
                                            {t.queueNumber}
                                        </td>
                                        <td className="p-3.5 font-bold text-white">
                                            {t.violatorName || "Unknown Citizen"}
                                        </td>
                                        <td className="p-3.5 font-mono text-slate-400">
                                            {t.ticketNo}
                                        </td>
                                        <td className="p-3.5">
                                            {t.isPriority ? (
                                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                                                    Priority (Senior/PWD)
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-slate-800 text-slate-400 text-[10px]">
                                                    Regular
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="p-3.5 font-mono text-slate-300">
                                            ₱{t.totalAmount?.toLocaleString() || "0"}
                                        </td>
                                        <td className="p-3.5 text-right pr-5">
                                            <Button
                                                size="sm"
                                                onClick={() => handleCallSpecific(t.id)}
                                                disabled={actionLoading}
                                                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-8 px-3 rounded-xl gap-1.5 shadow-md shadow-rose-600/20"
                                            >
                                                <Volume2 className="w-3.5 h-3.5" />
                                                Call to Counter
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No citation tickets currently checked into the queue line.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Check-In Modal */}
            <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-md rounded-2xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-rose-500" />
                            Check-In POSO Citation Ticket
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                            <Input
                                placeholder="Search by Ticket #, Violator Name, or Plate..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-slate-900 border-slate-800 pl-9 text-xs text-white rounded-xl focus:border-rose-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-[10px] uppercase font-bold text-slate-400">Select Citation Ticket</p>
                            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 border border-slate-800/80 rounded-xl p-2 bg-slate-900/60">
                                {filteredTickets.length > 0 ? (
                                    filteredTickets.map((ticket) => {
                                        const isSelected = selectedTicketId === ticket.id;
                                        return (
                                            <div
                                                key={ticket.id}
                                                onClick={() => setSelectedTicketId(ticket.id)}
                                                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                                    isSelected
                                                        ? "bg-rose-950/60 border-rose-500 text-white shadow-md shadow-rose-600/10"
                                                        : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="font-mono font-bold text-xs text-rose-400">
                                                        {ticket.ticketNo}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-slate-400">
                                                        ₱{ticket.totalAmount?.toLocaleString() || "0"}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-semibold text-white mt-0.5">
                                                    {ticket.violatorName || "Unknown Violator"}
                                                </p>
                                                {ticket.plateNo && (
                                                    <p className="text-[10px] text-slate-400">Plate: {ticket.plateNo}</p>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="p-4 text-center text-xs text-slate-500">
                                        No un-settled citation tickets found matching search.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Priority Toggle */}
                        <div
                            onClick={() => setIsPriority(!isPriority)}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                                isPriority
                                    ? "bg-amber-950/50 border-amber-500 text-amber-200"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-amber-400" />
                                <div>
                                    <p className="text-xs font-bold text-white">Priority Queue (Senior / PWD)</p>
                                    <p className="text-[10px] text-slate-400">Places ticket at top of POSO calling line</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={isPriority}
                                onChange={(e) => setIsPriority(e.target.checked)}
                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="ghost"
                            onClick={() => setIsCheckInOpen(false)}
                            className="text-xs text-slate-400 hover:text-white rounded-xl"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCheckInSubmit}
                            disabled={checkInLoading || !selectedTicketId}
                            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl px-5 shadow-lg shadow-rose-600/20"
                        >
                            {checkInLoading ? "Checking in..." : "Confirm Queue Check-In"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
