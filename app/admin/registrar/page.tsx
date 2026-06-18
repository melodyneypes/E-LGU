"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

import {
    getTreasuryTransactions
} from "@/app/admin/transactions/cedula-actions";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Search, RefreshCcw,
    Archive, Clock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";

import RegistrarDashboard from "./[id]/dashboard";

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

// Helper: check if transaction is registrar civil registry request
function isRegistrarLcrRequest(tx: any) {
    const typeCode = tx.type?.code;
    const typeCategory = tx.type?.category;

    return (
        typeCategory === "Civil Registry" ||
        (typeCode && (typeCode.startsWith("LCR_") || typeCode.startsWith("CIVIL_REGISTRY")))
    );
}

// Status coloring helper mapping
const getStatusClassName = (status: string, isCancelled?: boolean) => {
    if (isCancelled) return "text-red-600";
    const statusMap: Record<string, string> = {
        "FOR_REQUESTING": "text-amber-600",
        "FOR_INSPECTION": "text-blue-600",
        "FOR_REVISION": "text-amber-600",
        "EVALUATED": "text-blue-600",
        "FOR_CLAIM": "text-indigo-600",
        "FOR_PICKING": "text-pink-600",
        "IN_ROUTE": "text-orange-600",
        "DELIVERED": "text-teal-600",
        "FOR_PROCESSING": "text-sky-600",
        "PAID": "text-emerald-600",
        "RELEASED": "text-slate-600",
        "REJECTED": "text-red-600",
        "RETURN_REQUESTED": "text-orange-500",
        "REFUND_REQUESTED": "text-orange-500",
        "RETURNED": "text-slate-500",
        "REFUNDED": "text-slate-500",
        "DISPUTE_REJECTED": "text-red-700",
    };
    return statusMap[status] || "text-slate-500";
};

