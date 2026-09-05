"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    getEngineerTransactions, 
    getEngineerPendingCount,
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
    { value: "ALL", label: "All", color: "text-slate-600", activeColor: "bg-slate-900 text-white dark:bg-white dark:text-slate-900" },
    { value: "FOR_REQUESTING", label: "FOR REQUESTING", color: "text-amber-600", activeColor: "bg-amber-500 text-white" },
    { value: "FOR_REVISION", label: "FOR REVISION", color: "text-amber-600", activeColor: "bg-amber-600 text-white" },
    { value: "FOR_INSPECTION", label: "FOR INSPECTION", color: "text-purple-600", activeColor: "bg-purple-500 text-white" },
    { value: "FOR_REINSPECTION", label: "FOR REINSPECTION", color: "text-violet-600", activeColor: "bg-violet-500 text-white" },
    { value: "EVALUATED", label: "EVALUATED", color: "text-emerald-600", activeColor: "bg-emerald-500 text-white" },
    { value: "ENDORSED", label: "ENDORSED", color: "text-orange-600", activeColor: "bg-orange-500 text-white" },
    { value: "PAID", label: "Paid", color: "text-emerald-600", activeColor: "bg-emerald-500 text-white" },
    { value: "FOR_PROCESSING", label: "FOR PROCESSING", color: "text-sky-600", activeColor: "bg-sky-500 text-white" },
    { value: "FOR_CLAIM", label: "FOR CLAIM", color: "text-indigo-600", activeColor: "bg-indigo-500 text-white" },
    { value: "RELEASED", label: "Released", color: "text-blue-600", activeColor: "bg-blue-500 text-white" },
    { value: "DELIVERED", label: "DELIVERED", color: "text-cyan-600", activeColor: "bg-cyan-500 text-white" },
    { value: "REJECTED", label: "ENG. REJECTED", color: "text-red-600", activeColor: "bg-red-500 text-white" },
    { value: "CANCELLED", label: "Cancelled", color: "text-slate-600", activeColor: "bg-slate-500 text-white" }
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

