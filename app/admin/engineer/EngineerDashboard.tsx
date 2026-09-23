"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
    getEngineerTransactions, 
    getEngineerStatusCounts
} from "@/app/admin/transactions/actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Search, RefreshCcw, 
    Archive, Clock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";


const STATUS_TABS = [
    { 
        value: "ALL", 
        label: "All", 
        inactiveColor: "bg-slate-100/80 text-slate-700 border-slate-200/80 dark:bg-[#1c2233] dark:text-slate-300 dark:border-slate-700/60 hover:bg-slate-200/70 dark:hover:bg-[#252d43]", 
        activeColor: "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm border-slate-900 dark:border-white",
        badgeInactive: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
        badgeActive: "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
    },
    { 
        value: "FOR_REQUESTING", 
        label: "Evaluation", 
        inactiveColor: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30 hover:bg-amber-500/20 dark:hover:bg-amber-500/20", 
        activeColor: "bg-amber-500 text-white shadow-sm shadow-amber-500/20 border-amber-500",
        badgeInactive: "bg-amber-500/20 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "FOR_REVISION", 
        label: "For Revision", 
        inactiveColor: "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30 hover:bg-orange-500/20 dark:hover:bg-orange-500/20", 
        activeColor: "bg-orange-600 text-white shadow-sm shadow-orange-600/20 border-orange-600",
        badgeInactive: "bg-orange-500/20 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "FOR_INSPECTION", 
        label: "For Inspection", 
        inactiveColor: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30 hover:bg-purple-500/20 dark:hover:bg-purple-500/20", 
        activeColor: "bg-purple-600 text-white shadow-sm shadow-purple-600/20 border-purple-600",
        badgeInactive: "bg-purple-500/20 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "FOR_PROCESSING", 
        label: "Processing", 
        inactiveColor: "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30 hover:bg-sky-500/20 dark:hover:bg-sky-500/20", 
        activeColor: "bg-sky-600 text-white shadow-sm shadow-sky-600/20 border-sky-600",
        badgeInactive: "bg-sky-500/20 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "FOR_CLAIM", 
        label: "For Claim", 
        inactiveColor: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/20", 
        activeColor: "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 border-indigo-600",
        badgeInactive: "bg-indigo-500/20 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "PAID", 
        label: "Paid", 
        inactiveColor: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/20", 
        activeColor: "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 border-emerald-600",
        badgeInactive: "bg-emerald-500/20 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "RELEASED", 
        label: "Released", 
        inactiveColor: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30 hover:bg-blue-500/20 dark:hover:bg-blue-500/20", 
        activeColor: "bg-blue-600 text-white shadow-sm shadow-blue-600/20 border-blue-600",
        badgeInactive: "bg-blue-500/20 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "REJECTED", 
        label: "Rejected", 
        inactiveColor: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 hover:bg-rose-500/20 dark:hover:bg-rose-500/20", 
        activeColor: "bg-rose-600 text-white shadow-sm shadow-rose-600/20 border-rose-600",
        badgeInactive: "bg-rose-500/20 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
        badgeActive: "bg-white/25 text-white"
    },
    { 
        value: "CANCELLED", 
        label: "Cancelled", 
        inactiveColor: "bg-slate-500/10 text-slate-600 border-slate-500/30 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/30 hover:bg-slate-500/20 dark:hover:bg-slate-500/20", 
        activeColor: "bg-slate-600 text-white shadow-sm shadow-slate-600/20 border-slate-600",
        badgeInactive: "bg-slate-500/20 text-slate-600 dark:bg-slate-500/20 dark:text-slate-400",
        badgeActive: "bg-white/25 text-white"
    }
];

// Helper: format exact date & time
function formatDateTime(date: string | Date): { date: string; time: string } {
    const d = new Date(date);
    return {
        date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
}

// Helper: Safely parse residentSnapshot which might be stringified JSON
function getResidentSnapshot(tx: any): any {
    if (!tx) return {};
    const raw = tx.residentSnapshot || tx.user?.residentProfile;
    if (!raw) return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw) || {};
        } catch {
            return {};
        }
    }
    return (typeof raw === 'object' && raw !== null) ? raw : {};
}

