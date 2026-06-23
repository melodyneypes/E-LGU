"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    getBploTransactions,
    getPendingBploCount,
    getTransactionTypes
} from "@/app/admin/transactions/actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent } from "@/components/ui/tabs";
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
import { motion, AnimatePresence } from "framer-motion";

const STATUS_TABS = [
    { value: "ALL", label: "All Status", color: "text-slate-600", activeColor: "bg-slate-900 text-white dark:bg-white dark:text-slate-900" },
    { value: "DRAFT", label: "Draft", color: "text-slate-400", activeColor: "bg-slate-400 text-white" },
    { value: "FOR_REQUESTING", label: "For Evaluation", color: "text-yellow-600", activeColor: "bg-yellow-500 text-white" },
    { value: "FOR_REVISION", label: "For Revision", color: "text-purple-600", activeColor: "bg-purple-500 text-white" },
    { value: "FOR_INSPECTION", label: "Inspection", color: "text-blue-600", activeColor: "bg-blue-500 text-white" },
    { value: "FOR_REINSPECTION", label: "Re-inspection", color: "text-orange-600", activeColor: "bg-orange-500 text-white" },
    { value: "FOR_PROCESSING", label: "For Processing", color: "text-sky-600", activeColor: "bg-sky-500 text-white" },
    { value: "EVALUATED", label: "Evaluated", color: "text-emerald-600", activeColor: "bg-emerald-500 text-white" },
    { value: "UNPAID", label: "Unpaid", color: "text-amber-600", activeColor: "bg-amber-500 text-white" },
    { value: "PAID", label: "Paid", color: "text-emerald-500", activeColor: "bg-emerald-600 text-white" },
    { value: "FOR_CLAIM", label: "For Claim", color: "text-indigo-600", activeColor: "bg-indigo-500 text-white" },
    { value: "FOR_PICKING", label: "For Picking", color: "text-pink-600", activeColor: "bg-pink-500 text-white" },
    { value: "IN_ROUTE", label: "In Route", color: "text-cyan-600", activeColor: "bg-cyan-500 text-white" },
    { value: "RETURN_REQUESTED", label: "Request for Return", color: "text-amber-600", activeColor: "bg-amber-600 text-white" },
    { value: "REFUND_REQUESTED", label: "Request for Refund", color: "text-amber-600", activeColor: "bg-amber-600 text-white" },
    { value: "RELEASED", label: "Released", color: "text-slate-600", activeColor: "bg-slate-700 text-white" },
    { value: "DELIVERED", label: "Delivered", color: "text-teal-600", activeColor: "bg-teal-500 text-white" },
    { value: "REJECTED", label: "Rejected", color: "text-red-500", activeColor: "bg-red-500 text-white" },
    { value: "CANCELLED", label: "Cancelled", color: "text-red-400", activeColor: "bg-red-600 text-white" }
];

