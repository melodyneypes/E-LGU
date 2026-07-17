"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
    getBFPTransactions, 
    getBFPStatusCounts
} from "@/app/admin/transactions/actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const STATUS_TABS = [
    { value: "ALL", label: "All", color: "text-slate-600", activeColor: "bg-slate-900 text-white dark:bg-white dark:text-slate-900" },
    { value: "PENDING", label: "Pending Evaluation", color: "text-amber-600", activeColor: "bg-amber-500 text-white" },
    { value: "APPROVED", label: "Acknowledged", color: "text-emerald-600", activeColor: "bg-emerald-500 text-white" },
    { value: "COMPLETED", label: "Completed", color: "text-cyan-600", activeColor: "bg-cyan-500 text-white" }
];

function formatDateTime(date: string | Date): { date: string; time: string } {
    const d = new Date(date);
    return {
        date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
}

function getResidentSnapshot(tx: any): any {
    if (!tx.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === 'string') {
        try {
            return JSON.parse(tx.residentSnapshot);
        } catch {
            return {};
        }
    }
    return tx.residentSnapshot;
}

function getEffectiveBfpStatus(tx: any): "PENDING" | "ACKNOWLEDGED" | "COMPLETED" {
    if (tx?.additionalData?.bfpStatus === "COMPLETED" || tx?.additionalData?.bfpClearanceUrl) return "COMPLETED";
    if (tx?.additionalData?.bfpStatus === "ACKNOWLEDGED") return "ACKNOWLEDGED";
    return "PENDING";
}

export default function BFPDashboard() {
    const router = useRouter();

    const [status, setStatus] = useState("ALL");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getBFPTransactions();
            if (res.success) {
                const allTransactions = res.data || [];
                setTransactions(
                    status === "ALL"
                        ? allTransactions
                        : allTransactions.filter((tx: any) => getEffectiveBfpStatus(tx) === status)
                );
            } else {
                setTransactions([]);
                toast.error(res.error || "Failed to load transactions.");
            }
        } catch {
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }, [status]);

    const fetchStatusCounts = useCallback(async () => {
        try {
            const res = await getBFPStatusCounts();
            if (res.success && res.data) {
                setStatusCounts(res.data);
            }
        } catch {}
    }, []);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        fetchStatusCounts();
    }, [fetchStatusCounts]);

    useEffect(() => {
        if (!loading) fetchStatusCounts();
    }, [loading, fetchStatusCounts]);

    useEffect(() => {
        if (currentPage !== 1) setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, itemsPerPage]);

    const filteredTransactions = transactions.filter(tx => {
        const rs = getResidentSnapshot(tx);
        const name = `${rs.firstName || ''} ${rs.lastName || ''}`.trim().toLowerCase();
        const refId = tx.id.slice(-8).toUpperCase();
        return name.includes(search.toLowerCase()) || 
               tx.id.toLowerCase().includes(search.toLowerCase()) ||
               refId.includes(search.toUpperCase());
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-white dark:bg-[#151b28] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <Tabs value={status} onValueChange={setStatus} className="w-full lg:w-auto">
                    <TabsList className="bg-slate-100 dark:bg-white/5 p-1 h-auto flex-wrap gap-1 rounded-2xl w-full justify-start">
                        {STATUS_TABS.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className={cn(
                                    "rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all",
                                    status === tab.value ? tab.activeColor : `hover:bg-white/50 dark:hover:bg-white/10 ${tab.color}`
                                )}
                            >
                                {tab.label}
                                {statusCounts[tab.value] > 0 && (
                                    <span className={cn(
                                        "ml-2 px-2 py-0.5 rounded-md text-[10px]",
                                        status === tab.value ? "bg-white/20" : "bg-slate-200 dark:bg-white/10"
                                    )}>
                                        {statusCounts[tab.value]}
                                    </span>
                                )}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>

                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by ID or name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-12 bg-slate-50 dark:bg-white/5 border-none rounded-xl"
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchTransactions}
                        disabled={loading}
                        className="h-12 w-12 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        <RefreshCcw className={cn("w-4 h-4 text-slate-600 dark:text-slate-300", loading && "animate-spin")} />
                    </Button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#151b28] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Reference ID</TableHead>
                                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Applicant Info</TableHead>
                                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors" onClick={() => { setSortDirection(prev => prev === "asc" ? "desc" : "asc"); }}>
                                    <div className="flex items-center gap-2">
                                        Date & Time
                                        <Clock className="w-3 h-3" />
                                    </div>
                                </TableHead>
                                <TableHead className="py-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-4">
                                            <div className="w-8 h-8 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
                                            <span className="text-sm font-bold text-slate-400 animate-pulse">Loading records...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : paginatedTransactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center mb-2">
                                                <Archive className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-500">No records found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedTransactions.map((tx) => {
                                    const rs = getResidentSnapshot(tx);
                                    const { date, time } = formatDateTime(tx.updatedAt);
                                    const effectiveStatus = getEffectiveBfpStatus(tx);
                                    const isSubmitted = effectiveStatus === "COMPLETED";

                                    return (
                                        <TableRow key={tx.id} className="group border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer" onClick={() => router.push(`/admin/bfp/${tx.id}/evaluation`)}>
                                            <TableCell className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                                        <span className="text-xs font-black text-red-600 dark:text-red-400 tracking-tighter">
                                                            {tx.id.slice(-4).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900 dark:text-white uppercase">#{tx.id.slice(-8)}</div>
                                                        <div className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">{tx.type?.code?.replace(/_/g, ' ')}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white">{rs.firstName} {rs.lastName}</span>
                                                    <span className="text-xs text-slate-500 font-medium">{tx.user?.email || "No email provided"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-6">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{date}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{time}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4 px-6 text-right">
                                                <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 font-bold text-[10px] uppercase tracking-widest rounded-lg" onClick={(e) => { e.stopPropagation(); router.push(`/admin/bfp/${tx.id}/evaluation`); }}>
                                                    {isSubmitted ? "View Details" : "Evaluate"}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rows per page:</span>
                        <Select value={String(itemsPerPage)} onValueChange={(v) => setItemsPerPage(Number(v))}>
                            <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-[#151b28] border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {[10, 20, 50, 100].map(v => (
                                    <SelectItem key={v} value={String(v)} className="text-xs font-bold">{v}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Showing {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8 px-3 rounded-lg border-slate-200 dark:border-white/10 font-bold text-xs">Prev</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="h-8 px-3 rounded-lg border-slate-200 dark:border-white/10 font-bold text-xs">Next</Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
