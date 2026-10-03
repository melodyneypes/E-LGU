"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Search, Copy, Check, DollarSign, CalendarIcon, FileSpreadsheet,
    ChevronLeft, ChevronRight, Loader2, ArrowLeft, FileText, RotateCcw,
    Folder, Download, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { exportForm10APdf, exportForm10AExcel } from "./rpt-form10a-export";
import { exportForm129APdf, exportForm129AExcel } from "./general-form129a-export";
import { exportMonthlySummaryPdf, exportMonthlySummaryExcel } from "./monthly-summary-export";
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
        businessName: string | null;
        residentSnapshot?: any;
        additionalData?: any;
        fiscalSnapshot?: any;
        type: {
            name: string;
            category?: string;
            code?: string;
        };
        user: {
            name: string | null;
            email: string;
        } | null;
    };
}

interface PaymentsClientProps {
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
    categories?: string[];
    themeColor?: string;
    currentUserName?: string;
    initialFrom?: string;
    initialTo?: string;
    initialCategory?: string;
    initialMethod?: string;
    initialSearch?: string;
}

function getRequesterName(payment: PaymentRecord) {
    const tx = payment.transaction;
    if (!tx) return "Unknown";
    let snap: any = {};
    if (tx.residentSnapshot) {
        try {
            snap = typeof tx.residentSnapshot === "string" ? JSON.parse(tx.residentSnapshot) : tx.residentSnapshot;
        } catch {
            snap = {};
        }
    }
    const additional = typeof tx.additionalData === "string"
        ? (() => { try { return JSON.parse(tx.additionalData); } catch { return {}; } })()
        : (tx.additionalData || {});

    const fullName = (
        snap.fullName ||
        snap.violatorName ||
        snap.applicantName ||
        snap.name ||
        additional.ownerName ||
        additional.applicantName ||
        additional.taxPayer ||
        additional.violatorName ||
        (snap.firstName || snap.lastName ? `${snap.firstName || ""} ${snap.lastName || ""}`.trim() : "") ||
        tx.businessName ||
        tx.user?.name ||
        "Registered Resident"
    );
    return typeof fullName === "string" && fullName.trim() ? fullName.trim() : "Registered Resident";
}

