"use client";

import React, { useState, useEffect, useRef, useTransition, useMemo } from "react";
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
    Landmark, Layers, ShieldCheck, Tag, Download, ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { exportForm10APdf, exportForm10AExcel } from "@/app/admin/treasury/payments/rpt-form10a-export";
import { exportRptMonthlyReportPdf, exportRptMonthlyReportExcel } from "./rpt-monthly-report-export";
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
        status?: string;
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

interface RptCollectionsClientProps {
    initialData: {
        payments: PaymentRecord[];
        totalCount: number;
        totalPages: number;
        currentPage: number;
        stats: {
            totalPaid: number;
            paidCount: number;
            cat1Count?: number;
            cat2Count?: number;
            cat3Count?: number;
        };
    };
    themeColor?: string;
    currentUserName?: string;
    initialFrom?: string;
    initialTo?: string;
    initialRptType?: string;
    initialMethod?: string;
    initialSearch?: string;
}

function getTaxpayerName(payment: PaymentRecord) {
    const tx = payment.transaction;
    if (!tx) return "Unknown Taxpayer";
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

    const name = (
        additional.ownerName ||
        additional.taxPayer ||
        snap.fullName ||
        snap.applicantName ||
        additional.applicantName ||
        snap.name ||
        (snap.firstName || snap.lastName ? `${snap.firstName || ""} ${snap.lastName || ""}`.trim() : "") ||
        tx.businessName ||
        tx.user?.name ||
        "Registered Taxpayer"
    );
    return typeof name === "string" && name.trim() ? name.trim() : "Registered Taxpayer";
}

function getPropertyDetails(payment: PaymentRecord) {
    const tx = payment.transaction;
    if (!tx) return { tdn: null, pin: null, brgy: null, classification: null };
    const additional = typeof tx.additionalData === "string"
        ? (() => { try { return JSON.parse(tx.additionalData); } catch { return {}; } })()
        : (tx.additionalData || {});
    let snap: any = {};
    if (tx.residentSnapshot) {
        try {
            snap = typeof tx.residentSnapshot === "string" ? JSON.parse(tx.residentSnapshot) : tx.residentSnapshot;
        } catch {
            snap = {};
        }
    }

    return {
        tdn: additional.tdn || additional.taxDeclarationNo || null,
        pin: additional.pin || additional.propertyIndexNo || null,
        brgy: snap.barangay || additional.barangay || null,
        classification: additional.classification || additional.propertyClassification || additional.propertyType || null
    };
}