function formatDateTime(date: string | Date): { date: string; time: string } {
    const d = new Date(date);
    return {
        date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
}

export default function BploDashboard() {
    const router = useRouter();
    const [status, setStatus] = useState("ALL");
    const [transactions, setTransactions] = useState<any[]>([]);
    const [allServices, setAllServices] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState<"date" | "service">("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const [serviceFilter, setServiceFilter] = useState<string | null>(null);
    const [serviceSearch, setServiceSearch] = useState("");
    const [statusSearch, setStatusSearch] = useState("");
    const [newRequestAlert, setNewRequestAlert] = useState<{ id: string; businessName: string; applicantName: string } | null>(null);
    const [showAlert, setShowAlert] = useState(false);
    const alertTimerRef = useRef<NodeJS.Timeout | null>(null);
    const serviceSearchInputRef = useRef<HTMLInputElement>(null);
    const statusSearchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (serviceSearchInputRef.current) {
                serviceSearchInputRef.current.focus();
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [serviceSearch]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (statusSearchInputRef.current) {
                statusSearchInputRef.current.focus();
            }
        }, 50);
        return () => clearTimeout(timer);
    }, [statusSearch]);

    const filteredServices = useMemo(() => {
        return allServices.filter(srv =>
            srv.toLowerCase().includes(serviceSearch.toLowerCase())
        );
    }, [allServices, serviceSearch]);

    const filteredStatusTabs = useMemo(() => {
        return STATUS_TABS.filter(tab =>
            tab.label.toLowerCase().includes(statusSearch.toLowerCase())
        );
    }, [statusSearch]);

    useEffect(() => {
        async function fetchServices() {
            try {
                const res = await getTransactionTypes();
                if (res.success && res.data) {
                    const filtered = res.data.filter((t: any) => t.code?.startsWith("BUSINESS_PERMIT"));
                    const names = filtered.map((t: any) => t.name).filter(Boolean);
                    setAllServices(names);
                }
            } catch (err) {
                console.error("Failed to load services for filter:", err);
            }
        }
        fetchServices();
    }, []);

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getBploTransactions(status);
            if (res.success) {
                setTransactions(res.data || []);
            } else {
                console.error("[BploDashboard] getBploTransactions failed:", res.error);
                setTransactions([]);
                toast.error(res.error || "Failed to load transactions.");
            }
            await getPendingBploCount();
        } catch (err) {
            console.error("[BploDashboard] Unexpected error:", err);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }, [status]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        if (!supabase) return;

        let channel: any;
        try {
            channel = supabase
                .channel("bplo-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction",
                    },
                    (payload: any) => {
                        // Re-fetch transactions to reflect the realtime update instantly!
                        fetchTransactions();

                        // If it's a new insert (new request), show a temporary 3-second slide-in alert
                        if (payload.eventType === "INSERT") {
                            const newRow = payload.new;
                            if (newRow) {
                                const isBplo = !!newRow.businessName || !!newRow.businessPermitId || (newRow.additionalData && (newRow.additionalData as any).businessName);
                                if (isBplo) {
                                    const refId = String(newRow.id).slice(-8).toUpperCase();
                                    const bizName = newRow.businessName || (newRow.additionalData && (newRow.additionalData as any).businessName) || "New Permit Request";
                                    const applicant = newRow.residentSnapshot 
                                        ? `${(newRow.residentSnapshot as any).firstName} ${(newRow.residentSnapshot as any).lastName}`
                                        : "Resident Applicant";

                                    setNewRequestAlert({
                                        id: refId,
                                        businessName: bizName,
                                        applicantName: applicant
                                    });
                                    setShowAlert(true);

                                    if (alertTimerRef.current) {
                                        clearTimeout(alertTimerRef.current);
                                    }
                                    alertTimerRef.current = setTimeout(() => {
                                        setShowAlert(false);
                                    }, 3000);
                                }
                            }
                        }

                        // Also detect transitions into FOR_INSPECTION or FOR_REINSPECTION for the toast alert
                        if (payload.eventType === "UPDATE") {
                            const newRow = payload.new;
                            if (newRow && (newRow.status === "FOR_INSPECTION" || newRow.status === "FOR_REINSPECTION")) {
                                const isBplo = !!newRow.businessName || !!newRow.businessPermitId || (newRow.additionalData && (newRow.additionalData as any).businessName);
                                if (isBplo) {
                                    const refId = String(newRow.id).slice(-8).toUpperCase();
                                    const bizName = newRow.businessName || (newRow.additionalData && (newRow.additionalData as any).businessName) || "New Commercial Application";
                                    const statusText = newRow.status === "FOR_INSPECTION" ? "Inspection" : "Re-inspection";

                                    toast.info(`Application ${refId} (${bizName}) is now pending ${statusText.toLowerCase()}.`, {
                                        duration: 10000,
                                        // description: "The dashboard list has been updated in real-time.",
                                        action: {
                                            label: "Evaluate",
                                            onClick: () => {
                                                router.push(`/admin/bplo/${newRow.id}`);
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                )
                .subscribe((status: string, err?: any) => {
                    if (err) {
                        console.warn("Supabase Realtime subscription error:", err);
                    }
                    if (status === "CHANNEL_ERROR") {
                        console.warn("Supabase Realtime channel error status caught");
                    }
                });
        } catch (error) {
            console.warn("Failed to initialize Supabase Realtime subscription:", error);
        }

        return () => {
            if (channel) {
                supabase.removeChannel(channel);
            }
            if (alertTimerRef.current) {
                clearTimeout(alertTimerRef.current);
            }
        };
    }, [fetchTransactions, router]);

    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, status, itemsPerPage]);

    const filteredTransactions = transactions.filter(tx => {
        const name = `${tx.residentSnapshot?.firstName} ${tx.residentSnapshot?.lastName}`.toLowerCase();
        const refId = tx.id.slice(-8).toUpperCase();
        const searchUpper = search.toUpperCase();

        const matchesSearch = name.includes(search.toLowerCase()) ||
            tx.id.toLowerCase().includes(search.toLowerCase()) ||
            refId.includes(searchUpper);

        const matchesService = !serviceFilter || tx.type?.name === serviceFilter;

        return matchesSearch && matchesService;
    });

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        if (sortBy === "service") {
            const serviceA = (a.type?.name || "").toLowerCase();
            const serviceB = (b.type?.name || "").toLowerCase();
            return sortDirection === "asc"
                ? serviceA.localeCompare(serviceB)
                : serviceB.localeCompare(serviceA);
        } else {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
        }
    });

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = sortedTransactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleDateHeaderClick = () => {
        setServiceFilter(null);
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
            <div 
                style={{ boxShadow: '0 25px 50px -12px color-mix(in srgb, var(--primary-theme) 10%, transparent)' }}
                className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm overflow-hidden"
            >
                <Tabs value={status} onValueChange={setStatus} className="w-full">
                    <div className="flex flex-col border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
                        <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                                <div className="relative w-full sm:w-[350px]">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <Input
                                        placeholder="Search permits by name or Ref ID..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-primary rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block">
                                    <Select 
                                        value={serviceFilter ?? "ALL"} 
                                        onValueChange={(v) => { setServiceFilter(v === "ALL" ? null : v); }}
                                        onOpenChange={(open) => { if (!open) setServiceSearch(""); }}
                                    >
                                        <SelectTrigger className="h-11 w-48 rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]">
                                            <SelectValue placeholder="Permit Class" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" className="bg-white dark:bg-[#151b2b] min-w-[220px] max-h-80 overflow-y-auto">
                                            <div className="p-2 border-b border-slate-100 dark:border-[#2a3040] sticky top-0 bg-white dark:bg-[#151b2b] z-10">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                                    <Input
                                                        ref={serviceSearchInputRef}
                                                        placeholder="Search permit class..."
                                                        value={serviceSearch}
                                                        onChange={(e) => setServiceSearch(e.target.value)}
                                                        className="pl-8 h-8 text-xs bg-slate-50 dark:bg-[#0f1117] border-slate-100 dark:border-[#2a3040] focus-visible:ring-primary rounded-lg w-full"
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            <SelectItem value="ALL" className="text-sm">All Permits</SelectItem>
                                            {filteredServices.map(srv => (
                                                <SelectItem key={srv} value={srv} className="text-sm">{srv}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="hidden sm:block">
                                    <Select 
                                        value={status} 
                                        onValueChange={(v) => setStatus(v)}
                                        onOpenChange={(open) => { if (!open) setStatusSearch(""); }}
                                    >
                                        <SelectTrigger className="h-11 w-48 rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]">
                                            <SelectValue placeholder="Permit Status" />
                                        </SelectTrigger>
                                        <SelectContent position="popper" className="bg-white dark:bg-[#151b2b] min-w-[220px] max-h-80 overflow-y-auto">
                                            <div className="p-2 border-b border-slate-100 dark:border-[#2a3040] sticky top-0 bg-white dark:bg-[#151b2b] z-10">
                                                <div className="relative">
                                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                                    <Input
                                                        ref={statusSearchInputRef}
                                                        placeholder="Search status..."
                                                        value={statusSearch}
                                                        onChange={(e) => setStatusSearch(e.target.value)}
                                                        className="pl-8 h-8 text-xs bg-slate-50 dark:bg-[#0f1117] border-slate-100 dark:border-[#2a3040] focus-visible:ring-primary rounded-lg w-full"
                                                        onKeyDown={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            </div>
                                            {filteredStatusTabs.map(tab => (
                                                <SelectItem key={tab.value} value={tab.value} className="text-sm">
                                                    {tab.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button
                                    onClick={fetchTransactions}
                                    variant="outline"
                                    className="h-11 w-11 rounded-xl p-0 border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]"
                                >
                                    <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <TabsContent value={status} className="mt-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-[#1a1f2e] dark:border-[#2a3040]">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">#</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Applicant Business</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5">
                                            <span>Permit Service</span>
                                        </TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Fulfillment</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Permit Status</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Processed By</TableHead>
                                        <TableHead
                                            className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors py-5"
                                            onClick={handleDateHeaderClick}
                                        >
                                            <div className="flex items-center gap-1.5 group">
                                                <span>Last Action Date</span>
                                                <span className={cn(
                                                    "transition-colors duration-200 font-black text-[10px]",
                                                    sortBy === "date" ? "text-primary font-bold" : "text-slate-300"
                                                )}>
                                                    {sortBy === "date" ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
                                                </span>
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i} className="animate-pulse">
                                                <TableCell colSpan={7} className="h-20 text-center">
                                                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded mx-8" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : paginatedTransactions.length > 0 ? (
                                        paginatedTransactions.map((tx, index) => (
                                            <TableRow
                                                key={tx.id}
                                                onClick={() => router.push(`/admin/bplo/${tx.id}`)}
                                                className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer select-none"
                                            >
                                                <TableCell className="py-4">
                                                    <span className="text-xs font-black font-mono tracking-widest text-primary">
                                                        {(currentPage - 1) * itemsPerPage + index + 1}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                            {tx.businessPermit?.businessName || tx.residentSnapshot ? `${tx.residentSnapshot?.firstName} ${tx.residentSnapshot?.lastName}` : "UNKNOWN"}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-bold uppercase text-primary">
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
                                                            "DRAFT": "text-slate-400",
                                                            "FOR_REQUESTING": "text-yellow-600",
                                                            "FOR_REVISION": "text-purple-600",
                                                            "FOR_INSPECTION": "text-blue-600",
                                                            "FOR_REINSPECTION": "text-orange-500",
                                                            "FOR_PROCESSING": "text-sky-600",
                                                            "EVALUATED": "text-emerald-600",
                                                            "UNPAID": "text-amber-600",
                                                            "PAID": "text-emerald-500",
                                                            "FOR_CLAIM": "text-indigo-600",
                                                            "FOR_PICKING": "text-pink-600",
                                                            "IN_ROUTE": "text-cyan-600",
                                                            "RELEASED": "text-slate-600",
                                                            "DELIVERED": "text-teal-600",
                                                            "REJECTED": "text-red-600",
                                                            "RETURN_REQUESTED": "text-orange-500",
                                                            "REFUND_REQUESTED": "text-orange-500",
                                                            "RETURNED": "text-slate-500",
                                                            "REFUNDED": "text-slate-500",
                                                            "DISPUTE_REJECTED": "text-red-700",
                                                        } as Record<string, string>)[tx.status] || "text-slate-500"
                                                    )}>
                                                        {tx.isCancelled 
                                                            ? "CANCELLED" 
                                                            : ({
                                                                "FOR_REQUESTING": "FOR EVALUATION",
                                                                "FOR_PROCESSING": "FOR PROCESSING",
                                                                "FOR_REINSPECTION": "FOR PROCESSING",
                                                                "RETURN_REQUESTED": "REQUEST FOR RETURN",
                                                                "REFUND_REQUESTED": "REQUEST FOR REFUND",
                                                            } as Record<string, string>)[tx.status] || tx.status?.replace(/_/g, " ")}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                        {tx.processorName || "Not Processed"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        {(() => {
                                                            const f = formatDateTime(tx.updatedAt);
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
                                                    <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No permit applications found</p>
                                                    <p className="mt-2">Try adjusting your status tabs or query filters.</p>
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

            {/* Slide-in Real-time New Request Alert Card (3 seconds duration) */}
            <AnimatePresence>
                {showAlert && newRequestAlert && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, scale: 0.9, x: 50 }}
                        animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } }}
                        className="fixed top-6 right-6 z-50 max-w-sm w-full bg-white dark:bg-[#151b2c] border-2 border-primary/20 dark:border-primary/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 overflow-hidden backdrop-blur-md"
                        style={{
                            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(var(--primary-theme), 0.1)'
                        }}
                    >
                        {/* Glow indicator */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-yellow-500 via-primary to-emerald-500 animate-gradient-xy" />
                        
                        <div className="flex items-start gap-3 mt-1">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                                        New Application
                                    </span>
                                    <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500">
                                        #{newRequestAlert.id}
                                    </span>
                                </div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 truncate mt-0.5 uppercase italic">
                                    {newRequestAlert.businessName}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate font-semibold">
                                    By: {newRequestAlert.applicantName}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2a3040]/60">
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 text-xs font-bold text-slate-500 hover:text-slate-900" 
                                onClick={() => setShowAlert(false)}
                            >
                                Dismiss
                            </Button>
                            <Button 
                                size="sm" 
                                className="h-8 text-xs font-black bg-primary text-white hover:bg-primary/90 rounded-lg px-4" 
                                onClick={() => {
                                    setShowAlert(false);
                                    router.push(`/admin/bplo?status=FOR_REQUESTING`);
                                }}
                            >
                                View Queue
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