export default function PaymentsClient({
    initialData,
    categories = [],
    themeColor = "#2563eb",
    currentUserName,
    initialFrom,
    initialTo,
    initialCategory = "ALL",
    initialMethod = "ALL",
    initialSearch = ""
}: PaymentsClientProps) {
    const { data: session } = useSession();
    const activeUserName = currentUserName || session?.user?.name || "Treasury Staff";

    const [payments, setPayments] = useState<PaymentRecord[]>(initialData.payments);
    const [totalCount, setTotalCount] = useState(initialData.totalCount);
    const [totalPages, setTotalPages] = useState(initialData.totalPages);
    const [currentPage, setCurrentPage] = useState(initialData.currentPage);
    const [stats, setStats] = useState(initialData.stats);
    const [limit, setLimit] = useState(10);
    const abortControllerRef = useRef<AbortController | null>(null);

    const [isPending, startTransition] = useTransition();
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingGenExcel, setIsExportingGenExcel] = useState(false);
    const [isExportingGenPdf, setIsExportingGenPdf] = useState(false);
    const [isExportingSummaryExcel, setIsExportingSummaryExcel] = useState(false);
    const [isExportingSummaryPdf, setIsExportingSummaryPdf] = useState(false);

    // Export Dropdown & Signatory states
    const [isExportOpen, setIsExportOpen] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);
    const [treasurerName, setTreasurerName] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("E-LGU_treasurer_name") || activeUserName;
        }
        return activeUserName;
    });
    const [treasurerTitle, setTreasurerTitle] = useState(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("E-LGU_treasurer_title") || "Acting Municipal Treasurer";
        }
        return "Acting Municipal Treasurer";
    });

    // Close export dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
                setIsExportOpen(false);
            }
        }
        if (isExportOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isExportOpen]);

    const [searchVal, setSearchVal] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [methodFilter, setMethodFilter] = useState<string>(initialMethod);
    const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory);

    // Debounce search query to reduce database/server pressure
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

    const fetchPaymentsData = (pageNumber = 1, currentLimit = limit) => {
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
                    category: categoryFilter,
                    from: fromDate,
                    to: toDate,
                    page: String(pageNumber),
                    limit: String(currentLimit)
                });

                const res = await fetch(`/api/admin/treasury/payments?${queryParams.toString()}`, {
                    signal: controller.signal
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to retrieve payments data.");
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
    };

    const handleRefresh = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        let changed = false;
        if (fromDate !== defaultFrom) { setFromDate(defaultFrom); changed = true; }
        if (toDate !== defaultTo) { setToDate(defaultTo); changed = true; }
        if (categoryFilter !== "ALL") { setCategoryFilter("ALL"); changed = true; }
        if (methodFilter !== "ALL") { setMethodFilter("ALL"); changed = true; }
        if (searchVal !== "") { setSearchVal(""); changed = true; }
        if (search !== "") { setSearch(""); changed = true; }

        if (!changed) {
            fetchPaymentsData(currentPage, limit);
        }
        toast.success("Filters reset and data refreshed!");
    };

    const fetchExportData = async (overrideCategory?: string): Promise<PaymentRecord[]> => {
        const cat = overrideCategory !== undefined ? overrideCategory : categoryFilter;
        const queryParams = new URLSearchParams({
            search,
            method: methodFilter,
            category: cat,
            from: fromDate,
            to: toDate,
            exportAll: "true"
        });

        const res = await fetch(`/api/admin/treasury/payments?${queryParams.toString()}`);
        if (!res.ok) {
            throw new Error("Failed to fetch export data");
        }
        const result = await res.json();
        return (result.data || []) as PaymentRecord[];
    };

    const isFirstMount = useRef(true);

    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        fetchPaymentsData(1, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, methodFilter, categoryFilter, fromDate, toDate, limit]);

    // Track page and limit in a ref to avoid recreation of SSE subscription
    const stateRef = useRef({ currentPage, limit });
    useEffect(() => {
        stateRef.current = { currentPage, limit };
    }, [currentPage, limit]);

    // Check if filters have been modified from default states
    const isFilterChanged = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        return (
            fromDate !== defaultFrom ||
            toDate !== defaultTo ||
            categoryFilter !== "ALL" ||
            methodFilter !== "ALL" ||
            searchVal !== ""
        );
    }, [fromDate, toDate, categoryFilter, methodFilter, searchVal]);

    // Real-time updates subscription using Server-Sent Events (SSE)
    useEffect(() => {
        const eventSource = new EventSource("/api/admin/treasury/payments/stream");

        eventSource.onmessage = (event) => {
            if (event.data === "refresh") {
                console.log("[PaymentsClient] SSE refresh event received, updating ledger...");
                fetchPaymentsData(stateRef.current.currentPage, stateRef.current.limit);
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

    // Helper to identify Real Property Tax (RPT) transactions
    const isPaymentRpt = (p: PaymentRecord) => {
        const cat = (p.transaction?.type?.category || "").toUpperCase();
        const code = (p.transaction?.type?.code || "").toUpperCase();
        const name = (p.transaction?.type?.name || "").toUpperCase();
        const add = typeof p.transaction?.additionalData === "string"
            ? (() => { try { return JSON.parse(p.transaction.additionalData); } catch { return {}; } })()
            : (p.transaction?.additionalData || {});
        return (
            cat === "RPT" ||
            cat === "REAL PROPERTY TAX" ||
            cat === "REALPROPERTYTAX" ||
            code.startsWith("RPT_") ||
            name.includes("REAL PROPERTY TAX") ||
            name.includes("AMILYAR") ||
            Boolean(add?.tdn || add?.pin || add?.taxDeclarationNo || add?.propertyClassification)
        );
    };

    // DIRECT EXPORT FOR OFFICIAL PROV. FORM NO. 10(A) ABSTRACT
    const handleExportForm10A = async (mode: "excel" | "pdf") => {
        if (mode === "excel") setIsExportingExcel(true);
        else setIsExportingPdf(true);

        const activeCatLabel = categoryFilter && categoryFilter !== "ALL" ? categoryFilter : "RPT";
        const toastId = `form10a-${mode}-export`;
        toast.loading(`Generating official Prov. Form No. 10(A) ${activeCatLabel} ${mode.toUpperCase()} Abstract...`, { id: toastId });

        try {
            // Fetch records exclusively from THIS active ledger
            const exportPayments = await fetchExportData();

            if (exportPayments.length === 0) {
                toast.error("Walang data sa kasalukuyang ledger para i-export.", { id: toastId });
                return;
            }

            if (mode === "excel") {
                await exportForm10AExcel(exportPayments, { fromDate, toDate, category: categoryFilter });
                toast.success(`Form 10(A) ${activeCatLabel} Excel Abstract exported with ${exportPayments.length} record(s)!`, { id: toastId });
            } else {
                await exportForm10APdf(exportPayments, { fromDate, toDate, category: categoryFilter });
                toast.success(`Form 10(A) ${activeCatLabel} PDF Abstract exported with ${exportPayments.length} record(s)!`, { id: toastId });
            }
        } catch (err) {
            console.error(err);
            toast.error(`Failed to generate Form 10(A) ${mode.toUpperCase()}. Please try again.`, { id: toastId });
        } finally {
            if (mode === "excel") setIsExportingExcel(false);
            else setIsExportingPdf(false);
        }
    };

    // DIRECT EXPORT FOR OFFICIAL PROV. FORM NO. 129(A) ABSTRACT (GENERAL COLLECTIONS)
    const handleExportForm129A = async (mode: "excel" | "pdf") => {
        if (mode === "excel") setIsExportingGenExcel(true);
        else setIsExportingGenPdf(true);

        const toastId = `form129a-${mode}-export`;
        toast.loading(`Generating official Prov. Form No. 129(A) General Collections ${mode.toUpperCase()} Abstract...`, { id: toastId });

        try {
            // Fetch records from active ledger
            const allExportPayments = await fetchExportData();

            // Filter for General Collections only (exclude Real Property Tax)
            const genPayments = allExportPayments.filter(p => !isPaymentRpt(p));

            if (genPayments.length === 0) {
                toast.error("Walang general collection data sa kasalukuyang ledger para i-export.", { id: toastId });
                return;
            }

            if (mode === "excel") {
                await exportForm129AExcel(genPayments, {
                    fromDate,
                    toDate,
                    treasurerName,
                    treasurerTitle
                });
                toast.success(`Form 129(A) General Collections Excel exported with ${genPayments.length} record(s)!`, { id: toastId });
            } else {
                await exportForm129APdf(genPayments, {
                    fromDate,
                    toDate,
                    treasurerName,
                    treasurerTitle
                });
                toast.success(`Form 129(A) General Collections PDF exported with ${genPayments.length} record(s)!`, { id: toastId });
            }
        } catch (err) {
            console.error(err);
            toast.error(`Failed to generate Form 129(A) ${mode.toUpperCase()}. Please try again.`, { id: toastId });
        } finally {
            if (mode === "excel") setIsExportingGenExcel(false);
            else setIsExportingGenPdf(false);
        }
    };

    // EXPORT FOR OFFICIAL MONTHLY SUMMARY OF COLLECTIONS (BY ACCOUNT CODE / PARTICULARS - IMAGE 1)
    const handleExportMonthlySummary = async (mode: "excel" | "pdf") => {
        if (mode === "excel") setIsExportingSummaryExcel(true);
        else setIsExportingSummaryPdf(true);

        const toastId = `summary-${mode}-export`;
        toast.loading(`Generating Monthly Summary of Collections ${mode.toUpperCase()} Report...`, { id: toastId });

        try {
            const allExportPayments = await fetchExportData();

            if (allExportPayments.length === 0) {
                toast.error("Walang collection data sa kasalukuyang ledger para i-export.", { id: toastId });
                return;
            }

            if (mode === "excel") {
                await exportMonthlySummaryExcel(allExportPayments, {
                    fromDate,
                    toDate,
                    treasurerName,
                    treasurerTitle
                });
                toast.success(`Monthly Summary of Collections Excel exported with ${allExportPayments.length} record(s)!`, { id: toastId });
            } else {
                await exportMonthlySummaryPdf(allExportPayments, {
                    fromDate,
                    toDate,
                    treasurerName,
                    treasurerTitle
                });
                toast.success(`Monthly Summary of Collections PDF exported with ${allExportPayments.length} record(s)!`, { id: toastId });
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || `Failed to generate Monthly Summary ${mode.toUpperCase()}. Please try again.`, { id: toastId });
        } finally {
            if (mode === "excel") setIsExportingSummaryExcel(false);
            else setIsExportingSummaryPdf(false);
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
            {/* Header section with title and actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 dark:border-[#2a3040]/30 pb-6">
                <div className="space-y-2">
                    <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-2 text-xs font-black uppercase italic tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Payments <span style={{ color: themeColor }}>Ledger</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                        Search, filter, and track all citizen payment transactions and reference numbers.
                    </p>
                </div>

                {/* Official Abstracts & Reports Export Hub (Matching Image 3 Dropdown) */}
                <div className="relative" ref={exportDropdownRef}>
                    <button
                        onClick={() => setIsExportOpen((prev) => !prev)}
                        disabled={isPending}
                        className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer border border-blue-400/30"
                        title="Download official Treasury collection reports"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Reports</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Popover */}
                    {isExportOpen && (
                        <div className="absolute right-0 mt-2.5 w-[360px] sm:w-[440px] bg-white dark:bg-[#151a24] border border-slate-200 dark:border-[#283244] rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#242b3a]">
                                <div>
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                        Export Official Reports
                                    </h4>
                                    <p className="text-[10px] text-slate-400 font-medium">
                                        Download formatted official government documents
                                    </p>
                                </div>
                                <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    MUNICIPALITY OF E-LGU
                                </span>
                            </div>

                            {/* Option 1: Form 10(A) Real Property Tax Abstract */}
                            <div className="p-3 bg-slate-50 dark:bg-[#1a202c]/60 rounded-xl border border-slate-200/80 dark:border-[#283244] hover:border-amber-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]"></span>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                                            Form 10(A)
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        Provincial Abstract
                                    </span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 mb-0.5">
                                    Abstract of Real Property Tax
                                </h5>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mb-3">
                                    Individual receipt items, taxpayer names, TDN/PIN numbers, and basic tax collection breakdown.
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleExportForm10A("pdf")}
                                        disabled={isExportingPdf || isExportingExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                                    >
                                        {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                        <span>PDF</span>
                                    </button>
                                    <button
                                        onClick={() => handleExportForm10A("excel")}
                                        disabled={isExportingPdf || isExportingExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                    >
                                        {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                        <span>Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* Option 2: Form 129(A) General Collections Abstract */}
                            <div className="p-3 bg-slate-50 dark:bg-[#1a202c]/60 rounded-xl border border-slate-200/80 dark:border-[#283244] hover:border-blue-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                            Form 129(A)
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        General Collections
                                    </span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 mb-0.5">
                                    Abstract of General Collections
                                </h5>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mb-3">
                                    28-column classification matrix for Business Permits, Civil Registry, MTOP, and other municipal revenues.
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleExportForm129A("pdf")}
                                        disabled={isExportingGenPdf || isExportingGenExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                                    >
                                        {isExportingGenPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                        <span>PDF</span>
                                    </button>
                                    <button
                                        onClick={() => handleExportForm129A("excel")}
                                        disabled={isExportingGenPdf || isExportingGenExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                    >
                                        {isExportingGenExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                        <span>Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* Option 3: Monthly Summary of Collections (Image 1) */}
                            <div className="p-3 bg-slate-50 dark:bg-[#1a202c]/60 rounded-xl border border-slate-200/80 dark:border-[#283244] hover:border-emerald-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                            Monthly Summary
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        Account Code Summary
                                    </span>
                                </div>
                                <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 mb-0.5">
                                    Monthly Summary of Collections
                                </h5>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mb-3">
                                    Itemized statement of collections categorized by official Account Codes (582, 583, 588, 601, 604, 605, 606, etc.) and particulars.
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleExportMonthlySummary("pdf")}
                                        disabled={isExportingSummaryPdf || isExportingSummaryExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                                    >
                                        {isExportingSummaryPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                                        <span>PDF</span>
                                    </button>
                                    <button
                                        onClick={() => handleExportMonthlySummary("excel")}
                                        disabled={isExportingSummaryPdf || isExportingSummaryExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                    >
                                        {isExportingSummaryExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                                        <span>Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* Signatory Configuration */}
                            <div className="pt-2.5 pb-1 border-t border-slate-100 dark:border-[#242b3a] space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                        Certified Correct Signatory
                                    </span>
                                    <span className="text-[9px] text-blue-500 font-bold truncate max-w-[200px]">
                                        {activeUserName ? `User: ${activeUserName}` : "Default: Blank Line"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                Signatory Name
                                            </label>
                                            {activeUserName && treasurerName !== activeUserName && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTreasurerName(activeUserName);
                                                        if (typeof window !== "undefined") {
                                                            localStorage.setItem("E-LGU_treasurer_name", activeUserName);
                                                        }
                                                    }}
                                                    className="text-[9px] text-blue-500 hover:underline cursor-pointer"
                                                    title="Reset to current user"
                                                >
                                                    Reset
                                                </button>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            placeholder={activeUserName || "Current user name..."}
                                            value={treasurerName}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setTreasurerName(val);
                                                if (typeof window !== "undefined") {
                                                    localStorage.setItem("E-LGU_treasurer_name", val);
                                                }
                                            }}
                                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                            Official Designation
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Acting Municipal Treasurer"
                                            value={treasurerTitle}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setTreasurerTitle(val);
                                                if (typeof window !== "undefined") {
                                                    localStorage.setItem("E-LGU_treasurer_title", val);
                                                }
                                            }}
                                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Active Filter Hint */}
                            <div className="text-center pt-1 text-[9px] text-slate-400 dark:text-slate-500 italic">
                                Exports apply active date filters: {fromDate} to {toDate}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick KPI Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

                {/* Total Logs Count */}
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

                    {/* Category Dropdown */}
                    <div className="relative w-full sm:w-[170px] shrink-0">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                        >
                            <option value="ALL">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Folder className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>

                    {/* Payment Mode Selector Dropdown */}
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

                    {/* Search Input inline */}
                    <div className="relative w-full sm:w-[260px] sm:ml-auto shrink-0">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search Name, Ref or Business..."
                            value={searchVal}
                            onChange={(e) => setSearchVal(e.target.value)}
                            className="w-full pl-10 pr-4 h-11 bg-slate-50 dark:bg-[#0f1117] border border-slate-200 dark:border-[#2a3040] rounded-xl outline-none text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-blue-500 transition-colors shadow-inner"
                        />
                    </div>

                    {/* Reset Filters / Refresh Button */}
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
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Reference No.</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Citizen / Business</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Service Type</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Method</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Amount</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Date Paid</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right pr-6">OR Number</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={`skeleton-${i}`} className="border-b border-slate-100 dark:border-[#2a3040]/50 animate-pulse">
                                        <TableCell className="py-4 pl-6 w-12"><div className="h-4 w-4 bg-slate-200 dark:bg-slate-700 rounded mx-auto" /></TableCell>
                                        <TableCell className="py-4"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-36 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></TableCell>
                                        <TableCell className="pr-6"><div className="h-4 w-28 bg-slate-200 dark:bg-slate-700 rounded ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="py-12 text-center font-bold italic text-slate-400">
                                        No payment logs found matching the filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payments.map((payment, idx) => {
                                    const formattedDate = formatDateTime(payment.createdAt);
                                    const citizenName = getRequesterName(payment);
                                    const serviceName = payment.transaction?.type?.name || "Service Payment";
                                    const refDisplay = payment.reference || "N/A";
                                    const rowNumber = (currentPage - 1) * limit + idx + 1;
                                    
                                    return (
                                        <TableRow 
                                            key={payment.id} 
                                            onClick={() => router.push(`/admin/treasury/${payment.transactionId}`)}
                                            className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer select-none"
                                        >
                                            <TableCell className="py-4 pl-6 text-center text-xs font-bold text-slate-500 dark:text-slate-400 w-12">
                                                {rowNumber}
                                            </TableCell>
                                            <TableCell className="py-4 font-mono text-xs font-bold text-slate-900 dark:text-white">
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
                                                    <span className="font-bold text-slate-900 dark:text-white uppercase leading-tight">
                                                        {citizenName}
                                                    </span>
                                                    {payment.transaction?.businessName && (
                                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase italic mt-0.5">
                                                            Business: {payment.transaction.businessName}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-bold text-slate-600 dark:text-slate-300">
                                                {serviceName}
                                            </TableCell>
                                            <TableCell className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">
                                                {payment.method?.replace(/_/g, " ")}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-900 dark:text-white">
                                                ₱{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{formattedDate.date}</span>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formattedDate.time}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                {payment.orNumber || "—"}
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
