"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import {
    Search, ChevronLeft, ChevronRight, RefreshCcw
} from "lucide-react";
import { toast } from "sonner";

interface Transaction {
    id: string;
    createdAt: string | Date;
    status: string;
    residentSnapshot?: any;
    type: {
        name: string;
        category: string;
    } | null;
    user: {
        name: string | null;
        residentProfile: {
            barangay: string;
        } | null;
    } | null;
    payment: {
        amount: number;
        status: string;
        method?: string | null;
    } | null;
}

interface MayorDailyRequestsReportClientProps {
    initialData: {
        transactions: any[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
        stats: {
            total: number;
            pending: number;
            released: number;
            rejected: number;
            revenue: number;
        };
    };
    categories: string[];
    themeColor?: string;
    initialFrom?: string;
    initialTo?: string;
    initialCategory?: string;
    initialStatus?: string;
    initialSearch?: string;
    initialBarangay?: string;
    barangays?: string[];
}

export function MayorDailyRequestsReportClient({
    initialData,
    categories,
    initialFrom,
    initialTo,
    initialCategory = "ALL",
    initialStatus = "ALL",
    initialSearch = "",
    initialBarangay = "ALL",
    themeColor = "#2563eb"
}: MayorDailyRequestsReportClientProps) {
    const [transactions, setTransactions] = useState<Transaction[]>(initialData.transactions);
    const [totalCount, setTotalCount] = useState(initialData.totalCount);
    const [totalPages, setTotalPages] = useState(initialData.totalPages);
    const [currentPage, setCurrentPage] = useState(initialData.currentPage);
    const [stats, setStats] = useState(initialData.stats);
    const [limit, setLimit] = useState(10);
    const abortControllerRef = useRef<AbortController | null>(null);

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
    const [category, setCategory] = useState(initialCategory);
    const [status, setStatus] = useState(initialStatus);
    const [search, setSearch] = useState(initialSearch);
    const [barangay, setBarangay] = useState(initialBarangay);

    const [isPending, startTransition] = useTransition();

    // Cancel active fetch requests when unmounting or starting a new query
    const fetchReportData = (pageNumber = 1, currentLimit = limit) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        startTransition(async () => {
            try {
                const queryParams = new URLSearchParams({
                    from: fromDate,
                    to: toDate,
                    category,
                    status,
                    search,
                    barangay,
                    page: String(pageNumber),
                    limit: String(currentLimit)
                });

                const res = await fetch(`/api/mayor/reports/daily-requests?${queryParams.toString()}`, {
                    signal: controller.signal
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to retrieve report data.");
                }

                const data = await res.json();

                if (data.success && data.transactions) {
                    setTransactions(data.transactions as Transaction[]);
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
                    toast.error(error.message || "Failed to retrieve report data.");
                }
            }
        });
    };

    // Refetch when filters change
    useEffect(() => {
        fetchReportData(1, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, category, status, barangay]);

    // Debounce search input to query server-side as the user types
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchReportData(1, limit);
        }, 400);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    // Track page and limit in a ref
    const stateRef = useRef({ currentPage, limit });
    useEffect(() => {
        stateRef.current = { currentPage, limit };
    }, [currentPage, limit]);

    // Real-time updates subscription using Server-Sent Events (SSE)
    useEffect(() => {
        const eventSource = new EventSource("/api/admin/reports/daily-requests/stream");

        eventSource.onmessage = (event) => {
            if (event.data === "refresh") {
                fetchReportData(stateRef.current.currentPage, stateRef.current.limit);
            }
        };

        eventSource.onerror = () => {
            console.warn("SSE stream connection lost or errored. Reconnecting...");
        };

        return () => {
            eventSource.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRefresh = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        let changed = false;
        if (fromDate !== defaultFrom) { setFromDate(defaultFrom); changed = true; }
        if (toDate !== defaultTo) { setToDate(defaultTo); changed = true; }
        if (category !== "ALL") { setCategory("ALL"); changed = true; }
        if (status !== "ALL") { setStatus("ALL"); changed = true; }
        if (barangay !== "ALL") { setBarangay("ALL"); changed = true; }
        if (search !== "") { setSearch(""); changed = true; }

        if (!changed) {
            fetchReportData(currentPage, limit);
        }
        toast.success("Filters reset and data refreshed!");
    };

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);
        fetchReportData(1, newLimit);
    };

    const getStatusStyles = (statusStr: string) => {
        switch (statusStr) {
            case "RELEASED":
                return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20";
            case "REJECTED":
                return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20";
            case "FOR_REQUESTING":
            case "FOR_INSPECTION":
            case "FOR_REVISION":
                return "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20";
            case "FOR_PROCESSING":
            case "FOR_PAYMENT":
            case "FOR_COMPLIANCE":
                return "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20";
            default:
                return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
        }
    };

    const getStatusLabel = (statusStr: string) => {
        return statusStr.replaceAll("_", " ");
    };

