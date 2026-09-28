"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Copy, Check, DollarSign, CalendarIcon, ChevronLeft, ChevronRight, FileText, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/utils";

interface PaymentRecord {
    id: string;
    transactionId: string;
    amount: number;
    method: "CASH" | "CASH_ON_DELIVERY" | "E_PAYMENT" | "BANK_TRANSFER";
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
    reference: string | null;
    orNumber: string | null;
    createdAt: string;
    updatedAt: string;
    transaction: {
        id: string;
        queueNumber?: string;
        residentSnapshot?: any;
        additionalData?: any;
        type: {
            name: string;
            code?: string;
            category?: string;
        };
        user: {
            name: string | null;
            email: string;
        } | null;
    };
}

interface PosoPaymentsClientProps {
    initialData: {
        payments: PaymentRecord[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
        stats: {
            totalPaid: number;
            paidCount: number;
        };
    };
    themeColor?: string;
    initialFrom?: string;
    initialTo?: string;
    initialMethod?: string;
    initialSearch?: string;
}

function getViolatorName(payment: PaymentRecord): string {
    const tx = payment.transaction;
    if (!tx) return "Unknown";

    // 1. Try additionalData.violatorName (set by processTicketSettlement)
    const additional = tx.additionalData || {};
    if (additional.violatorName) return additional.violatorName;

    // 2. Try residentSnapshot
    let snap: any = {};
    if (tx.residentSnapshot) {
        try {
            snap = typeof tx.residentSnapshot === "string" ? JSON.parse(tx.residentSnapshot) : tx.residentSnapshot;
        } catch {
            snap = {};
        }
    }
    if (snap.fullName) return snap.fullName;
    if (snap.firstName || snap.lastName) {
        return `${snap.firstName || ""} ${snap.lastName || ""}`.trim();
    }

    // 3. Try user name
    return tx.user?.name || "Unknown Violator";
}

function getTicketNo(payment: PaymentRecord): string {
    const additional = payment.transaction?.additionalData || {};
    return additional.ticketNo || payment.transaction?.queueNumber || "—";
}

function getTicketId(payment: PaymentRecord): string | null {
    const additional = payment.transaction?.additionalData || {};
    return additional.ticketHeaderId || additional.ticketId || null;
}

export default function PosoPaymentsClient({
    initialData,
    themeColor = "#2563eb",
    initialFrom,
    initialTo,
    initialMethod = "ALL",
    initialSearch = ""
}: PosoPaymentsClientProps) {
    const [payments, setPayments] = useState<PaymentRecord[]>(initialData.payments);
    const [totalCount, setTotalCount] = useState(initialData.totalCount);
    const [totalPages, setTotalPages] = useState(initialData.totalPages);
    const [currentPage, setCurrentPage] = useState(initialData.currentPage);
    const [stats, setStats] = useState(initialData.stats);
    const [limit, setLimit] = useState(10);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [isPending, startTransition] = useTransition();

    const [searchVal, setSearchVal] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [methodFilter, setMethodFilter] = useState<string>(initialMethod);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchVal);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchVal]);

    const [fromDate, setFromDate] = useState(() => {
        if (initialFrom) return initialFrom;
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split("T")[0];
    });
    const [toDate, setToDate] = useState(() => {
        if (initialTo) return initialTo;
        return new Date().toISOString().split("T")[0];
    });

    const [copiedId, setCopiedId] = useState<string | null>(null);
    const router = useRouter();

    const fetchPaymentsData = useCallback((pageNumber = 1, currentLimit = limit) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        startTransition(async () => {
            try {
                const queryParams = new URLSearchParams({
                    search,
                    method: methodFilter,
                    from: fromDate,
                    to: toDate,
                    page: String(pageNumber),
                    limit: String(currentLimit)
                });

                const res = await fetch(`/api/admin/poso/payments?${queryParams.toString()}`, {
                    signal: controller.signal
                });

                if (!res.ok) {
                    let errMsg = "Failed to retrieve payments data.";
                    try {
                        const errData = await res.json();
                        errMsg = errData.error || errMsg;
                    } catch {
                        // Response body was not valid JSON (e.g. 500 HTML error)
                    }
                    throw new Error(errMsg);
                }

                const data = await res.json();

                if (data.success && data.data) {
                    setPayments(data.data as PaymentRecord[]);
                    setTotalCount(data.totalCount ?? 0);
                    setTotalPages(data.totalPages ?? 1);
                    setCurrentPage(pageNumber);
                    if (data.stats) {
                        setStats(data.stats);
                    }
                }
            } catch (error: any) {
                const isAbort = error.name === "AbortError" ||
                    error.message?.includes("aborted") ||
                    error.message?.includes("abort");
                if (!isAbort) {
                    toast.error(error.message || "Failed to retrieve payments data.");
                }
            }
        });
    }, [limit, search, methodFilter, fromDate, toDate]);

    // Setup Realtime SSE EventStream Listener
    useEffect(() => {
        let eventSource: EventSource | null = null;
        try {
            eventSource = new EventSource("/api/admin/poso/payment-ledger/stream");

            eventSource.onmessage = (event) => {
                if (event.data === "refresh") {
                    fetchPaymentsData(currentPage, limit);
                }
            };

            eventSource.onerror = () => {
                if (eventSource?.readyState === EventSource.CLOSED) {
                    eventSource.close();
                }
            };
        } catch {
            // EventSource fallback handle
        }

        return () => {
            if (eventSource) {
                eventSource.close();
            }
        };
    }, [currentPage, limit, fetchPaymentsData]);



    const handleRefresh = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        let changed = false;
        if (fromDate !== defaultFrom) { setFromDate(defaultFrom); changed = true; }
        if (toDate !== defaultTo) { setToDate(defaultTo); changed = true; }
        if (methodFilter !== "ALL") { setMethodFilter("ALL"); changed = true; }
        if (searchVal !== "") { setSearchVal(""); changed = true; }
        if (search !== "") { setSearch(""); changed = true; }

        if (!changed) {
            fetchPaymentsData(currentPage, limit);
        }
        toast.success("Filters reset and data refreshed!");
    };

    const isFirstMount = useRef(true);

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        fetchPaymentsData(1, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, methodFilter, fromDate, toDate, limit]);

    const isFilterChanged = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        return (
            fromDate !== defaultFrom ||
            toDate !== defaultTo ||
            methodFilter !== "ALL" ||
            searchVal !== ""
        );
    }, [fromDate, toDate, methodFilter, searchVal]);

    const handleCopy = async (text: string, id: string) => {
        const success = await copyToClipboard(text);
        if (success) {
            setCopiedId(id);
            toast.success("Reference number copied!");
            setTimeout(() => setCopiedId(null), 2000);
        } else {
            toast.error("Failed to copy reference number.");
        }
    };

    const formatDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
            time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
        };
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-[#2a3040]/30 pb-6">
                <div className="space-y-2">
                    <button
                        onClick={() => router.push("/admin/poso/tickets")}
                        className="flex items-center gap-2 text-xs font-black uppercase italic tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                    >
                        ← Back to Tickets
                    </button>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        POSO <span style={{ color: themeColor }}>Payment Ledger</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                        Track and manage all POSO traffic violation fine payments and citation settlements.
                    </p>
                </div>
            </div>

            {/* Quick KPI Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {/* Total Paid Collections */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Total Collections</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">
                            ₱{stats.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </h3>
                    </div>
                </div>

                {/* Paid Count */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <ShieldAlert className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Paid Fines</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.paidCount.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Total Records */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Total Records</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{totalCount.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Filters Dashboard Card */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2rem] p-6 shadow-md">
                <div className="flex flex-wrap items-center gap-4 w-full">
                    {/* Date From */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl w-full sm:w-[170px] shrink-0">
                        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer [color-scheme:light|dark] w-full"
                        />
                    </div>

                    <span className="text-slate-400 text-xs font-bold shrink-0">to</span>

                    {/* Date To */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl w-full sm:w-[170px] shrink-0">
                        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer [color-scheme:light|dark] w-full"
                        />
                    </div>

                    {/* Payment Mode Selector */}
                    <div className="relative w-full sm:w-[170px] shrink-0">
                        <select
                            value={methodFilter}
                            onChange={(e) => setMethodFilter(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                        >
                            <option value="ALL">All Methods</option>
                            <option value="CASH">Cash</option>
                            <option value="E_PAYMENT">E-Payment</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="CASH_ON_DELIVERY">COD</option>
                        </select>
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <span className="text-slate-400 text-xs font-bold font-mono">₱</span>
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-[260px] sm:ml-auto shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search violator, ticket, ref..."
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] rounded-xl outline-none text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-blue-500 transition-colors shadow-inner"
                        />
                    </div>

                    {/* Reset Filters */}
                    {isFilterChanged && (
                        <button
                            onClick={handleRefresh}
                            className="flex items-center justify-center p-2.5 bg-white dark:bg-[#1e2330] text-slate-500 hover:text-red-500 border border-slate-200 dark:border-[#2a3040] hover:border-red-500/30 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer animate-in zoom-in duration-200"
                            title="Reset Filters"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-[2rem] border border-slate-200 dark:border-[#2a3040] p-6 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                            <TableRow>
                                <TableHead className="font-bold py-4 pl-6 text-slate-700 dark:text-slate-300 w-12 text-center">#</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Violator Name</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Ticket No.</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Amount</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Method</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Reference</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Date Paid</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`} className="border-b border-slate-100 dark:border-[#2a3040]/50 animate-pulse">
                                        <TableCell className="py-4 pl-6 w-12"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></TableCell>
                                        <TableCell className="py-4"><div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                    </TableRow>
                                ))
                            ) : payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-12 text-center font-bold italic text-slate-400">
                                        No POSO payment records found matching the filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payments.map((payment, idx) => {
                                    const formattedDate = formatDateTime(payment.createdAt);
                                    const violatorName = getViolatorName(payment);
                                    const ticketNo = getTicketNo(payment);
                                    const ticketId = getTicketId(payment);
                                    const refDisplay = payment.reference || "N/A";
                                    const rowNumber = (currentPage - 1) * limit + idx + 1;

                                    return (
                                        <TableRow
                                            key={payment.id}
                                            onClick={() => {
                                                if (ticketId) router.push(`/admin/poso/tickets/${ticketId}`);
                                            }}
                                            className={`border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors ${ticketId ? "cursor-pointer select-none" : ""}`}
                                        >
                                            <TableCell className="py-4 pl-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400 w-12">
                                                {rowNumber}
                                            </TableCell>
                                            <TableCell className="py-4 font-bold text-slate-900 dark:text-white uppercase text-xs">
                                                {violatorName}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-bold" style={{ color: themeColor }}>
                                                {ticketNo}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 dark:text-white">
                                                ₱{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                                                {payment.method?.replace(/_/g, " ")}
                                            </TableCell>
                                            <TableCell>
                                                <span className={`text-[10px] font-black uppercase italic tracking-wider px-2.5 py-1 rounded-full ${
                                                    payment.status === "PAID"
                                                        ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-500/20"
                                                        : payment.status === "PENDING"
                                                        ? "text-amber-700 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-500/20"
                                                        : "text-red-700 bg-red-500/10 dark:text-red-400 dark:bg-red-500/20"
                                                }`}>
                                                    {payment.status}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                <div className="flex items-center gap-2">
                                                    <span>{refDisplay}</span>
                                                    {payment.reference && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleCopy(payment.reference!, payment.id);
                                                            }}
                                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                                            title="Copy reference number"
                                                        >
                                                            {copiedId === payment.id ? (
                                                                <Check className="w-3.5 h-3.5 text-emerald-500 animate-in zoom-in-50" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{formattedDate.date}</span>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formattedDate.time}</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Showing page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span> ({totalCount} total records)
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Limit Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold">Show:</span>
                            <div className="relative">
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        const nextLimit = Number(e.target.value);
                                        setLimit(nextLimit);
                                        fetchPaymentsData(1, nextLimit);
                                    }}
                                    className="pl-3 pr-8 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-lg outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center px-1 text-slate-500">
                                    <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchPaymentsData(currentPage - 1, limit)}
                                    disabled={currentPage === 1 || isPending}
                                    className="p-2 border border-slate-200 dark:border-[#2a3040] hover:bg-slate-50/50 dark:hover:bg-white/5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                </button>
                                <button
                                    onClick={() => fetchPaymentsData(currentPage + 1, limit)}
                                    disabled={currentPage === totalPages || isPending}
                                    className="p-2 border border-slate-200 dark:border-[#2a3040] hover:bg-slate-50/50 dark:hover:bg-white/5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
