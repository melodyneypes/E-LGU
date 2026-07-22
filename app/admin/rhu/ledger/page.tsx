"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { getRHUAdminTransactions } from "../actions";
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
    Archive, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// Helper: format date & time
function formatDateTime(date: string | Date): { date: string; time: string } {
    const d = new Date(date);
    return {
        date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
        time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
    };
}

// Helper: Safely parse residentSnapshot
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

function getAdditionalData(tx: any): any {
    if (!tx.additionalData) return {};
    if (typeof tx.additionalData === 'string') {
        try {
            return JSON.parse(tx.additionalData);
        } catch {
            return {};
        }
    }
    return tx.additionalData;
}

const CHECKUP_TYPES = [
    { id: "ALL", label: "All Checkups" },
    { id: "General Consultation", label: "General Consultation" },
    { id: "Pre-Marital", label: "Pre-Marital" },
    { id: "Prenatal / Maternal", label: "Prenatal / Maternal" },
    { id: "Pediatric", label: "Pediatric" },
    { id: "Dental", label: "Dental" },
    { id: "OTHER", label: "Other" },
];

export default function RHULedgerPage() {
    const router = useRouter();

    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [checkupFilter, setCheckupFilter] = useState("ALL");
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortBy, setSortBy] = useState<"date" | "patient" | "type" | "status">("date");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(handler);
    }, [search]);

    // Fetch all RHU consultation transactions
    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getRHUAdminTransactions({
                status: "ALL",
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                checkupType: checkupFilter === "ALL" ? undefined : checkupFilter
            });

            if (res.success && res.data) {
                setTransactions(res.data);
                if (res.pagination) {
                    setTotalCount(res.pagination.total || 0);
                }
            } else {
                toast.error(res.error || "Failed to load RHU ledger transactions.");
            }
        } catch (err) {
            console.error("Failed to load RHU ledger transactions:", err);
            toast.error("Failed to load transactions.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, debouncedSearch, checkupFilter]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    useEffect(() => {
        if (currentPage !== 1) {
            setCurrentPage(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, checkupFilter, itemsPerPage]);

    // Sorting logic
    const sortedTransactions = useMemo(() => {
        return [...transactions].sort((a, b) => {
            if (sortBy === "patient") {
                const residentA = getResidentSnapshot(a);
                const residentB = getResidentSnapshot(b);
                const nameA = (residentA.firstName || a.user?.name || "").toLowerCase();
                const nameB = (residentB.firstName || b.user?.name || "").toLowerCase();
                return sortDirection === "asc"
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            } else if (sortBy === "type") {
                const addDataA = getAdditionalData(a);
                const addDataB = getAdditionalData(b);
                const typeA = (addDataA.checkupType || a.type?.name || "").toLowerCase();
                const typeB = (addDataB.checkupType || b.type?.name || "").toLowerCase();
                return sortDirection === "asc"
                    ? typeA.localeCompare(typeB)
                    : typeB.localeCompare(typeA);
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
    }, [transactions, sortBy, sortDirection]);

    const totalPages = Math.ceil(totalCount / itemsPerPage);

    const handleSortToggle = (field: "date" | "patient" | "type" | "status") => {
        if (sortBy === field) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortBy(field);
            setSortDirection(field === "date" ? "desc" : "asc");
        }
    };

    const getStatusBadge = (tx: any) => {
        if (tx.isCancelled) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-800">
                    <XCircle className="w-3 h-3" /> Cancelled
                </span>
            );
        }

        switch (tx.status) {
            case "COMPLETED":
            case "RELEASED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                );
            case "EVALUATED":
            case "APPROVED":
            case "FOR_PROCESSING":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3" /> Pending Review
                    </span>
                );
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full max-w-full">
            {/* Header section with layout overview */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-8 bg-rose-500 rounded-full" />
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                            RHU Consultation <span className="text-rose-500">Ledger</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-xs md:text-sm">
                        View, search, and manage all Rural Health Unit patient consultation records.
                    </p>
                </div>
            </div>

            {/* Consolidated Dynamic List Queue */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-2xl shadow-rose-500/5 overflow-hidden ring-1 ring-slate-200 dark:ring-white/5 animate-in fade-in duration-500">
                {/* Filters Row */}
                <div className="flex flex-col border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b]">
                    <div className="p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                            <div className="relative w-full sm:w-[350px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <Input
                                    placeholder="Search patient name, control #, barangay..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-rose-500 rounded-xl text-xs font-bold"
                                />
                            </div>

                            <Select value={checkupFilter} onValueChange={(v) => setCheckupFilter(v)}>
                                <SelectTrigger className="h-11 w-full sm:w-52 rounded-xl bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-xs font-bold">
                                    <SelectValue placeholder="Checkup Category" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {CHECKUP_TYPES.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="text-xs font-bold uppercase">
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Ref / Control #</TableHead>
                                <TableHead
                                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-rose-500 transition-colors py-5"
                                    onClick={() => handleSortToggle("patient")}
                                >
                                    <div className="flex items-center gap-1.5 group">
                                        <span>Patient / Applicant</span>
                                        <span className={cn(
                                            "transition-colors duration-200 font-black text-[10px]",
                                            sortBy === "patient"
                                                ? "text-rose-500 font-bold"
                                                : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                                        )}>
                                            {sortBy === "patient" ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
                                        </span>
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-rose-500 transition-colors py-5"
                                    onClick={() => handleSortToggle("type")}
                                >
                                    <div className="flex items-center gap-1.5 group">
                                        <span>Check-up Type</span>
                                        <span className={cn(
                                            "transition-colors duration-200 font-black text-[10px]",
                                            sortBy === "type"
                                                ? "text-rose-500 font-bold"
                                                : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                                        )}>
                                            {sortBy === "type" ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
                                        </span>
                                    </div>
                                </TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Appt Date & Slot</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Priority</TableHead>
                                <TableHead
                                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-rose-500 transition-colors py-5"
                                    onClick={() => handleSortToggle("status")}
                                >
                                    <div className="flex items-center gap-1.5 group">
                                        <span>Status</span>
                                        <span className={cn(
                                            "transition-colors duration-200 font-black text-[10px]",
                                            sortBy === "status"
                                                ? "text-rose-500 font-bold"
                                                : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                                        )}>
                                            {sortBy === "status" ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
                                        </span>
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none hover:text-rose-500 transition-colors py-5"
                                    onClick={() => handleSortToggle("date")}
                                >
                                    <div className="flex items-center gap-1.5 group">
                                        <span>Last Updated</span>
                                        <span className={cn(
                                            "transition-colors duration-200 font-black text-[10px]",
                                            sortBy === "date"
                                                ? "text-rose-500 font-bold"
                                                : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
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
                                        <TableCell className="py-4"><div className="h-4 w-6 bg-slate-200 dark:bg-white/10 rounded-lg" /></TableCell>
                                        <TableCell className="py-4"><div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded-lg" /></TableCell>
                                        <TableCell className="py-4">
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                                <div className="h-3 w-24 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4"><div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-lg" /></TableCell>
                                        <TableCell className="py-4">
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                                <div className="h-3 w-16 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4"><div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded-lg" /></TableCell>
                                        <TableCell className="py-4"><div className="h-6 w-24 bg-slate-200 dark:bg-white/10 rounded-full" /></TableCell>
                                        <TableCell className="py-4"><div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded-lg" /></TableCell>
                                    </TableRow>
                                ))
                            ) : sortedTransactions.length > 0 ? (
                                sortedTransactions.map((tx, index) => {
                                    const resident = getResidentSnapshot(tx);
                                    const addData = getAdditionalData(tx);

                                    const patientName = resident.firstName
                                        ? `${resident.firstName} ${resident.lastName}`
                                        : tx.user?.name || "N/A";
                                    const isPriority = addData.isPriorityLane;
                                    const checkupDisplay = addData.checkupType === "OTHER"
                                        ? addData.customCheckupType || "Custom Check-up"
                                        : addData.checkupType || tx.type?.name || "Consultation";

                                    return (
                                        <TableRow
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/rhu/${tx.id}`)}
                                            className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer select-none animate-in fade-in duration-300"
                                        >
                                            <TableCell className="py-4">
                                                <span className="text-xs font-black font-mono tracking-widest text-rose-500">
                                                    {(currentPage - 1) * itemsPerPage + index + 1}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {tx.controlNumber || tx.id.slice(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                        {patientName}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold italic">
                                                        {addData.relationship ? `For: ${addData.relationship}` : "Self"} • Brgy. {resident.barangay || "Mapandan"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200">
                                                    {checkupDisplay}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {formatDateTime(tx.appointmentDate).date}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-rose-500 italic">
                                                        {tx.appointmentSlot || "Anytime"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isPriority ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800">
                                                        Priority
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">Regular</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(tx)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    {(() => {
                                                        const f = formatDateTime(tx.updatedAt);
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
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-[350px] text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                            <Archive className="w-16 h-16 mb-4 text-slate-300 dark:text-slate-600" />
                                            <p className="text-xl font-bold text-slate-700 dark:text-slate-300">No RHU consultations found</p>
                                            <p className="mt-2 text-xs">Try adjusting your search terms or category filter.</p>
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
            </div>
        </div>
    );
}