    // Helper: format full name to First Name + Last Initial (e.g. "Juan C.")
    const formatFormattedName = (fullName?: string | null, snapshot?: any) => {
        let name = fullName && fullName.trim() !== "" ? fullName : null;
        if (!name && snapshot) {
            if (typeof snapshot === "string") {
                try {
                    const parsed = JSON.parse(snapshot);
                    name = parsed.fullName || parsed.name || null;
                } catch {
                    name = null;
                }
            } else if (typeof snapshot === "object") {
                name = snapshot.fullName || snapshot.name || null;
            }
        }

        if (!name || name.trim() === "") return "A Resident";

        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0];
        const firstName = parts[0];
        const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
        return `${firstName} ${lastInitial}.`;
    };

    return (
        <div className="p-8 w-full space-y-8 animate-in fade-in duration-500 min-h-screen bg-slate-50 dark:bg-[#0c111d] text-slate-900 dark:text-white">
            {/* Header & Back Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#2a3040] max-w-7xl mx-auto">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Daily <span style={{ color: themeColor }}>Requests</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                        Mapandan Executive Oversight: Monitor municipal requests and breakdown logs.
                    </p>
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="p-3 bg-slate-200 dark:bg-[#1e2330] hover:bg-slate-300 dark:hover:bg-[#2a3040] text-slate-700 dark:text-slate-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        title="Reset Filters & Refresh"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-8">
                {/* Executive Analytics Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-5 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Filtered</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</p>
                    </div>
                    <div className="p-5 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pending Requests</p>
                        <p className="text-2xl font-black text-amber-500 mt-1">{stats.pending}</p>
                    </div>
                    <div className="p-5 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Released Docs</p>
                        <p className="text-2xl font-black text-emerald-500 mt-1">{stats.released}</p>
                    </div>
                    <div className="p-5 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-rose-500">Rejected</p>
                        <p className="text-2xl font-black text-rose-500 mt-1">{stats.rejected}</p>
                    </div>
                    <div className="p-5 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl shadow-sm col-span-2 md:col-span-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Paid Collections</p>
                        <p className="text-xl font-black text-blue-500 mt-1">
                            ₱{stats.revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>

                {/* Filter Control Bar */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {/* From Date */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">From Date</label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        {/* To Date */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">To Date</label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Category</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                            >
                                <option value="ALL">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="FOR_REQUESTING">FOR REQUESTING</option>
                                <option value="FOR_INSPECTION">FOR INSPECTION</option>
                                <option value="FOR_REVISION">FOR REVISION</option>
                                <option value="FOR_PROCESSING">FOR PROCESSING</option>
                                <option value="FOR_PAYMENT">FOR PAYMENT</option>
                                <option value="FOR_COMPLIANCE">FOR COMPLIANCE</option>
                                <option value="RELEASED">RELEASED</option>
                                <option value="REJECTED">REJECTED</option>
                            </select>
                        </div>

                        {/* Search Input */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Search Log</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search resident..."
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Transactions Data Table */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl overflow-hidden shadow-sm transition-colors">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#121622]/70 text-[11px] font-black uppercase italic tracking-wider text-slate-500 dark:text-slate-400">
                                    <th className="py-4 px-6 w-12">#</th>
                                    <th className="py-4 px-6">Resident</th>
                                    <th className="py-4 px-6">Service Type</th>
                                    <th className="py-4 px-6">Payment Type</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6 text-right">Amount Paid</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100 dark:divide-[#2a3040] text-sm font-medium">
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                                            No daily request logs found matching criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((tx, idx) => {
                                        const amountPaid = (tx.payment && tx.payment.status === "PAID") ? tx.payment.amount : 0;
                                        const paymentTypeLabel = tx.payment?.method ? tx.payment.method.replaceAll("_", " ") : "N/A";
                                        return (
                                            <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors">
                                                <td className="py-4 px-6 text-xs font-bold text-slate-400 tabular-nums">
                                                    {(currentPage - 1) * limit + idx + 1}
                                                </td>
                                                <td className="py-4 px-6 font-bold text-slate-900 dark:text-white uppercase italic tracking-tight">
                                                    {formatFormattedName(tx.user?.name, tx.residentSnapshot)}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase italic tracking-wider">
                                                        {tx.type?.name || "N/A"}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase italic">
                                                    {paymentTypeLabel}
                                                </td>
                                                <td className="py-4 px-6">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase italic ${getStatusStyles(tx.status)}`}>
                                                        {getStatusLabel(tx.status)}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-right font-bold text-slate-900 dark:text-white tabular-nums">
                                                    ₱{amountPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121622]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-slate-400 font-medium italic">
                            Showing page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of{" "}
                            <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span> ({totalCount} total logs)
                        </p>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400 font-medium italic">Show:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                                    className="px-3 py-1 rounded-lg bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer shadow-sm"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={30}>30</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={currentPage === 1 || isPending}
                                        onClick={() => fetchReportData(currentPage - 1, limit)}
                                        className="p-2 border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl disabled:opacity-40 transition-all cursor-pointer"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={currentPage === totalPages || isPending}
                                        onClick={() => fetchReportData(currentPage + 1, limit)}
                                        className="p-2 border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl disabled:opacity-40 transition-all cursor-pointer"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