export default function RegistrarPage() {
    const router = useRouter();

    // --- Unified Transactions States ---
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState<"date" | "service" | "status">("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get("category");
    const hasSelectedCategory = Boolean(categoryParam && categoryParam !== "ALL");

    // Fetch all requests for Civil Registry
    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getTreasuryTransactions("ALL");
            if (res.success && res.data) {
                const lcrTxs = res.data.filter(isRegistrarLcrRequest);
                setTransactions(lcrTxs);
            } else {
                toast.error(res.error || "Failed to load transactions");
            }
        } catch (err) {
            console.error("Failed to load registrar transactions:", err);
            toast.error("Failed to load transactions");
        } finally {
            setLoading(false);
        }
    }, []);

    // Load all transactions on mount
    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    // Reset page numbers when search / layout changes
    useEffect(() => {
        setCurrentPage(1);
    }, [search, itemsPerPage]);

    // --- List Filtering and Sorting ---
    const filteredTransactions = useMemo(() => {
        if (!hasSelectedCategory) return [];

        return transactions.filter(tx => {
            const rs = getResidentSnapshot(tx);
            const name = `${rs.firstName || ''} ${rs.lastName || ''}`.trim().toLowerCase();
            const refId = tx.id.slice(-8).toUpperCase();
            const searchUpper = search.toUpperCase();

            const matchesSearch = name.includes(search.toLowerCase()) ||
                tx.id.toLowerCase().includes(search.toLowerCase()) ||
                refId.includes(searchUpper);

            let matchesCategory = false;
            if (categoryParam === "Birth Registration") {
                matchesCategory = tx.type?.code === "LCR_BIRTH_REG";
            } else if (categoryParam === "Birth Certificate") {
                matchesCategory = tx.type?.code === "LCR_BIRTH";
            } else if (categoryParam === "Death Registration") {
                matchesCategory = tx.type?.code === "LCR_DEATH_REG" && tx.status !== "FOR_REQUESTING";
            } else if (categoryParam === "Death Certificate") {
                matchesCategory = tx.type?.code === "LCR_DEATH";
            } else if (categoryParam === "Marriage License") {
                matchesCategory = tx.type?.code === "LCR_MARRIAGE_LICENSE" && tx.status !== "FOR_REQUESTING";
            } else if (categoryParam === "Marriage Registration") {
                matchesCategory = tx.type?.code === "LCR_MARRIAGE_REG";
            } else if (categoryParam === "Marriage Certificate") {
                matchesCategory = tx.type?.code === "LCR_MARRIAGE";
            } else if (categoryParam === "PSA Endorsement") {
                matchesCategory = (
                    tx.type?.code === "LCR_PSA_ENDORSEMENT" ||
                    (tx.type?.code === "LCR_DEATH_PSA_ENDORSEMENT" && tx.status !== "FOR_REQUESTING") ||
                    tx.type?.code === "LCR_MARRIAGE_PSA_ENDORSEMENT"
                ) && tx.status !== "RELEASED" && tx.status !== "DELIVERED";
            }

            return matchesSearch && matchesCategory;
        });
    }, [transactions, search, categoryParam, hasSelectedCategory]);

    const sortedTransactions = useMemo(() => {
        return [...filteredTransactions].sort((a, b) => {
            if (sortBy === "service") {
                const serviceA = (a.type?.name || "").toLowerCase();
                const serviceB = (b.type?.name || "").toLowerCase();
                return sortDirection === "asc"
                    ? serviceA.localeCompare(serviceB)
                    : serviceB.localeCompare(serviceA);
            } else if (sortBy === "status") {
                const statusA = (a.status || "").toLowerCase();
                const statusB = (b.status || "").toLowerCase();
                return sortDirection === "asc"
                    ? statusA.localeCompare(statusB)
                    : statusB.localeCompare(statusA);
            } else {
                const dateA = new Date(a.updatedAt).getTime();
                const dateB = new Date(b.updatedAt).getTime();
                return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
            }
        });
    }, [filteredTransactions, sortBy, sortDirection]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
    const paginatedTransactions = useMemo(() => {
        return sortedTransactions.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
        );
    }, [sortedTransactions, currentPage, itemsPerPage]);

    // Header sort toggle handlers
    const handleDateHeaderClick = () => {
        if (sortBy === "date") {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy("date");
            setSortDirection("desc");
        }
    };

    const handleServiceHeaderClick = () => {
        if (sortBy === "service") {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy("service");
            setSortDirection("asc");
        }
    };

    const handleStatusHeaderClick = () => {
        if (sortBy === "status") {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy("status");
            setSortDirection("asc");
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header section with layout overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-8 bg-primary rounded-full" />
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            {hasSelectedCategory ? categoryParam : "Registrar Hub"}
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Manage validation evaluations, billing verification, and release document workflows in a single queue.
                    </p>
                </div>
            </div>

            {!hasSelectedCategory ? (
                <RegistrarDashboard />
            ) : (
            /* Consolidated Dynamic List Queue */
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-blue-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5 animate-in fade-in duration-500">
                {/* Filters Row */}
                <div className="flex flex-col border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
                    <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                            <div className="relative w-full sm:w-[350px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    placeholder="Search names or Reference ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-blue-500 rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                            <Button
                                onClick={fetchTransactions}
                                variant="outline"
                                className="h-11 w-11 rounded-xl p-0 border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]"
                                title="Refresh List"
                            >
                                <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Unified Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 border-b border-slate-200 dark:bg-[#1a1f2e] dark:border-[#2a3040]">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300 py-5 w-[60px]">#</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Applicant</TableHead>
                                <TableHead
                                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors py-5"
                                    onClick={handleServiceHeaderClick}
                                >
                                    <div className="flex items-center gap-1.5 group">
                                        <span>Service Requested</span>
                                        <span className={cn(
                                            "transition-colors duration-200 font-black text-[10px]",
                                            sortBy === "service"
                                                ? "text-blue-600 dark:text-blue-400 font-bold"
                                                : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                                        )}>
                                            {sortBy === "service"
                                                ? (sortDirection === "asc" ? "▲" : "▼")
                                                : "⇅"
                                            }
                                        </span>
                                    </div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Method</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Amount</TableHead>
                                <TableHead
                                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors py-5"
                                    onClick={handleStatusHeaderClick}
                                >
                                    <div className="flex items-center gap-1.5 group">
                                        <span>Status</span>
                                        <span className={cn(
                                            "transition-colors duration-200 font-black text-[10px]",
                                            sortBy === "status"
                                                ? "text-blue-600 dark:text-blue-400 font-bold"
                                                : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                                        )}>
                                            {sortBy === "status"
                                                ? (sortDirection === "asc" ? "▲" : "▼")
                                                : "⇅"
                                            }
                                        </span>
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-primary transition-colors py-5"
                                    onClick={handleDateHeaderClick}
                                >
                                    <div className="flex items-center gap-1.5 group">
                                        <span>Last Updated</span>
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
                                        <TableCell colSpan={7} className="h-20 text-center">
                                            <div className="h-4 bg-slate-100 dark:bg-[#1a1f2e] rounded mx-8" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : paginatedTransactions.length > 0 ? (
                                paginatedTransactions.map((tx, index) => (
                                    <TableRow
                                        key={tx.id}
                                        onClick={() => router.push(`/admin/registrar/${tx.id}`)}
                                        className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer select-none animate-in fade-in duration-300"
                                    >
                                        <TableCell className="py-4">
                                            <span className="text-xs font-black font-mono tracking-widest text-primary">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                    {(() => {
                                                        const rs = getResidentSnapshot(tx);
                                                        return `${rs.firstName || 'Unknown'} ${rs.lastName || 'Applicant'}`;
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
                                                {tx.fulfillmentType && (
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase">
                                                        {tx.fulfillmentType.replace(/_/g, " ")}
                                                    </span>
                                                )}
                                                {tx.paymentType && (
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase leading-none">
                                                        {tx.paymentType?.replace(/_/g, " ")}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {tx.totalAmount > 0 ? `₱${tx.totalAmount.toLocaleString()}` : "–"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={cn(
                                                "text-[10px] font-black uppercase italic tracking-wider px-2 py-1 rounded bg-slate-50 dark:bg-black/30 border border-current w-fit block",
                                                getStatusClassName(tx.status, tx.isCancelled)
                                            )}>
                                                {tx.isCancelled ? "CANCELLED" : tx.status?.replace(/_/g, " ")}
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
                                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                <Clock className="w-2.5 h-2.5" />{f.time}
                                                            </span>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-[350px] text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                            <Archive className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                                            <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No requests found</p>
                                            <p className="mt-2">Try adjusting your filters or search term.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
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
            </div>
            )}
        </div>
    );
}