function isPendingEngineeringTransaction(tx: any): boolean {
    return !["EVALUATED", "UNPAID", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED", "DELIVERED", "REJECTED", "CANCELLED"].includes(tx.status || "");
}

function getZoningTransactionUrl(tx: any): string {
    if (tx.isCancelled || tx.status === "CANCELLED") {
        return `/admin/zoning/${tx.id}/evaluation?view=true`;
    }
    
    const zoningStatus = tx.additionalData?.zoningStatus;
    
    if (zoningStatus === "FOR_INSPECTION") {
        return `/admin/zoning/${tx.id}/inspection`;
    }
    if (zoningStatus === "FOR_REINSPECTION") {
        return `/admin/zoning/${tx.id}/reinspection`;
    }
    
    // If Zoning hasn't finished their own evaluation, always go to evaluation phase
    if (!zoningStatus || zoningStatus === "PENDING" || zoningStatus === "FOR_REQUESTING" || zoningStatus === "FOR_REVISION") {
        return `/admin/zoning/${tx.id}/evaluation`;
    }

    if (tx.status === "FOR_REQUESTING" || tx.status === "FOR_REVISION" || tx.status === "REJECTED") {
        return `/admin/zoning/${tx.id}/evaluation`;
    }
    
    if (["EVALUATED", "UNPAID", "PAYMENT_SUBMITTED", "PAID", "FOR_PROCESSING", "FOR_CLAIM", "FOR_PICKING", "RELEASED"].includes(tx.status)) {
        return `/admin/zoning/${tx.id}/fees`;
    }
    
    return `/admin/zoning/${tx.id}`;
}

export default function ZoningDashboard() {
    const router = useRouter();

    const [status, setStatus] = useState("ALL");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [sortBy, setSortBy] = useState<"date" | "service">("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const fetchTransactions = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const res = await getEngineerTransactions(status);
            if (res.success) {
                setTransactions(res.data || []);
            } else if (!isSilent) {
                console.error("[ZoningDashboard] getEngineerTransactions failed:", res.error);
                setTransactions([]);
                toast.error(res.error || "Failed to load transactions. Check your permissions.");
            }
            await getEngineerPendingCount();
        } catch (err) {
            if (!isSilent) {
                console.error("[ZoningDashboard] Unexpected error:", err);
                toast.error("Failed to load transactions");
            }
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [status]);

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
    }, [fetchTransactions]);

    useEffect(() => {
        fetchStatusCounts();
    }, [fetchStatusCounts]);

    useEffect(() => {
        if (!loading) {
            fetchStatusCounts();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Native SSE (Server-Sent Events) Stream Listener for MPDC Zoning Admin Hub
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource("/api/realtime/stream");
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("[SSE ZoningDashboard] Realtime stream payload:", data);
                    toast.info("⚡ Live Stream Update: Permit applications updated.", { id: "sse-zoning-toast" });
                    fetchTransactions(true);
                    fetchStatusCounts();
                } catch {}
            };
        } catch {}

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [fetchTransactions, fetchStatusCounts]);

    // Event-driven Supabase Realtime Subscription for MPDC Zoning Admin Hub
    useEffect(() => {
        if (!supabase) return;

        const channel = supabase
            .channel("realtime-zoning-dashboard")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "Transaction",
                },
                (payload: any) => {
                    console.log("[ZoningDashboard] Realtime change detected:", payload);
                    toast.info("⚡ Realtime Update: Applications updated live.", { id: "realtime-update-zoning" });
                    fetchTransactions(true);
                    fetchStatusCounts();
                }
            )
            .subscribe();

        return () => {
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchTransactions, fetchStatusCounts]);

    // Reset to page 1 when filters change
    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, itemsPerPage]);

    const visibleTransactions = transactions.filter(tx => !isPendingEngineeringTransaction(tx));

    const displayedTabs = STATUS_TABS.filter(tab => {
        if (tab.value === "ALL") return true;
        return (statusCounts[tab.value] || 0) > 0 || status === tab.value;
    });

    const filteredTransactions = visibleTransactions.filter(tx => {
        const rs = getResidentSnapshot(tx);
        const name = `${rs.firstName || ''} ${rs.lastName || ''}`.trim().toLowerCase();
        const refId = tx.id.slice(-8).toUpperCase();
        const searchUpper = search.toUpperCase();
        
        const matchesSearch = name.includes(search.toLowerCase()) || 
                             tx.id.toLowerCase().includes(search.toLowerCase()) ||
                             refId.includes(searchUpper);
                             
        return matchesSearch;
    });

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        const dateA = new Date(a.updatedAt).getTime();
        const dateB = new Date(b.updatedAt).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = sortedTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

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
                                {displayedTabs.map(tab => {
                                    const isActive = status === tab.value;
                                    const count = tab.value === "ALL"
                                        ? Object.values(statusCounts).reduce((a, b) => a + b, 0)
                                        : (statusCounts[tab.value] || 0);
                                    return (
                                        <TabsTrigger
                                            key={tab.value}
                                            value={tab.value}
                                            className={cn(
                                                "rounded-xl px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all duration-200 shadow-none",
                                                isActive
                                                    ? `${tab.activeColor} border-transparent`
                                                    : `bg-white dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] ${tab.color} hover:border-slate-300 dark:hover:border-slate-600`
                                            )}
                                        >
                                            {tab.label}
                                            <span className={cn(
                                                "text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                                                isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
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
                                        placeholder="Search names or Application No...." 
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
                                ) : paginatedTransactions.length > 0 ? (
                                    paginatedTransactions.map((tx: any, index: number) => (
                                        <TableRow 
                                            key={tx.id} 
                                            onClick={() => router.push(getZoningTransactionUrl(tx))}
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
                                Showing {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
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
