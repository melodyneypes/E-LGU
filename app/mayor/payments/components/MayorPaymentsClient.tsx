"use client";

import React, { useState, useEffect, useTransition, useRef, useMemo } from "react";
import {
    Search, DollarSign, CheckCircle2, Clock, RefreshCcw, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

interface PaymentItem {
    id: string;
    amount: number;
    method: string;
    status: string;
    reference?: string | null;
    orNumber?: string | null;
    createdAt: string | Date;
    transactionId?: string | null;
    serviceType: string;
    serviceCategory: string;
    user?: {
        name: string | null;
        email: string | null;
    } | null;
    residentSnapshot?: any;
    additionalData?: any;
}

interface MayorPaymentsClientProps {
    initialData: {
        payments: PaymentItem[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
        stats: {
            totalCount: number;
            totalRevenue: number;
            paidCount: number;
            pendingCount: number;
            avgPayment: number;
        };
    };
    categories: string[];
    themeColor?: string;
    initialFrom?: string;
    initialTo?: string;
    initialCategory?: string;
    initialMethod?: string;
    initialSearch?: string;
    initialBarangay?: string;
}

export function MayorPaymentsClient({
    initialData,
    categories,
    initialFrom,
    initialTo,
    initialCategory = "ALL",
    initialMethod = "ALL",
    initialSearch = "",
    themeColor = "#2563eb"
}: MayorPaymentsClientProps) {
    const [payments, setPayments] = useState<PaymentItem[]>(initialData.payments);
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
    const [method, setMethod] = useState(initialMethod);
    const [search, setSearch] = useState(initialSearch);

    const [isPending, startTransition] = useTransition();

    const fetchPayments = (pageNumber: number, currentLimit: number) => {
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
                    method,
                    search,
                    page: String(pageNumber),
                    limit: String(currentLimit)
                });

                const res = await fetch(`/api/mayor/payments?${queryParams.toString()}`, {
                    signal: controller.signal
                });

                if (!res.ok) {
                    throw new Error("Failed to load payments ledger.");
                }

                const data = await res.json();
                if (data.success) {
                    setPayments(data.payments);
                    setTotalCount(data.totalCount);
                    setTotalPages(data.totalPages);
                    setCurrentPage(pageNumber);
                    if (data.stats) {
                        setStats(data.stats);
                    }
                }
            } catch (error: any) {
                if (error.name !== "AbortError") {
                    toast.error("Failed to refresh payments ledger.");
                }
            }
        });
    };

    useEffect(() => {
        fetchPayments(1, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, category, method]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPayments(1, limit);
        }, 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const isFilterChanged = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        return (
            fromDate !== defaultFrom ||
            toDate !== defaultTo ||
            category !== "ALL" ||
            method !== "ALL" ||
            search !== ""
        );
    }, [fromDate, toDate, category, method, search]);

    const handleReset = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        setFromDate(d.toISOString().split("T")[0]);
        setToDate(new Date().toISOString().split("T")[0]);
        setCategory("ALL");
        setMethod("ALL");
        setSearch("");
        toast.success("Payment filters reset!");
    };

    const formatFormattedName = (userStr?: string | null, snapshot?: any, addData?: any) => {
        let name = userStr || null;
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
        if (!name && addData) {
            if (typeof addData === "string") {
                try {
                    const parsed = JSON.parse(addData);
                    name = parsed.violatorName || null;
                } catch {
                    name = null;
                }
            } else if (typeof addData === "object") {
                name = addData.violatorName || null;
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
            {/* Header & Page Title */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#2a3040] max-w-7xl mx-auto">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Municipal <span style={{ color: themeColor }}>Payments</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                        E-LGU Executive Oversight: Monitor municipal revenues and transaction payments.
                    </p>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-7xl mx-auto">
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Collected</p>
                        <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
                            ₱{stats.totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ backgroundColor: themeColor }}>
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Paid Transactions</p>
                        <p className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
                            {stats.paidCount}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-6 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pending Payments</p>
                        <p className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
                            {stats.pendingCount}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-6 shadow-sm max-w-7xl mx-auto space-y-6">
                {/* Filter Controls */}
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

                    {/* Payment Method */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Payment Method</label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                        >
                            <option value="ALL">All Methods</option>
                            <option value="CASH">CASH</option>
                            <option value="ONLINE">ONLINE / E-PAYMENT</option>
                            <option value="GCASH">GCASH</option>
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="space-y-1">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Search Payment</label>
                            {isFilterChanged && (
                                <button
                                    onClick={handleReset}
                                    className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <RefreshCcw size={10} /> Reset
                                </button>
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search resident or ref..."
                                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                    </div>
                </div>

                {/* Payments Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#121622]/70 text-[11px] font-black uppercase italic tracking-wider text-slate-500 dark:text-slate-400">
                                <th className="py-4 px-6 w-12">#</th>
                                <th className="py-4 px-6">Payer / Resident</th>
                                <th className="py-4 px-6">Service Type</th>
                                <th className="py-4 px-6">Method</th>
                                <th className="py-4 px-6">Status</th>
                                <th className="py-4 px-6 text-right">Amount Paid</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 dark:divide-[#2a3040] text-sm font-medium">
                            {isPending ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="py-4 px-6"><div className="h-4 w-4 bg-slate-200 dark:bg-[#1e2330] rounded-md"></div></td>
                                        <td className="py-4 px-6"><div className="h-4 w-36 bg-slate-200 dark:bg-[#1e2330] rounded-md"></div></td>
                                        <td className="py-4 px-6"><div className="h-5 w-28 bg-slate-200 dark:bg-[#1e2330] rounded-xl"></div></td>
                                        <td className="py-4 px-6"><div className="h-4 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-md"></div></td>
                                        <td className="py-4 px-6"><div className="h-5 w-16 bg-slate-200 dark:bg-[#1e2330] rounded-full"></div></td>
                                        <td className="py-4 px-6 text-right"><div className="h-4 w-20 bg-slate-200 dark:bg-[#1e2330] rounded-md ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : payments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400 italic font-bold">
                                        No municipal payment records found matching criteria.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((pm, idx) => {
                                    const amountPaid = pm.status === "PAID" ? pm.amount : 0;
                                    return (
                                        <tr key={pm.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors">
                                            <td className="py-4 px-6 text-xs font-bold text-slate-400 tabular-nums">
                                                {(currentPage - 1) * limit + idx + 1}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-slate-900 dark:text-white uppercase italic tracking-tight">
                                                {formatFormattedName(pm.user?.name, pm.residentSnapshot, pm.additionalData)}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-black uppercase italic tracking-wider">
                                                    {pm.serviceType}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase italic">
                                                {pm.method.replaceAll("_", " ")}
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase italic ${
                                                    pm.status === "PAID" 
                                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                                }`}>
                                                    {pm.status}
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
                <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121622]/50 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl">
                    <p className="text-xs text-slate-400 font-medium italic">
                        Showing page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of{" "}
                        <span className="font-bold text-slate-700 dark:text-slate-200">{totalPages}</span> ({totalCount} total payment logs)
                    </p>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium italic">Show:</span>
                            <select
                                value={limit}
                                onChange={(e) => setLimit(Number(e.target.value))}
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
                                    onClick={() => fetchPayments(currentPage - 1, limit)}
                                    disabled={currentPage <= 1 || isPending}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fetchPayments(currentPage + 1, limit)}
                                    disabled={currentPage >= totalPages || isPending}
                                    className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a202c] text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