function getEngineerTransactionUrl(tx: any): string {
    if (tx.isCancelled || tx.status === "CANCELLED") {
        return `/admin/engineer/${tx.id}/evaluation?view=true`;
    }
    if (tx.status === "FOR_REQUESTING" || tx.status === "FOR_REVISION" || tx.status === "REJECTED") {
        return `/admin/engineer/${tx.id}/evaluation`;
    }
    if (tx.status === "FOR_INSPECTION") {
        return `/admin/engineer/${tx.id}/inspection`;
    }
    if (tx.status === "FOR_REINSPECTION") {
        return `/admin/engineer/${tx.id}/reinspection`;
    }
    if (["EVALUATED", "UNPAID", "PAYMENT_SUBMITTED", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(tx.status)) {
        return `/admin/engineer/${tx.id}/fees`;
    }
    return `/admin/engineer/${tx.id}`;
}

export default function EngineerDashboard() {
    const router = useRouter();


    const [status, setStatus] = useState("ALL");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [sortBy, setSortBy] = useState<"date" | "service">("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const fetchTransactions = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const res = await getEngineerTransactions({
                status,
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch
            });
            if (res.success) {
                setTransactions(res.data || []);
                setTotalCount(res.totalCount || 0);
            } else if (!isSilent) {
                console.error("[EngineerDashboard] getEngineerTransactions failed:", res.error);
                setTransactions([]);
                setTotalCount(0);
                toast.error(res.error || "Failed to load transactions. Check your permissions.");
            }
        } catch (err) {
            if (!isSilent) {
                console.error("[EngineerDashboard] Unexpected error:", err);
                toast.error("Failed to load transactions");
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [status, currentPage, itemsPerPage, debouncedSearch]);

    const fetchStatusCounts = useCallback(async () => {
        try {
            const res = await getEngineerStatusCounts();
            if (res.success && res.data) {
                setStatusCounts(res.data);
            }
        } catch {
            // Silently fail — counts are non-critical
        }
    }, []);

    useEffect(() => {
        fetchTransactions();
        fetchStatusCounts();
    }, [fetchTransactions, fetchStatusCounts]);

    const realtimeTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const handleRealtimeUpdate = useCallback(() => {
        if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
        realtimeTimerRef.current = setTimeout(() => {
            fetchTransactions(true);
            fetchStatusCounts();
        }, 400);
    }, [fetchTransactions, fetchStatusCounts]);

    // Native SSE (Server-Sent Events) Stream Listener for Engineering Admin Hub
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource("/api/realtime/stream");
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("[SSE EngineerDashboard] Realtime stream payload:", data);
                    handleRealtimeUpdate();
                } catch {}
            };
        } catch {}

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [handleRealtimeUpdate]);

    // Event-driven Supabase Realtime Subscription for Engineering Admin Hub
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel("realtime-engineer-dashboard")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "Transaction",
                },
                () => {
                    handleRealtimeUpdate();
                }
            )
            .subscribe();

        return () => {
            if (realtimeTimerRef.current) clearTimeout(realtimeTimerRef.current);
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [handleRealtimeUpdate]);

    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, status, itemsPerPage]);

    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        });
    }, [transactions, sortDirection]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleDateHeaderClick = () => {
        if (sortBy === "date") {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy("date");
            setSortDirection("desc");
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Dashboard Controls */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-blue-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5">
                <Tabs value={status} onValueChange={setStatus} className="w-full">
                    {/* Filters Section */}
                    <div className="flex flex-col border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
                        {/* Status Tabs */}
                        <div className="px-4 pt-4 flex items-center gap-2 flex-wrap">
                            <TabsList className="bg-transparent p-0 h-auto flex-wrap justify-start gap-2">
                                {STATUS_TABS.map(tab => {
                                    const isActive = status === tab.value;
                                    const count = tab.value === "ALL"
                                        ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                                        : (statusCounts[tab.value] || 0);
                                    return (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className={cn(
                                                "rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all duration-200 border cursor-pointer",
                                                isActive
                                                    ? tab.activeColor
                                                    : tab.inactiveColor
                                            )}
                                        >
                                            {tab.label}
                                            <span className={cn(
                                                "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center transition-colors duration-200",
                                                isActive ? tab.badgeActive : tab.badgeInactive
                                            )}>
                                                {count}
                                            </span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </div>

                        {/* Search Row */}
                        <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                                <div className="relative w-full sm:w-[350px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <Input 
                                        placeholder="Search names or Application No..." 
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-blue-500 rounded-xl" 
                                    />
                                </div>
                            </div>
                            <Button 
                                onClick={() => fetchTransactions()} 
                                variant="outline" 
                                className="h-11 w-11 rounded-xl p-0 border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]"
                            >
                                <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>

                    <TabsContent value={status} className="mt-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-[#1a1f2e] dark:border-[#2a3040]">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">#</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Application No.</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Applicant</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">Service</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Method</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                                    <TableHead 
                                        className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors py-5"
                                        onClick={handleDateHeaderClick}
                                    >
                                        <div className="flex items-center gap-1.5 group">
                                            <span>Date</span>
                                            <span className={cn(
                                                "transition-colors duration-200 font-black text-[10px]",
                                                sortBy === "date" 
                                                    ? "text-blue-600 dark:text-blue-400 font-bold" 
                                                    : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                                            )}>
                                                {sortBy === "date" 
                                                    ? (sortDirection === "asc" ? "▲" : "▼") 
                                                    : "⇅"
                                                }
                                            </span>
                                        </div>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i} className="animate-pulse">
                                            <TableCell colSpan={7} className="h-20 text-center"><div className="h-4 bg-slate-100 dark:bg-slate-800 rounded mx-8" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : sortedTransactions.length > 0 ? (
                                    sortedTransactions.map((tx: any, index: number) => (
                                        <TableRow 
                                            key={tx.id} 
                                            onClick={() => router.push(getEngineerTransactionUrl(tx))}
                                            className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer select-none"
                                        >
                                            <TableCell className="py-4">
                                                <span className="text-xs font-black font-mono tracking-widest text-primary">{(currentPage - 1) * itemsPerPage + index + 1}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-[11px] font-mono font-bold text-[#0c4a6e] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg border border-blue-100 dark:border-blue-800/30 select-all tracking-wider">
                                                    {tx.id}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                        {(() => {
                                                            const rs = getResidentSnapshot(tx);
                                                            return `${rs?.firstName || 'Unknown'} ${rs?.lastName || 'Applicant'}`;
                                                        })()}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase italic mt-0.5">
                                                        Registered Resident
                                                    </span>
                                                    {(tx.user?.rejectionCount === 2 || tx.revisionCount === 3 || (tx as any).rejection_count === 3) && (
                                                        <span className="mt-1 w-max px-2.5 py-0.5 rounded text-[9px] font-black italic tracking-widest uppercase bg-red-600 text-white shadow-sm shadow-red-500/30 animate-pulse">
                                                            FINAL ATTEMPT
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                                                    {tx.type?.name}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">{tx.fulfillmentType}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">{tx.paymentType?.replace("_", " ")}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={cn(
                                                     "text-[10px] font-black uppercase italic tracking-wider",
                                                     tx.isCancelled ? "text-red-600" : ({
                                                         "FOR_REQUESTING": "text-amber-600",
                                                         "FOR_REVISION": "text-amber-600",
                                                         "EVALUATED": tx.additionalData?.zoningStatus ? "text-purple-600" : "text-blue-600",
                                                         "FOR_CLAIM": "text-indigo-600",
                                                         "FOR_PROCESSING": "text-sky-600",
                                                         "PAID": "text-emerald-600",
                                                         "RELEASED": "text-slate-600",
                                                         "REJECTED": "text-red-600",
                                                     } as Record<string, string>)[tx.status] || "text-slate-500"
                                                 )}>
                                                     {tx.isCancelled ? "CANCELLED" : (() => {
                                                         if (tx.status === "EVALUATED" && tx.additionalData?.zoningStatus) {
                                                             return `ZONING: ${tx.additionalData.zoningStatus.replace(/_/g, " ")}`;
                                                         }
                                                         return tx.status?.replace(/_/g, " ");
                                                     })()}
                                                 </span>
                                                 {tx.revisionCount === 3 && !tx.isCancelled && tx.status !== "REJECTED" && (
                                                     <div className="mt-1">
                                                         <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm animate-pulse">
                                                             FINAL ATTEMPT
                                                         </span>
                                                     </div>
                                                 )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                            {(() => {
                                                                const source = tx.updatedAt;
                                                                const f = formatDateTime(source);
                                                                return (
                                                                    <>
                                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{f.date}</span>
                                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{f.time}</span>
                                                                    </>
                                                                );
                                                            })()}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-[400px] text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                                <Archive className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                                                <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No building permit applications found</p>
                                                <p className="mt-2">Try adjusting your filters or search term.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]/50">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                            <span className="hidden sm:inline-block">Rows per page:</span>
                            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                                <SelectTrigger className="h-8 w-[70px] border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] rounded-lg">
                                    <SelectValue placeholder={itemsPerPage} />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b]">
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="20">20</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                Showing {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                                >
                                    Prev
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                                >
                                    Next
                                </Button>
                            </div>
                        </div>
                    </div>
                </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