export default function RptCollectionsClient({
    initialData,
    themeColor = "#2563eb",
    currentUserName = "",
    initialFrom,
    initialTo,
    initialRptType = "ALL",
    initialMethod = "ALL",
    initialSearch = ""
}: RptCollectionsClientProps) {
    const { data: session } = useSession();
    const activeUserName = session?.user?.name || currentUserName || "";

    const [payments, setPayments] = useState<PaymentRecord[]>(initialData.payments);
    const [totalCount, setTotalCount] = useState(initialData.totalCount);
    const [totalPages, setTotalPages] = useState(initialData.totalPages);
    const [currentPage, setCurrentPage] = useState(initialData.currentPage);
    const [stats, setStats] = useState(initialData.stats);
    const limit = 10;
    const abortControllerRef = useRef<AbortController | null>(null);

    const [isPending, startTransition] = useTransition();
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [isExportingForm10APdf, setIsExportingForm10APdf] = useState(false);
    const [isExportingForm10AExcel, setIsExportingForm10AExcel] = useState(false);
    const [isExportingMonthlyPdf, setIsExportingMonthlyPdf] = useState(false);
    const [isExportingMonthlyExcel, setIsExportingMonthlyExcel] = useState(false);
    const exportDropdownRef = useRef<HTMLDivElement>(null);

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

    // Dynamic signatory settings for reports (defaults to logged-in user name)
    const [treasurerName, setTreasurerName] = useState(activeUserName);
    const [treasurerTitle, setTreasurerTitle] = useState("Acting Municipal Treasurer");

    // Keep signatory name synchronized with active user name when session loads
    useEffect(() => {
        if (activeUserName) {
            setTreasurerName((prev) => (!prev ? activeUserName : prev));
        }
    }, [activeUserName]);

    const [searchVal, setSearchVal] = useState(initialSearch);
    const [search, setSearch] = useState(initialSearch);
    const [methodFilter, setMethodFilter] = useState<string>(initialMethod);
    const [rptTypeFilter, setRptTypeFilter] = useState<string>(initialRptType);

    // Debounce search query to reduce database pressure
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

    const fetchRptData = (pageNumber = 1, currentLimit = limit) => {
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
                    rptType: rptTypeFilter,
                    from: fromDate,
                    to: toDate,
                    page: String(pageNumber),
                    limit: String(currentLimit)
                });

                const res = await fetch(`/api/admin/treasury/rpt-collections?${queryParams.toString()}`, {
                    signal: controller.signal
                });

                if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.error || "Failed to retrieve RPT collections.");
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
                    toast.error(error.message || "Failed to retrieve RPT collections.");
                }
            }
        });
    };

    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        fetchRptData(1, limit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, methodFilter, rptTypeFilter, fromDate, toDate, limit]);

    const handleRefresh = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        let changed = false;
        if (fromDate !== defaultFrom) { setFromDate(defaultFrom); changed = true; }
        if (toDate !== defaultTo) { setToDate(defaultTo); changed = true; }
        if (rptTypeFilter !== "ALL") { setRptTypeFilter("ALL"); changed = true; }
        if (methodFilter !== "ALL") { setMethodFilter("ALL"); changed = true; }
        if (searchVal !== "") { setSearchVal(""); changed = true; }
        if (search !== "") { setSearch(""); changed = true; }

        if (!changed) {
            fetchRptData(currentPage, limit);
        }
        toast.success("RPT filters reset and ledger refreshed!");
    };

    const isFilterChanged = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const defaultFrom = d.toISOString().split("T")[0];
        const defaultTo = new Date().toISOString().split("T")[0];

        return (
            fromDate !== defaultFrom ||
            toDate !== defaultTo ||
            rptTypeFilter !== "ALL" ||
            methodFilter !== "ALL" ||
            searchVal !== ""
        );
    }, [fromDate, toDate, rptTypeFilter, methodFilter, searchVal]);

    const fetchAllRptForExport = async (): Promise<PaymentRecord[]> => {
        const queryParams = new URLSearchParams({
            search,
            method: methodFilter,
            rptType: rptTypeFilter,
            from: fromDate,
            to: toDate,
            exportAll: "true"
        });

        const res = await fetch(`/api/admin/treasury/rpt-collections?${queryParams.toString()}`);
        if (!res.ok) {
            throw new Error("Failed to fetch full RPT collection records for export.");
        }
        const result = await res.json();
        const records = (result.data || []) as PaymentRecord[];

        // Keep UI table and dashboard statistics in sync with the fresh records fetched for export
        if (result.success && records.length > 0) {
            setPayments(records.slice(0, limit));
            if (result.stats) setStats(result.stats);
            if (result.totalCount !== undefined) {
                setTotalCount(result.totalCount);
                setTotalPages(Math.ceil(result.totalCount / limit));
            }
        }

        return records;
    };

    // EXPORT OFFICIAL PROV. FORM NO. 10(A) ABSTRACT (PDF / EXCEL)
    const handleExportForm10A = async (mode: "pdf" | "excel") => {
        const isPdf = mode === "pdf";
        if (isPdf) setIsExportingForm10APdf(true);
        else setIsExportingForm10AExcel(true);

        const toastId = `export-form10a-${mode}`;
        toast.loading(`Generating Form 10(A) RPT Abstract (${isPdf ? "PDF" : "Excel"})...`, { id: toastId });

        try {
            const exportRecords = await fetchAllRptForExport();
            if (exportRecords.length === 0) {
                toast.error("No RPT collection records found to export.", { id: toastId });
                return;
            }

            if (isPdf) {
                await exportForm10APdf(exportRecords, { fromDate, toDate, category: "RPT" });
            } else {
                await exportForm10AExcel(exportRecords, { fromDate, toDate, category: "RPT" });
            }
            toast.success(`Form 10(A) RPT Abstract (${isPdf ? "PDF" : "Excel"}) downloaded!`, { id: toastId });
            setIsExportOpen(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to generate Form 10(A) Abstract.", { id: toastId });
        } finally {
            if (isPdf) setIsExportingForm10APdf(false);
            else setIsExportingForm10AExcel(false);
        }
    };

    // EXPORT OFFICIAL BLGF FORM NO. 2 - A (REVISED 2002) MONTHLY REPORT (PDF / EXCEL)
    const handleExportMonthlyReport = async (mode: "pdf" | "excel") => {
        const isPdf = mode === "pdf";
        if (isPdf) setIsExportingMonthlyPdf(true);
        else setIsExportingMonthlyExcel(true);

        const toastId = `export-monthly-${mode}`;
        toast.loading(`Generating BLGF Form 2-A Monthly Report (${isPdf ? "PDF" : "Excel"})...`, { id: toastId });

        try {
            const exportRecords = await fetchAllRptForExport();
            if (exportRecords.length === 0) {
                toast.error("No RPT collection records found to export.", { id: toastId });
                return;
            }

            const effectiveSignatory = treasurerName.trim() || activeUserName.trim();

            if (isPdf) {
                await exportRptMonthlyReportPdf(exportRecords, {
                    fromDate,
                    toDate,
                    treasurerName: effectiveSignatory,
                    treasurerTitle,
                });
            } else {
                await exportRptMonthlyReportExcel(exportRecords, {
                    fromDate,
                    toDate,
                    treasurerName: effectiveSignatory,
                    treasurerTitle,
                });
            }
            toast.success(`BLGF Form 2-a Monthly Report (${isPdf ? "PDF" : "Excel"}) downloaded!`, { id: toastId });
            setIsExportOpen(false);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "Failed to generate Monthly Report.", { id: toastId });
        } finally {
            if (isPdf) setIsExportingMonthlyPdf(false);
            else setIsExportingMonthlyExcel(false);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        const success = await copyToClipboard(text);
        if (success) {
            setCopiedId(id);
            toast.success("Copied to clipboard!");
            setTimeout(() => setCopiedId(null), 2000);
        } else {
            toast.error("Failed to copy to clipboard.");
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
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                            <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                                RPT <span style={{ color: themeColor }}>Collections & Reports</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium italic">
                                Official Provincial Form No. 10(A) Real Property Tax collection records & PDF abstract generator.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Primary Export Dropdown Hub */}
                <div className="relative" ref={exportDropdownRef}>
                    <button
                        onClick={() => setIsExportOpen((prev) => !prev)}
                        disabled={isPending}
                        className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer border border-blue-400/30"
                        title="Download official Real Property Tax reports"
                    >
                        <Download className="w-4 h-4" />
                        <span>Export Reports</span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Popover */}
                    {isExportOpen && (
                        <div className="absolute right-0 mt-2.5 w-[360px] sm:w-[420px] bg-white dark:bg-[#151a24] border border-slate-200 dark:border-[#283244] rounded-2xl shadow-2xl z-50 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                            {/* Dropdown Title Header */}
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

                            {/* Option 1: Abstract of Real Property Tax (Form 10A) */}
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
                                        disabled={isExportingForm10APdf || isExportingForm10AExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                                    >
                                        {isExportingForm10APdf ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <FileText className="w-3.5 h-3.5" />
                                        )}
                                        <span>PDF</span>
                                    </button>

                                    <button
                                        onClick={() => handleExportForm10A("excel")}
                                        disabled={isExportingForm10APdf || isExportingForm10AExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                    >
                                        {isExportingForm10AExcel ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                        )}
                                        <span>Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* Option 2: Monthly Report of Real Property Tax (BLGF Form 2-a) */}
                            <div className="p-3 bg-slate-50 dark:bg-[#1a202c]/60 rounded-xl border border-slate-200/80 dark:border-[#283244] hover:border-blue-500/40 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"></span>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                                            BLGF Form 2-a (Revised 2002)
                                        </span>
                                    </div>
                                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                        LGU Monthly Report
                                    </span>
                                </div>

                                <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 mb-0.5">
                                    Monthly Report on RPT Collections
                                </h5>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mb-3">
                                    15-column classification matrix (Residential, Agri, Commercial, etc.) with 35/40/25% General Fund & 50/50% SEF revenue shares.
                                </p>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleExportMonthlyReport("pdf")}
                                        disabled={isExportingMonthlyPdf || isExportingMonthlyExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                                    >
                                        {isExportingMonthlyPdf ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <FileText className="w-3.5 h-3.5" />
                                        )}
                                        <span>PDF</span>
                                    </button>

                                    <button
                                        onClick={() => handleExportMonthlyReport("excel")}
                                        disabled={isExportingMonthlyPdf || isExportingMonthlyExcel}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                                    >
                                        {isExportingMonthlyExcel ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <FileSpreadsheet className="w-3.5 h-3.5" />
                                        )}
                                        <span>Excel</span>
                                    </button>
                                </div>
                            </div>

                            {/* Signatory Configuration (Fetched Current User) */}
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
                                                    onClick={() => setTreasurerName(activeUserName)}
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
                                                    localStorage.setItem("E-LGU_rpt_treasurer_name", val);
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
                                                    localStorage.setItem("E-LGU_rpt_treasurer_title", val);
                                                }
                                            }}
                                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dropdown Footer Tip */}
                            <div className="pt-1 text-[9px] text-slate-400 dark:text-slate-500 text-center italic">
                                Exports apply active date filters: <span className="font-bold text-slate-600 dark:text-slate-300">{fromDate}</span> to <span className="font-bold text-slate-600 dark:text-slate-300">{toDate}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick KPI Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total RPT Collections */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-5 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Total RPT Collections</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">
                            ₱{stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                    </div>
                </div>

                {/* Total RPT Records */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-5 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Landmark className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">RPT Paid Records</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{totalCount.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Category 1: Routine Annual Tax */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-5 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Cat 1: Routine & Clearance</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{(stats.cat1Count ?? 0).toLocaleString()}</h3>
                    </div>
                </div>

                {/* Category 2 & 3: Declarations & Transfers */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-5 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Cat 2 & 3: Assessor</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">
                            {((stats.cat2Count ?? 0) + (stats.cat3Count ?? 0)).toLocaleString()}
                        </h3>
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

                    {/* RPT Sub-Type Filter Dropdown */}
                    <div className="relative w-full sm:w-[220px] shrink-0">
                        <select
                            value={rptTypeFilter}
                            onChange={(e) => setRptTypeFilter(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                        >
                            <option value="ALL">All RPT Services</option>
                            <option value="RPT_CAT1">Cat 1: Routine & Clearance</option>
                            <option value="RPT_CAT2">Cat 2: New Property Declaration</option>
                            <option value="RPT_CAT3">Cat 3: Transfer Ownership</option>
                        </select>
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <Tag className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>

                    {/* Payment Mode Selector Dropdown */}
                    <div className="relative w-full sm:w-[160px] shrink-0">
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
                            placeholder="Search Taxpayer, Ref, OR, TDN..."
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
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">OR / Receipt No.</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Taxpayer / Payee</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">RPT Service</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Property Details (TDN / PIN)</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Method</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Amount Paid</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300">Status</TableHead>
                                <TableHead className="font-bold text-slate-700 dark:text-slate-300 text-right pr-6">Date Paid</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-16 text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-[#1e2330] flex items-center justify-center text-slate-400">
                                                <Landmark className="w-7 h-7" />
                                            </div>
                                            <span className="text-base font-bold text-slate-600 dark:text-slate-300">No RPT records found</span>
                                            <span className="text-xs text-slate-400 max-w-sm">
                                                Try adjusting your date range, search keyword, or RPT service category filter.
                                            </span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                payments.map((p, idx) => {
                                    const { date, time } = formatDateTime(p.createdAt);
                                    const taxpayer = getTaxpayerName(p);
                                    const prop = getPropertyDetails(p);
                                    const rowNum = (currentPage - 1) * limit + idx + 1;
                                    const receipt = p.orNumber || p.reference || "—";

                                    return (
                                        <TableRow
                                            key={p.id}
                                            className="hover:bg-slate-50/80 dark:hover:bg-[#1a202c]/50 transition-colors border-b border-slate-100 dark:border-[#2a3040]/30"
                                        >
                                            {/* Row # */}
                                            <TableCell className="pl-6 font-bold text-slate-400 text-xs text-center">
                                                {rowNum}
                                            </TableCell>

                                            {/* Receipt / OR No */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 font-mono text-xs font-black text-slate-900 dark:text-white">
                                                    <span>{receipt}</span>
                                                    {receipt !== "—" && (
                                                        <button
                                                            onClick={() => handleCopy(receipt, `receipt-${p.id}`)}
                                                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1"
                                                            title="Copy Receipt / OR Number"
                                                        >
                                                            {copiedId === `receipt-${p.id}` ? (
                                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                                {p.reference && p.orNumber && (
                                                    <span className="text-[10px] text-slate-400 block font-mono">
                                                        Ref: {p.reference}
                                                    </span>
                                                )}
                                            </TableCell>

                                            {/* Taxpayer */}
                                            <TableCell>
                                                <div className="font-bold text-slate-900 dark:text-white text-xs uppercase">
                                                    {taxpayer}
                                                </div>
                                                {p.transaction?.user?.email && (
                                                    <div className="text-[10px] text-slate-400 lowercase">
                                                        {p.transaction.user.email}
                                                    </div>
                                                )}
                                            </TableCell>

                                            {/* RPT Service Type */}
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs line-clamp-1">
                                                        {p.transaction?.type?.name || "Real Property Tax"}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* Property Details */}
                                            <TableCell>
                                                <div className="space-y-0.5 text-xs">
                                                    {prop.tdn && (
                                                        <div className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                                            TDN: {prop.tdn}
                                                        </div>
                                                    )}
                                                    {prop.pin && (
                                                        <div className="font-mono text-[10px] text-slate-400">
                                                            PIN: {prop.pin}
                                                        </div>
                                                    )}
                                                    {prop.brgy && (
                                                        <div className="text-[10px] text-slate-400">
                                                            Brgy. {prop.brgy}
                                                        </div>
                                                    )}
                                                    {!prop.tdn && !prop.pin && !prop.brgy && (
                                                        <span className="text-slate-400 text-xs italic">—</span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Method */}
                                            <TableCell>
                                                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase bg-slate-100 dark:bg-[#1e2330] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2a3040]">
                                                    {p.method.replace(/_/g, " ")}
                                                </span>
                                            </TableCell>

                                            {/* Amount */}
                                            <TableCell>
                                                <span className="font-black text-slate-900 dark:text-white text-xs font-mono">
                                                    ₱{p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                    p.status === "PAID"
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </TableCell>

                                            {/* Date Paid */}
                                            <TableCell className="text-right pr-6">
                                                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{date}</div>
                                                <div className="text-[10px] text-slate-400">{time}</div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {totalCount > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-[#2a3040]/30">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Showing <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * limit + 1}</span> to{" "}
                            <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * limit, totalCount)}</span> of{" "}
                            <span className="font-bold text-slate-700 dark:text-slate-200">{totalCount}</span> RPT records
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchRptData(currentPage - 1, limit)}
                                disabled={currentPage <= 1 || isPending}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-[#252b3b] transition-all cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                <span>Prev</span>
                            </button>

                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 px-2">
                                {currentPage} / {totalPages || 1}
                            </span>

                            <button
                                onClick={() => fetchRptData(currentPage + 1, limit)}
                                disabled={currentPage >= totalPages || isPending}
                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-[#252b3b] transition-all cursor-pointer"
                            >
                                <span>Next</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
