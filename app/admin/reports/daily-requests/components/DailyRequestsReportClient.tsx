"use client";

import React, { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { 
    Search, Calendar, Folder, FileSpreadsheet, FileText, 
    ArrowLeft, ChevronLeft, ChevronRight, Loader2, 
    CheckCircle, Clock, AlertTriangle, Eye 
} from "lucide-react";
import Link from "next/link";
import { getTransactionReportData } from "@/app/admin/actions";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
    id: string;
    createdAt: string | Date;
    status: string;
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
    } | null;
}

interface DailyRequestsReportClientProps {
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
}

export function DailyRequestsReportClient({
    initialData,
    categories,
    initialFrom,
    initialTo,
    initialCategory = "ALL",
    initialStatus = "ALL",
    initialSearch = ""
}: DailyRequestsReportClientProps) {
    const [transactions, setTransactions] = useState<Transaction[]>(initialData.transactions);
    const [totalCount, setTotalCount] = useState(initialData.totalCount);
    const [totalPages, setTotalPages] = useState(initialData.totalPages);
    const [currentPage, setCurrentPage] = useState(initialData.currentPage);
    const [stats, setStats] = useState(initialData.stats);

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
    
    const [isPending, startTransition] = useTransition();
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

    const fetchReportData = (pageNumber = 1) => {
        startTransition(async () => {
            const res = await getTransactionReportData({
                from: fromDate,
                to: toDate,
                category,
                status,
                search,
                page: pageNumber,
                limit: 10
            });

            if (res.success && res.transactions) {
                setTransactions(res.transactions as Transaction[]);
                setTotalCount(res.totalCount ?? 0);
                setTotalPages(res.totalPages ?? 1);
                setCurrentPage(pageNumber);
                if (res.stats) {
                    setStats(res.stats);
                }
            } else {
                toast.error(res.error || "Failed to retrieve report data.");
            }
        });
    };

    // Refetch when filters change (debounce or trigger directly on select update)
    useEffect(() => {
        fetchReportData(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fromDate, toDate, category, status]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchReportData(1);
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
                return "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/20";
            default:
                return "bg-slate-50 dark:bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-500/20";
        }
    };

    const getStatusLabel = (statusStr: string) => {
        switch (statusStr) {
            case "RELEASED": return "Released";
            case "REJECTED": return "Rejected";
            case "FOR_REQUESTING": return "For Requesting";
            case "FOR_INSPECTION": return "For Inspection";
            case "FOR_REVISION": return "For Revision";
            case "FOR_PROCESSING": return "In Processing";
            default: return statusStr;
        }
    };

    // EXPORT EXCEL FUNCTION
    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            const res = await getTransactionReportData({
                from: fromDate,
                to: toDate,
                category,
                status,
                search,
                exportAll: true
            });

            if (!res.success || !res.transactions) {
                toast.error("Failed to load export data.");
                return;
            }

            const exportData = res.transactions.map((tx: any) => ({
                "Transaction ID": tx.id,
                "Date Requested": format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm"),
                "Resident Name": tx.user?.name || "A Resident",
                "Barangay": tx.user?.residentProfile?.barangay || "N/A",
                "Service Type": tx.type?.name || "N/A",
                "Category": tx.type?.category || "N/A",
                "Status": getStatusLabel(tx.status),
                "Amount Paid": (tx.payment && tx.payment.status === "PAID") ? tx.payment.amount : 0
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Daily Requests Report");

            // Save Spreadsheet
            XLSX.writeFile(wb, `Daily_Requests_Report_${fromDate}_to_${toDate}.xlsx`);
            toast.success("Excel report exported successfully!");
        } catch (error) {
            console.error("Excel export error:", error);
            toast.error("An error occurred during Excel export.");
        } finally {
            setIsExportingExcel(false);
        }
    };

    // EXPORT PDF FUNCTION
    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        try {
            const res = await getTransactionReportData({
                from: fromDate,
                to: toDate,
                category,
                status,
                search,
                exportAll: true
            });

            if (!res.success || !res.transactions) {
                toast.error("Failed to load export data.");
                return;
            }

            const doc = new jsPDF();
            
            // LGU Header Design
            doc.setFillColor(37, 99, 235); // Blue Accent
            doc.rect(0, 0, 210, 40, "F");
            
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("MUNICIPALITY OF MAPANDAN", 15, 18);
            
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("Province of Pangasinan, Philippines", 15, 24);
            doc.text(`Daily Requests Report: ${fromDate} to ${toDate}`, 15, 30);

            // Summary Stats Cards in PDF
            doc.setFillColor(248, 250, 252);
            doc.rect(15, 45, 180, 25, "F");
            
            doc.setTextColor(15, 23, 42);
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.text("SUMMARY STATISTICS", 20, 52);
            
            doc.setFont("helvetica", "normal");
            doc.text(`Total Submissions: ${stats.total}`, 20, 60);
            doc.text(`Completed (Released): ${stats.released}`, 80, 60);
            doc.text(`Pending (Evaluation): ${stats.pending}`, 140, 60);
            
            doc.text(`Rejected Requests: ${stats.rejected}`, 20, 66);
            doc.text(`Total Collections: PHP ${stats.revenue.toLocaleString()}`, 80, 66);

            // Table Data Compilation
            const headers = [["Date", "Transaction ID", "Resident Name", "Service Type", "Status", "Amount"]];
            const body = res.transactions.map((tx: any) => [
                format(new Date(tx.createdAt), "yyyy-MM-dd"),
                tx.id.substring(0, 8) + "...",
                tx.user?.name || "N/A",
                tx.type?.name || "N/A",
                getStatusLabel(tx.status),
                `PHP ${(tx.payment && tx.payment.status === "PAID" ? tx.payment.amount : 0).toLocaleString()}`
            ]);

            autoTable(doc, {
                startY: 75,
                head: headers,
                body: body,
                theme: "striped",
                headStyles: { fillColor: [37, 99, 235], fontSize: 9, fontStyle: "bold" },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 45 },
                    3: { cellWidth: 45 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 20 }
                }
            });

            // Save PDF Document
            doc.save(`Daily_Requests_Report_${fromDate}_to_${toDate}.pdf`);
            toast.success("PDF report exported successfully!");
        } catch (error) {
            console.error("PDF export error:", error);
            toast.error("An error occurred during PDF export.");
        } finally {
            setIsExportingPdf(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header & Back Button */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#2a3040]">
                <div className="space-y-2">
                    <Link 
                        href="/admin/dashboard" 
                        className="flex items-center gap-2 text-xs font-black uppercase italic tracking-widest text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
                        Daily Requests <span className="text-blue-600 dark:text-blue-500">Report</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium italic">
                        Generate official audit logs, exports, and breakdowns of municipal kiosk & online requests.
                    </p>
                </div>

                {/* Export Buttons Dropdown / Action row */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExportExcel}
                        disabled={isExportingExcel || isPending}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {isExportingExcel ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileSpreadsheet className="w-4 h-4" />
                        )}
                        <span>Excel Export</span>
                    </button>

                    <button
                        onClick={handleExportPdf}
                        disabled={isExportingPdf || isPending}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase italic tracking-wider shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        {isExportingPdf ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                        <span>PDF Report</span>
                    </button>
                </div>
            </div>

            {/* Quick KPI Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Total Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Eye className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Total Requests</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.total.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Pending Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Pending</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.pending.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Released Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Released</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.released.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Rejected Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Rejected</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.rejected.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Revenue Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <span className="text-lg font-black text-blue-600">₱</span>
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Revenue</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">₱{stats.revenue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Filters Dashboard Card */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2rem] p-6 shadow-md space-y-6">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        {/* Date From */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer [color-scheme:light|dark]"
                            />
                        </div>

                        <span className="text-slate-400 text-xs font-bold">to</span>

                        {/* Date To */}
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer [color-scheme:light|dark]"
                            />
                        </div>

                        {/* Category Dropdown */}
                        <div className="relative w-full sm:w-[150px]">
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
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
                        </div>

                        {/* Status Dropdown */}
                        <div className="relative w-full sm:w-[150px]">
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="FOR_REQUESTING">For Requesting</option>
                                <option value="FOR_INSPECTION">For Inspection</option>
                                <option value="FOR_REVISION">For Revision</option>
                                <option value="FOR_PROCESSING">In Processing</option>
                                <option value="RELEASED">Released</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                    </div>

                    {/* Search Field */}
                    <form onSubmit={handleSearchSubmit} className="relative w-full lg:w-[280px]">
                        <input
                            type="text"
                            placeholder="Search Name or Ref ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-bold rounded-xl outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400"
                        />
                        <button type="submit" className="absolute inset-y-0 left-3 flex items-center">
                            <Search className="w-4 h-4 text-slate-400" />
                        </button>
                    </form>
                </div>

                {/* Table Data View */}
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-[#2a3040]">
                    <table className="w-full border-collapse text-left text-xs text-slate-500 dark:text-slate-400">
                        <thead className="bg-slate-50 dark:bg-[#1e2330] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-widest text-[9px]">
                            <tr>
                                <th className="px-6 py-4">Date Requested</th>
                                <th className="px-6 py-4">Transaction ID</th>
                                <th className="px-6 py-4">Resident Name</th>
                                <th className="px-6 py-4">Service Type</th>
                                <th className="px-6 py-4">Barangay</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#2a3040] bg-white dark:bg-[#151b2b]">
                            {isPending ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                                            <span className="font-bold italic">Loading report data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center font-bold italic text-slate-400">
                                        No transaction logs found matching the filters.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((tx) => {
                                    const amountPaid = tx.payment && tx.payment.status === "PAID" ? tx.payment.amount : 0;
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm")}
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-slate-400">
                                                {tx.id.toUpperCase()}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">
                                                {tx.user?.name || "A Resident"}
                                            </td>
                                            <td className="px-6 py-4 font-medium italic text-slate-700 dark:text-slate-300">
                                                {tx.type?.name || "Certificate"}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">
                                                {tx.user?.residentProfile?.barangay || "N/A"}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase italic ${getStatusStyles(tx.status)}`}>
                                                    {getStatusLabel(tx.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                                                ₱{amountPaid.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                            Showing page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span> ({totalCount} total logs)
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => fetchReportData(currentPage - 1)}
                                disabled={currentPage === 1 || isPending}
                                className="p-2 border border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </button>
                            <button
                                onClick={() => fetchReportData(currentPage + 1)}
                                disabled={currentPage === totalPages || isPending}
                                className="p-2 border border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                            >
                                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
