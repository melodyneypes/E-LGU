"use client";

import React, { useState } from "react";
import { getTickets, getViolatorHistory, processMultipleTicketsSettlement } from "@/app/admin/poso/actions";
import { getSystemSettingAction } from "@/app/admin/transactions/actions";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ShieldAlert,
    Search,
    RefreshCw,
    X,
    FileSpreadsheet,
    FileText,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    History,
    AlertTriangle,
    Truck,
    ExternalLink,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface TicketItem {
    id: string;
    ticketNo: string;
    violatorName: string;
    licenseNo: string | null;
    plateNo: string | null;
    location: string | null;
    latitude?: number | null;
    longitude?: number | null;
    dateTime: Date;
    officerName: string | null;
    totalAmount: number;
    status: string;
    isPaid: boolean;
    createdAt: Date;
    transactionId?: string | null;
    isImpounded?: boolean;
    impoundFee?: number;
    vehicleClass?: string | null;
}

export default function TicketsPage({
    initialTickets,
    initialTotalCount,
    initialPosoDueDays = 7,
    initialPenaltySettings = null,
}: {
    initialTickets: TicketItem[];
    initialTotalCount: number;
    initialPosoDueDays?: number;
    initialPenaltySettings?: any;
}) {
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [isPending, setIsPending] = useState(false);

    // Violator History Modal State
    const [historyData, setHistoryData] = useState<any | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [themeColor, setThemeColor] = useState<string | null>(null);
    const [posoDueDays, setPosoDueDays] = useState<number>(initialPosoDueDays);
    const [penaltySettings, setPenaltySettings] = useState<any>(initialPenaltySettings);

    React.useEffect(() => {
        getSystemSettingAction("theme_color").then((res) => {
            if (res.success && res.data) setThemeColor(res.data);
        });
    }, []);

    React.useEffect(() => {
        setTickets(initialTickets);
        setTotalCount(initialTotalCount);
        if (initialPosoDueDays) setPosoDueDays(initialPosoDueDays);
        if (initialPenaltySettings) setPenaltySettings(initialPenaltySettings);
    }, [initialTickets, initialTotalCount, initialPosoDueDays, initialPenaltySettings]);

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const fetchTickets = React.useCallback(async (p: number, s: string, st: string, from?: string, to?: string) => {
        setIsPending(true);
        try {
            const res = await getTickets({
                page: p,
                limit: pageSize,
                search: s,
                status: st,
                from: from !== undefined ? from : fromDate,
                to: to !== undefined ? to : toDate,
            });

            if (res.success && res.tickets) {
                setTickets(res.tickets);
                setTotalCount(res.totalCount || 0);
                if (res.posoDueDays) {
                    setPosoDueDays(res.posoDueDays);
                }
                if (res.penaltySettings) {
                    setPenaltySettings(res.penaltySettings);
                }
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load tickets.");
        } finally {
            setIsPending(false);
        }
    }, [pageSize, fromDate, toDate]);

    const searchTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    React.useEffect(() => {
        return () => {
            if (searchTimerRef.current) {
                clearTimeout(searchTimerRef.current);
            }
        };
    }, []);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        setPage(1);

        if (searchTimerRef.current) {
            clearTimeout(searchTimerRef.current);
        }

        searchTimerRef.current = setTimeout(() => {
            fetchTickets(1, val, statusFilter, fromDate, toDate);
        }, 400);
    };

    const handleStatusChange = (val: string) => {
        setStatusFilter(val);
        setPage(1);
        fetchTickets(1, search, val, fromDate, toDate);
    };

    const handleFromDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setFromDate(val);
        setPage(1);
        fetchTickets(1, search, statusFilter, val, toDate);
    };

    const handleToDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setToDate(val);
        setPage(1);
        fetchTickets(1, search, statusFilter, fromDate, val);
    };

    const handleResetFilters = () => {
        setSearch("");
        setStatusFilter("All");
        setFromDate("");
        setToDate("");
        setPage(1);
        fetchTickets(1, "", "All", "", "");
    };

    const isFilterActive = search !== "" || statusFilter !== "All" || fromDate !== "" || toDate !== "";

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchTickets(newPage, search, statusFilter, fromDate, toDate);
    };

    // Batch Pay Selection State
    const [selectedTicketIds, setSelectedTicketIds] = useState<string[]>([]);
    const [batchPaying, setBatchPaying] = useState(false);

    const handleViewHistory = async (licenseNo?: string | null, violatorName?: string | null) => {
        if (!licenseNo && !violatorName) return;
        setLoadingHistory(true);
        setSelectedTicketIds([]);
        try {
            const res = await getViolatorHistory({ licenseNo, violatorName });
            if (res.success) {
                setHistoryData(res);
                setIsHistoryModalOpen(true);
            } else {
                toast.error(res.error || "Failed to load violator history.");
            }
        } catch (err: any) {
            toast.error(err.message || "Error loading history.");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleToggleSelectTicket = (id: string) => {
        setSelectedTicketIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAllUnpaid = () => {
        if (!historyData?.tickets) return;
        const unpaidIds = historyData.tickets
            .filter((t: any) => !t.isPaid && !t.transactionId)
            .map((t: any) => t.id);
        if (selectedTicketIds.length === unpaidIds.length) {
            setSelectedTicketIds([]);
        } else {
            setSelectedTicketIds(unpaidIds);
        }
    };

    const handleBatchPay = async () => {
        if (selectedTicketIds.length === 0) return;
        setBatchPaying(true);
        try {
            const res = await processMultipleTicketsSettlement(selectedTicketIds);
            if (res.success) {
                toast.success(`Successfully created Treasury settlement transaction for ${res.count} ticket(s) (Total: ₱${res.grandTotal?.toLocaleString()})!`);
                setHistoryData((prev: any) => {
                    if (!prev) return prev;
                    const updatedTickets = prev.tickets.map((t: any) =>
                        selectedTicketIds.includes(t.id) ? { ...t, transactionId: res.transaction?.id } : t
                    );
                    return {
                        ...prev,
                        tickets: updatedTickets,
                    };
                });
                setSelectedTicketIds([]);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to process batch settlement transaction.");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to process batch settlement.");
        } finally {
            setBatchPaying(false);
        }
    };

    // Export Loading States
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    // Export helper for Option 3 Violation Summary
    const formatViolationSummary = (details?: { violationName: string; amount: number }[]) => {
        if (!details || details.length === 0) return "No specific violation listed";
        const count = details.length;
        const names = details.map((d) => d.violationName).join(", ");
        return `${count} Violation${count > 1 ? "s" : ""} (${names})`;
    };

    // --- LTO OVERDUE REPORT PDF EXPORT ---
    const handleExportLtoPdf = async () => {
        setIsExportingPdf(true);
        try {
            toast.loading("Generating LTO Transmittal PDF report...", { id: "lto-pdf" });
            const res = await getTickets({
                search,
                status: statusFilter,
                from: fromDate,
                to: toDate,
                exportAll: true,
            });

            if (!res.success || !res.tickets || res.tickets.length === 0) {
                toast.error("No ticket records found for the selected filters.", { id: "lto-pdf" });
                setIsExportingPdf(false);
                return;
            }

            const exportTickets: (TicketItem & { details?: { violationName: string; amount: number }[] })[] = res.tickets;

            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            // Branding fetch
            let logoUrl = "";
            const brand1 = "MUNICIPALITY OF MAPANDAN";
            const brand2 = "PUBLIC ORDER & SAFETY OFFICE (POSO)";
            try {
                const sRes = await fetch("/api/settings");
                if (sRes.ok) {
                    const sData = await sRes.json();
                    if (sData.logoUrl) logoUrl = sData.logoUrl;
                }
            } catch { /* defaults */ }

            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const PAGE_W = doc.internal.pageSize.getWidth();
            const MARGIN = 14;
            let currentY = 12;

            if (logoUrl) {
                try {
                    const imgRes = await fetch(logoUrl);
                    const imgBlob = await imgRes.blob();
                    const imgDataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(imgBlob);
                    });
                    doc.addImage(imgDataUrl, "PNG", PAGE_W / 2 - 8, currentY, 16, 16);
                    currentY += 18;
                } catch { currentY += 2; }
            }

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text("REPUBLIC OF THE PHILIPPINES | PROVINCE OF PANGASINAN", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text(brand1.toUpperCase(), PAGE_W / 2, currentY, { align: "center" });
            currentY += 4.5;

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(225, 29, 72); // Rose-600
            doc.text(brand2.toUpperCase(), PAGE_W / 2, currentY, { align: "center" });
            currentY += 5;

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("LTO TRANSMITTAL REPORT - OVERDUE CITATION TICKETS", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            const dateStr = fromDate && toDate
                ? `Filter Period: ${fromDate} to ${toDate}`
                : `Generated Date: ${new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}`;
            const statusStr = statusFilter !== "All" ? ` | Status: ${statusFilter}` : "";

            doc.setFontSize(8);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 116, 139);
            doc.text(`${dateStr}${statusStr} | Total Items: ${exportTickets.length}`, PAGE_W / 2, currentY, { align: "center" });
            currentY += 6;

            // Table Columns
            const tableHeaders = [
                ["#", "Ticket No.", "Apprehended", "Violator Name", "Driver License", "Plate / Vehicle", "Violations Summary (Option 3)", "Amount", "Status"]
            ];

            const tableRows = exportTickets.map((t, idx) => {
                const appDate = new Date(t.dateTime || t.createdAt);
                const itemDueDate = new Date(appDate.getTime() + posoDueDays * 24 * 60 * 60 * 1000);
                const diffMs = new Date().getTime() - itemDueDate.getTime();
                const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const isOverdue = !t.isPaid && t.status !== "SETTLED" && t.status !== "PAID" && diffMs > 0;
                const totalAmt = Number(t.totalAmount || 0);

                const statusDisplay = t.status === "SETTLED"
                    ? "SETTLED"
                    : t.isPaid || t.status === "PAID"
                    ? "PAID"
                    : isOverdue
                    ? `OVERDUE\n(${overdueDays} DAY${overdueDays > 1 ? "S" : ""})`
                    : "UNPAID";

                return [
                    (idx + 1).toString(),
                    t.ticketNo,
                    appDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
                    t.violatorName.toUpperCase(),
                    t.licenseNo || "N/A",
                    t.plateNo || "N/A",
                    formatViolationSummary(t.details),
                    `PHP ${totalAmt.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                    statusDisplay
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head: tableHeaders,
                body: tableRows,
                margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN },
                styles: { fontSize: 7.5, cellPadding: 2.5 },
                headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: "bold" },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { cellWidth: 8, halign: "center" },
                    1: { cellWidth: 24, fontStyle: "bold" },
                    2: { cellWidth: 24 },
                    3: { cellWidth: 38, fontStyle: "bold" },
                    4: { cellWidth: 28 },
                    5: { cellWidth: 24 },
                    6: { cellWidth: 64 },
                    7: { cellWidth: 26, halign: "right" },
                    8: { cellWidth: 33, halign: "center", fontStyle: "normal" }
                }
            });

            const pdfBlobUrl = doc.output("bloburl");
            window.open(pdfBlobUrl, "_blank");
            toast.success("LTO Transmittal PDF report opened in new tab!", { id: "lto-pdf" });
        } catch (err: any) {
            toast.error(err.message || "Failed to generate PDF.", { id: "lto-pdf" });
        } finally {
            setIsExportingPdf(false);
        }
    };

    // --- LTO OVERDUE REPORT EXCEL EXPORT ---
    const handleExportLtoExcel = async () => {
        setIsExportingExcel(true);
        try {
            toast.loading("Generating LTO Transmittal Excel file...", { id: "lto-excel" });
            const res = await getTickets({
                search,
                status: statusFilter,
                from: fromDate,
                to: toDate,
                exportAll: true,
            });

            if (!res.success || !res.tickets || res.tickets.length === 0) {
                toast.error("No ticket records found for the selected filters.", { id: "lto-excel" });
                setIsExportingExcel(false);
                return;
            }

            const exportTickets: (TicketItem & { details?: { violationName: string; amount: number }[] })[] = res.tickets;

            const ExcelJS = await import("exceljs");
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "POSO System";
            workbook.created = new Date();

            const sheet = workbook.addWorksheet("LTO Overdue Report", {
                pageSetup: { orientation: "landscape", fitToPage: true }
            });

            // Title Block
            sheet.mergeCells("A1:I1");
            sheet.getCell("A1").value = "REPUBLIC OF THE PHILIPPINES - MUNICIPALITY OF MAPANDAN";
            sheet.getCell("A1").font = { bold: true, size: 10, color: { argb: "FF475569" } };
            sheet.getCell("A1").alignment = { horizontal: "center" };

            sheet.mergeCells("A2:I2");
            sheet.getCell("A2").value = "PUBLIC ORDER & SAFETY OFFICE (POSO) - LTO TRANSMITTAL REPORT";
            sheet.getCell("A2").font = { bold: true, size: 13, color: { argb: "FFE11D48" } };
            sheet.getCell("A2").alignment = { horizontal: "center" };

            sheet.mergeCells("A3:I3");
            const rangeText = fromDate && toDate ? `Period: ${fromDate} to ${toDate}` : `Generated: ${new Date().toLocaleDateString()}`;
            sheet.getCell("A3").value = `${rangeText} | Total Citation Tickets: ${exportTickets.length}`;
            sheet.getCell("A3").font = { italic: true, size: 9, color: { argb: "FF64748B" } };
            sheet.getCell("A3").alignment = { horizontal: "center" };

            sheet.addRow([]); // empty row

            // Headers
            const headerRow = sheet.addRow([
                "#",
                "Ticket No.",
                "Date Apprehended",
                "Violator Full Name",
                "Driver License No.",
                "Plate / Vehicle No.",
                "Violations Summary (Option 3)",
                "Total Amount (PHP)",
                "Citation Status"
            ]);

            headerRow.eachCell((cell) => {
                cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFE11D48" } // Rose background
                };
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });

            sheet.columns = [
                { width: 6 },   // #
                { width: 18 },  // Ticket No
                { width: 18 },  // Date
                { width: 28 },  // Name
                { width: 22 },  // License
                { width: 18 },  // Plate
                { width: 50 },  // Violations Option 3 Summary
                { width: 20 },  // Amount
                { width: 20 },  // Status
            ];

            exportTickets.forEach((t, idx) => {
                const appDate = new Date(t.dateTime || t.createdAt);
                const itemDueDate = new Date(appDate.getTime() + posoDueDays * 24 * 60 * 60 * 1000);
                const diffMs = new Date().getTime() - itemDueDate.getTime();
                const overdueDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                const isOverdue = !t.isPaid && t.status !== "SETTLED" && t.status !== "PAID" && diffMs > 0;
                const totalAmt = Number(t.totalAmount || 0);
                const statusDisplay = t.status === "SETTLED"
                    ? "SETTLED"
                    : t.isPaid || t.status === "PAID"
                    ? "PAID"
                    : isOverdue
                    ? `OVERDUE (${overdueDays} DAY${overdueDays > 1 ? "S" : ""})`
                    : "UNPAID";

                const row = sheet.addRow([
                    idx + 1,
                    t.ticketNo,
                    appDate.toLocaleDateString("en-PH"),
                    t.violatorName.toUpperCase(),
                    t.licenseNo || "N/A",
                    t.plateNo || "N/A",
                    formatViolationSummary(t.details),
                    totalAmt,
                    statusDisplay
                ]);

                // Cell styling
                row.getCell(8).numFmt = '"₱"#,##0.00';
                row.getCell(8).alignment = { horizontal: "right" };
                row.getCell(9).alignment = { horizontal: "center" };
                if (isOverdue) {
                    row.getCell(9).font = { bold: true, color: { argb: "FFE11D48" } };
                }
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `LTO_Overdue_Report_${fromDate || "all"}_to_${toDate || "all"}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success("LTO Transmittal Excel exported successfully!", { id: "lto-excel" });
        } catch (err: any) {
            toast.error(err.message || "Failed to export Excel.", { id: "lto-excel" });
        } finally {
            setIsExportingExcel(false);
        }
    };

    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return (
        <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center">
                        <ShieldAlert className="mr-3 w-10 h-10 text-rose-600" />
                        POSO Citation Tickets & Violations Ledger
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Real-time tracking of traffic apprehensions, violator citation tickets, and treasury payment status.
                    </p>
                </div>

                {/* Export LTO Overdue Transmittal Buttons - Only visible when statusFilter is OVERDUE */}
                {statusFilter === "OVERDUE" && (
                    <div className="flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                        <Button
                            onClick={handleExportLtoExcel}
                            disabled={isExportingExcel || isPending}
                            className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            {isExportingExcel ? "Exporting Excel..." : "LTO Report (Excel)"}
                        </Button>
                        <Button
                            onClick={handleExportLtoPdf}
                            disabled={isExportingPdf || isPending}
                            className="h-11 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-600/20 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <FileText className="w-4 h-4" />
                            {isExportingPdf ? "Generating PDF..." : "LTO Transmittal (PDF)"}
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Table Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-white/5 relative">
                {/* Search & Filter Bar */}
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-[#2a3040]">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-600 transition-colors w-4 h-4" />
                        <Input
                            placeholder="Search ticket no, violator name, license, plate no..."
                            value={search}
                            onChange={handleSearchChange}
                            className="pl-10 h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] focus:ring-2 focus:ring-rose-500/20 font-medium italic"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Filter */}
                        <Select value={statusFilter} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[190px] h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-xs">
                                <SelectValue placeholder="Status Filter" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Statuses</SelectItem>
                                <SelectItem value="UNPAID">UNPAID CITATIONS</SelectItem>
                                <SelectItem value="OVERDUE">OVERDUE CITATIONS</SelectItem>
                                <SelectItem value="PAID">PAID CITATIONS</SelectItem>
                                <SelectItem value="SETTLED">RESOLVED / SETTLED</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Date Range Inputs */}
                        <div className="flex items-center gap-2 h-11 bg-slate-50 dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3040] rounded-2xl px-4 shadow-sm">
                            <input
                                type="date"
                                value={fromDate}
                                onChange={handleFromDateChange}
                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                                title="From Date"
                            />
                            <span className="text-xs text-slate-400 font-bold px-0.5">-</span>
                            <input
                                type="date"
                                value={toDate}
                                onChange={handleToDateChange}
                                className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                                title="To Date"
                            />
                        </div>

                        {/* Reset Filters Button */}
                        {isFilterActive && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-11 px-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-xs"
                                title="Reset Filters"
                            >
                                <RotateCcw className="w-4 h-4 mr-1.5" />
                                Reset
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                                <TableHead className="w-[140px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                    Ticket No.
                                </TableHead>
                                <TableHead className="w-[150px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Date Apprehended
                                </TableHead>
                                <TableHead className="w-[220px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Violator Details
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Plate / Vehicle
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Enforcer Officer
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Total Amount
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Payment Status
                                </TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isPending ? (
                                Array.from({ length: 5 }).map((_, idx) => (
                                    <TableRow key={idx} className="border-b border-slate-200 dark:border-[#2a3040] animate-pulse">
                                        <TableCell className="pl-8 py-5">
                                            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1">
                                                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                                <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-lg"></div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="h-5 w-14 bg-slate-200 dark:bg-slate-800 rounded-full mx-auto"></div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl ml-auto"></div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <FileSpreadsheet className="w-12 h-12 mb-3 stroke-[1.5]" />
                                            <p className="font-bold text-slate-700 dark:text-slate-300">
                                                No Citation Tickets Found
                                            </p>
                                            <p className="text-xs mt-1">
                                                Tickets issued via POSO Mobile App or Admin will appear here in real-time.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((item) => {
                                    const appDate = new Date(item.dateTime || item.createdAt);
                                    const itemDueDate = new Date(appDate.getTime() + posoDueDays * 24 * 60 * 60 * 1000);
                                    const diffMs = new Date().getTime() - itemDueDate.getTime();
                                    const overdueDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
                                    const isOverdue = !item.isPaid && item.status !== "SETTLED" && item.status !== "PAID" && diffMs > 0;

                                    return (
                                        <TableRow
                                            key={item.id}
                                            onClick={() => router.push(`/admin/poso/tickets/${item.id}`)}
                                            className="group hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors border-b border-slate-200 dark:border-[#2a3040] cursor-pointer"
                                        >
                                            <TableCell className="pl-8 py-5 font-black text-xs text-rose-600 dark:text-rose-400 italic uppercase">
                                                {item.ticketNo}
                                            </TableCell>

                                            <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                                <div>
                                                    {appDate.toLocaleDateString("en-PH", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric"
                                                    })}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    Due: {itemDueDate.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-col space-y-1">
                                                    <span className="text-sm font-black dark:text-white uppercase italic tracking-tight leading-tight">
                                                        {item.violatorName}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-slate-500 italic">
                                                            License: {item.licenseNo || "N/A"}
                                                        </span>
                                                        <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900/50">
                                                            {((item as any).details?.length || 1)} {((item as any).details?.length || 1) === 1 ? "Violation" : "Violations"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                                <div>{item.plateNo || "N/A"}</div>
                                                {item.isImpounded && (
                                                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase">
                                                        Impounded
                                                    </span>
                                                )}
                                            </TableCell>

                                            <TableCell className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                                                {item.officerName || "POSO Enforcer"}
                                            </TableCell>

                                            <TableCell className="text-center">
                                                <div className="font-black text-sm text-rose-600 dark:text-rose-400 italic">
                                                    ₱ {Number(item.totalAmount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </div>
                                                {isOverdue && (() => {
                                                    const subtotal = Number(item.totalAmount || 0);
                                                    const surchargeRate = penaltySettings?.surchargeRate ?? 25;
                                                    const monthlyRate = penaltySettings?.monthlyInterestRate ?? 2;
                                                    const monthsOverdue = Math.max(1, Math.ceil(overdueDays / 30));
                                                    const surchargeAmt = (subtotal * surchargeRate) / 100;
                                                    const interestAmt = (subtotal * (monthlyRate / 100)) * monthsOverdue;
                                                    const totalPayable = subtotal + (item.isImpounded ? Number(item.impoundFee || 0) : 0) + surchargeAmt + interestAmt;

                                                    return (
                                                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5" title={`Includes ${surchargeRate}% Surcharge + ${monthlyRate}% Monthly Interest`}>
                                                            Total: ₱{totalPayable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                        </div>
                                                    );
                                                })()}
                                            </TableCell>

                                            <TableCell className="text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span
                                                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase italic w-fit ${
                                                            item.status === "SETTLED"
                                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400"
                                                                : item.isPaid || item.status === "PAID"
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                                : item.transactionId
                                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                                                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                                        }`}
                                                    >
                                                        {item.status === "SETTLED"
                                                            ? "SETTLED"
                                                            : item.isPaid || item.status === "PAID"
                                                            ? "PAID"
                                                            : item.transactionId
                                                            ? "PENDING TREASURY"
                                                            : "UNPAID"}
                                                    </span>
                                                    {isOverdue && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-rose-600 text-white font-black text-[9px] uppercase tracking-wider animate-pulse">
                                                            OVERDUE ({overdueDays} DAY{overdueDays > 1 ? "S" : ""})
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-right pr-8" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewHistory(item.licenseNo, item.violatorName)}
                                                        disabled={loadingHistory}
                                                        className="h-9 px-3 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 font-bold text-xs transition-all"
                                                    >
                                                        <History className="w-4 h-4 mr-1.5" />
                                                        History
                                                    </Button>
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
                <div className="p-6 border-t border-slate-200 dark:border-[#2a3040] flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500">
                        Showing {tickets.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                        {Math.min(page * pageSize, totalCount)} of {totalCount} tickets
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1 || isPending}
                            onClick={() => handlePageChange(page - 1)}
                            className="h-9 px-3 font-bold text-xs"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                        </Button>
                        <span className="text-xs font-black px-3 py-1 bg-slate-100 dark:bg-[#1a1f2e] rounded-lg">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages || isPending}
                            onClick={() => handlePageChange(page + 1)}
                            className="h-9 px-3 font-bold text-xs"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>



            {/* Violator History Modal */}
            <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogContent showCloseButton={false} className="sm:max-w-3xl p-0 overflow-hidden bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl max-h-[90vh] flex flex-col">
                    <div className="relative flex flex-col h-full overflow-hidden">
                        {/* Modal Header */}
                        <DialogHeader className="p-6 pb-4 border-b border-slate-200 dark:border-[#2a3040] bg-blue-50/50 dark:bg-blue-950/20 flex flex-row items-center justify-between shrink-0">
                            <div className="flex items-center space-x-3">
                                <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                                    <History className="w-6 h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Violator Record & Apprehension History
                                    </DialogTitle>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">
                                        Historical record of traffic citations issued to this driver.
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </DialogHeader>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            {historyData ? (
                                <>
                                    {/* Violator Overview Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-sm flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-slate-400">Total Citations</span>
                                            <span className="text-3xl font-black text-slate-900 dark:text-white mt-1">
                                                {historyData.totalCitations} <span className="text-xs text-slate-400 font-normal">record(s)</span>
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-sm flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-amber-500">Unpaid Tickets</span>
                                            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                                                {historyData.unpaidCount} <span className="text-xs text-slate-400 font-normal">ticket(s)</span>
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-sm flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-rose-500">Total Fines Accumulation</span>
                                            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                                                ₱ {(historyData.totalAmountFined || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-white dark:bg-[#151b2b] border border-amber-200/60 dark:border-amber-500/30 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm flex flex-col">
                                            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                                <Truck className="w-3.5 h-3.5 text-amber-600" /> Impound Yard Custody
                                            </span>
                                            <span className="text-2xl font-black text-amber-800 dark:text-amber-200 mt-1">
                                                {historyData.activeImpoundedCount || 0} <span className="text-xs text-slate-400 font-normal">held</span>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Habitual Offender Warning Banner */}
                                    {historyData.totalCitations >= 3 && (
                                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center space-x-3">
                                            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 animate-bounce" />
                                            <div>
                                                <h4 className="text-xs font-black uppercase tracking-wider text-rose-800 dark:text-rose-300">
                                                    Habitual Repeat Offender Notice
                                                </h4>
                                                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">
                                                    This violator has accumulated {historyData.totalCitations} or more citation records. Higher offense level fees (3rd offense rate) automatically apply.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timeline list of tickets */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                                Citation Tickets Timeline ({historyData.tickets.length})
                                            </h3>
                                            {historyData.tickets.some((t: any) => !t.isPaid && !t.transactionId) && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleSelectAllUnpaid}
                                                    style={themeColor ? { color: themeColor } : undefined}
                                                    className="h-8 text-xs font-bold text-blue-600 hover:opacity-80"
                                                >
                                                    {selectedTicketIds.length === historyData.tickets.filter((t: any) => !t.isPaid && !t.transactionId).length
                                                        ? "Deselect All Unpaid"
                                                        : "Select All Unpaid"}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {historyData.tickets.map((t: any, index: number) => {
                                                const isSelected = selectedTicketIds.includes(t.id);
                                                const ticketTotal = (t.totalAmount || 0) + (t.isImpounded ? Number(t.impoundFee || 0) : 0);
                                                const isSelectable = !t.isPaid && !t.transactionId;
                                                return (
                                                    <div
                                                        key={t.id}
                                                        className={`p-5 rounded-2xl bg-white dark:bg-[#151b2b] border space-y-3 shadow-sm transition-all ${
                                                            isSelected
                                                                ? "border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10"
                                                                : "border-slate-200 dark:border-[#2a3040] hover:border-slate-300 dark:hover:border-slate-700"
                                                        }`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#2a3040] pb-3">
                                                            <div className="flex items-center space-x-3">
                                                                {isSelectable && (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleSelectTicket(t.id);
                                                                        }}
                                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                                                                    />
                                                                )}
                                                                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#1a1f2e] text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs">
                                                                    #{historyData.tickets.length - index}
                                                                </span>
                                                                <div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setIsHistoryModalOpen(false);
                                                                            router.push(`/admin/poso/tickets/${t.id}`);
                                                                        }}
                                                                        className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight hover:underline flex items-center gap-1.5 group/btn text-left"
                                                                    >
                                                                        <span>{t.ticketNo}</span>
                                                                        <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover/btn:opacity-100 transition-opacity" />
                                                                    </button>
                                                                    <span className="text-xs text-slate-400 block font-medium">
                                                                        Apprehended by: {t.officerName || "POSO Officer"}
                                                                    </span>
                                                                    {!t.isPaid && t.transactionId && (
                                                                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                                                                            ⚠️ Pending in Treasury
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                                                    ₱{ticketTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                                </span>
                                                                <span
                                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase italic ${
                                                                        t.status === "SETTLED"
                                                                            ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400"
                                                                            : t.isPaid || t.status === "PAID"
                                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                                            : t.status === "DISMISSED" || t.status === "CANCELLED"
                                                                            ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                                                            : t.transactionId || t.status === "PENDING"
                                                                            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                                                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                                                    }`}
                                                                >
                                                                    {t.status === "SETTLED"
                                                                        ? "SETTLED"
                                                                        : t.isPaid || t.status === "PAID"
                                                                        ? "PAID"
                                                                        : t.status === "DISMISSED"
                                                                        ? "DISMISSED"
                                                                        : t.status === "CANCELLED"
                                                                        ? "CANCELLED"
                                                                        : t.transactionId || t.status === "PENDING"
                                                                        ? "PENDING IN TREASURY"
                                                                        : t.status || "UNPAID"}
                                                                </span>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setIsHistoryModalOpen(false);
                                                                        router.push(`/admin/poso/tickets/${t.id}`);
                                                                    }}
                                                                    className="h-8 px-2.5 text-[11px] font-bold rounded-lg border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
                                                                >
                                                                    <ExternalLink className="w-3 h-3 mr-1 text-slate-500" /> View Details
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {/* Impound Facility Banner */}
                                                        {t.isImpounded && (
                                                            <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-500/30 flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-200">
                                                                <div className="flex items-center gap-2">
                                                                    <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                                                                    <span>
                                                                        Impounded at: <strong>{t.impoundYard || "POSO Impounding Facility"}</strong> ({t.vehicleClass || "Class Standard"})
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <span className="font-bold text-amber-700 dark:text-amber-300">
                                                                        + ₱{Number(t.impoundFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} Impound Fee
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                                                        t.isReleased ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                                                                    }`}>
                                                                        {t.isReleased ? "Released" : "Held in Yard"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Violations List */}
                                                        <div className="space-y-1.5 pt-1">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                                Violations Charged:
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {(t.details || t.ticketDetails)?.map((d: any) => (
                                                                    <span
                                                                        key={d.id}
                                                                        className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#1a1f2e] text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                                                                    >
                                                                        <span>{d.violationName}</span>
                                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">
                                                                            Offense #{d.offenseLevel} (₱{d.amount})
                                                                        </span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Sticky Batch Pay Footer */}
                        {selectedTicketIds.length > 0 && (
                            <div className="p-4 bg-white dark:bg-[#0f1117] border-t border-slate-200 dark:border-[#2a3040] flex justify-between items-center z-50 shrink-0">
                                <div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                                        Selected <strong className="text-blue-600">{selectedTicketIds.length} unpaid ticket(s)</strong>
                                    </span>
                                    <span className="text-[11px] font-black text-rose-600 dark:text-rose-400">
                                        Combined Total Fine: ₱{historyData.tickets.filter((t: any) => selectedTicketIds.includes(t.id)).reduce((sum: number, t: any) => sum + (t.totalAmount || 0) + (t.isImpounded ? Number(t.impoundFee || 0) : 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <Button
                                    onClick={handleBatchPay}
                                    disabled={batchPaying}
                                    style={{ backgroundColor: themeColor || undefined }}
                                    className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:opacity-95 text-white rounded-xl shadow-lg flex items-center gap-2 transition-all"
                                >
                                    {batchPaying ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    <span>Send Selected to Payment</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
