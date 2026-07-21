"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import { format } from "date-fns";
import {
    Search, Calendar, Folder, FileSpreadsheet, FileText,
    ArrowLeft, ChevronLeft, ChevronRight, Loader2,
    CheckCircle, Clock, AlertTriangle, Eye, MapPin, RefreshCcw
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

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
    initialBarangay?: string;
    barangays?: string[];
    session?: any;
}

export function DailyRequestsReportClient({
    initialData,
    categories,
    initialFrom,
    initialTo,
    initialCategory = "ALL",
    initialStatus = "ALL",
    initialSearch = "",
    initialBarangay = "ALL",
    barangays = [],
    session,
    themeColor = "#2563eb"
}: DailyRequestsReportClientProps) {
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
    const [isExportingExcel, setIsExportingExcel] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);

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

                const res = await fetch(`/api/admin/reports/daily-requests?${queryParams.toString()}`, {
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

    // Refetch when filters change (debounce or trigger directly on select update)
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

    // Track page and limit in a ref to avoid recreation of SSE subscription
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

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    };

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
            const queryParams = new URLSearchParams({
                from: fromDate,
                to: toDate,
                category,
                status,
                search,
                barangay,
                exportAll: "true"
            });

            const response = await fetch(`/api/admin/reports/daily-requests?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error("Export failed");
            }
            const res = await response.json();

            if (!res.success || !res.transactions) {
                toast.error("Failed to load export data.");
                return;
            }

            // Fetch theme color for header styling
            let themeColor = "2563EB";
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    themeColor = (data.themeColor || "#2563EB").replace("#", "");
                }
            } catch { /* use default */ }

            const fileRangeLabel = `${fromDate}_to_${toDate}`;
            const rangeLabel = `${format(new Date(fromDate), "MMMM d, yyyy")} to ${format(new Date(toDate), "MMMM d, yyyy")}`;

            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Treasury Portal";
            workbook.created = new Date();

            const sheet = workbook.addWorksheet("Daily Requests", {
                pageSetup: { orientation: "landscape", fitToPage: true },
            });

            // Column definitions
            sheet.columns = [
                { header: "#",                       key: "no",       width: 6  },
                { header: "Date Requested",          key: "date",     width: 22 },
                { header: "Transaction ID",          key: "id",       width: 28 },
                { header: "Resident Name",           key: "name",     width: 32 },
                { header: "Service Type",            key: "type",     width: 30 },
                { header: "Barangay",                key: "barangay", width: 16 },
                { header: "Status",                  key: "status",   width: 16 },
                { header: "Amount Paid (PHP)",       key: "amount",   width: 20 },
            ];

            // Style the header row (row 1)
            const headerRow = sheet.getRow(1);
            headerRow.height = 22;
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: `FF${themeColor.toUpperCase()}` },
                };
                cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10, name: "Calibri" };
                cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
                cell.border = {
                    top:    { style: "thin", color: { argb: "FFFFFFFF" } },
                    left:   { style: "thin", color: { argb: "FFFFFFFF" } },
                    bottom: { style: "thin", color: { argb: "FFFFFFFF" } },
                    right:  { style: "thin", color: { argb: "FFFFFFFF" } },
                };
            });

            const borderThin: Partial<ExcelJS.Border> = { style: "medium", color: { argb: "FFB0B0B0" } };
            const fullBorder = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };

            res.transactions.forEach((tx: any, idx: number) => {
                const dateStr = format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm");
                const name = tx.user?.name || "A Resident";
                const amount = (tx.payment && tx.payment.status === "PAID") ? tx.payment.amount : 0;

                const row = sheet.addRow({
                    no:     idx + 1,
                    date:   dateStr,
                    id:     tx.id,
                    name:   name,
                    type:   tx.type?.name || "N/A",
                    barangay: tx.user?.residentProfile?.barangay || "N/A",
                    status: getStatusLabel(tx.status),
                    amount: amount,
                });

                row.height = 16;

                const isAlt = idx % 2 === 1;
                row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: isAlt ? "FFF5F7FA" : "FFFFFFFF" },
                    };
                    cell.border = fullBorder;
                    cell.font = { name: "Calibri", size: 9 };
                    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };

                    if (colNum === 1) { // #
                        cell.font = { ...cell.font, color: { argb: "FF888888" } };
                    }
                    if (colNum === 3) { // ID
                        cell.alignment = { ...cell.alignment, horizontal: "left" };
                    }
                    if (colNum === 4 || colNum === 5) { // Name, Type
                        cell.alignment = { ...cell.alignment, horizontal: "left" };
                    }
                    if (colNum === 7) { // Status
                        const s = String(cell.value);
                        if (s === "Released")         cell.font = { ...cell.font, bold: true, color: { argb: "FF15803D" } };
                        else if (["For Requesting", "For Inspection", "For Revision", "In Processing"].includes(s)) {
                            cell.font = { ...cell.font, bold: true, color: { argb: "FFA16207" } };
                        } else if (s === "Rejected")  cell.font = { ...cell.font, bold: true, color: { argb: "FFB91C1C" } };
                    }
                    if (colNum === 8) { // Amount Paid
                        cell.numFmt = '#,##0.00';
                        cell.alignment = { ...cell.alignment, horizontal: "right" };
                        cell.font = { ...cell.font, bold: true };
                    }
                });
            });

            sheet.addRow([]); // Spacer
            const dateRangeRow = sheet.addRow(["", "Date Range:", rangeLabel]);
            dateRangeRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            dateRangeRow.getCell(3).font = { size: 9, name: "Calibri" };

            const totalRecordsRow = sheet.addRow(["", "Total Records:", res.transactions.length]);
            totalRecordsRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            totalRecordsRow.getCell(3).font = { bold: true, size: 9, name: "Calibri" };

            const totalAmountRow = sheet.addRow(["", "Total Collections (PHP):", stats.revenue]);
            totalAmountRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            totalAmountRow.getCell(3).numFmt = '#,##0.00';
            totalAmountRow.getCell(3).font = {
                bold: true, size: 11, name: "Calibri",
                color: { argb: `FF${themeColor.toUpperCase()}` },
            };
            totalAmountRow.getCell(3).border = {
                bottom: { style: "double", color: { argb: `FF${themeColor.toUpperCase()}` } },
            };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Daily_Requests_Report_${fileRangeLabel}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);

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
            const queryParams = new URLSearchParams({
                from: fromDate,
                to: toDate,
                category,
                status,
                search,
                barangay,
                exportAll: "true"
            });

            const response = await fetch(`/api/admin/reports/daily-requests?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error("Export failed");
            }
            const res = await response.json();

            if (!res.success || !res.transactions) {
                toast.error("Failed to load export data.");
                return;
            }

            // --- 1. Fetch branding ---
            let logoUrl = "";
            let brand1 = "MAPANDAN";
            let brand2 = "PORTAL";
            let themeColor = "#2563eb";
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    logoUrl = data.logoUrl || "";
                    brand1 = data.brand1 || "MAPANDAN";
                    brand2 = data.brand2 || "PORTAL";
                    themeColor = data.themeColor || "#2563eb";
                }
            } catch { /* use defaults */ }

            // --- 2. Parse hex → RGB ---
            const hexToRgb = (hex: string) => {
                const c = hex.replace("#", "");
                return {
                    r: parseInt(c.substring(0, 2), 16),
                    g: parseInt(c.substring(2, 4), 16),
                    b: parseInt(c.substring(4, 6), 16),
                };
            };
            const { r, g, b } = hexToRgb(themeColor);

            const rangeLabel = `${format(new Date(fromDate), "MMMM d, yyyy")} to ${format(new Date(toDate), "MMMM d, yyyy")}`;
            const fileRangeLabel = `${fromDate}_to_${toDate}`;

            // --- Landscape A4 ---
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const PAGE_W = doc.internal.pageSize.getWidth();   // 297mm
            const PAGE_H = doc.internal.pageSize.getHeight();  // 210mm
            const MARGIN = 14;

            let currentY = 10;

            // Logo centered
            if (logoUrl) {
                try {
                    const imgRes = await fetch(logoUrl);
                    const imgBlob = await imgRes.blob();
                    const imgDataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(imgBlob);
                    });
                    const ext = (logoUrl.split(".").pop()?.toUpperCase() || "PNG") as any;
                    doc.addImage(imgDataUrl, ext, PAGE_W / 2 - 8, currentY, 16, 16);
                    currentY += 19;
                } catch { currentY += 2; }
            }

            // Republic label
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(90, 90, 90);
            doc.text("Republic of the Philippines", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            // Brand name: brand2 only, theme color, centered
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(r, g, b);
            doc.text(brand2, PAGE_W / 2, currentY, { align: "center" });
            currentY += 4.5;

            // Office label
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            doc.text("Office of the Municipal Administrator", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            // Document title
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 20, 20);
            doc.text("DAILY REQUESTS REPORT — AUDIT & TRANSACTION LOGS", PAGE_W / 2, currentY, { align: "center" });
            currentY += 3.5;

            // Generated date right-aligned
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(130, 130, 130);
            doc.text(`Date Generated: ${format(new Date(), "MMMM d, yyyy hh:mm a")}`, PAGE_W - MARGIN, currentY, { align: "right" });

            // Double rule under header
            currentY += 1.5;
            doc.setDrawColor(20, 20, 20);
            doc.setLineWidth(0.8);
            doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY);
            currentY += 1;
            doc.setLineWidth(0.25);
            doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY);
            currentY += 3;

            const tableRows = res.transactions.map((tx: any, idx: number) => {
                const dateStr = format(new Date(tx.createdAt), "MMM d, yyyy");
                const timeStr = format(new Date(tx.createdAt), "hh:mm a");
                const name = tx.user?.name || "A Resident";
                const barangay = tx.user?.residentProfile?.barangay || "N/A";
                const amount = (tx.payment && tx.payment.status === "PAID") ? tx.payment.amount : 0;
                return [
                    String(idx + 1),
                    `${dateStr} ${timeStr}`,
                    tx.id.toUpperCase(),
                    name,
                    tx.type?.name || "N/A",
                    barangay,
                    getStatusLabel(tx.status),
                    `PHP ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                ];
            });

            autoTable(doc, {
                startY: currentY,
                theme: "grid",
                head: [["#", "Date Requested", "Transaction ID", "Resident Name", "Service Type", "Barangay", "Status", "Amount Paid"]],
                body: tableRows,
                styles: {
                    fontSize: 6.5,
                    font: "courier",
                    cellPadding: { top: 2, right: 2.5, bottom: 2, left: 2.5 },
                    overflow: "linebreak",
                    textColor: [20, 20, 20],
                    lineColor: [180, 180, 180],
                    lineWidth: 0.2,
                    valign: "middle",
                },
                headStyles: {
                    fillColor: [r, g, b],
                    textColor: [255, 255, 255],
                    font: "helvetica",
                    fontStyle: "bold",
                    fontSize: 7,
                    halign: "center",
                    lineColor: [r, g, b],
                    lineWidth: 0.25,
                    valign: "middle",
                    minCellHeight: 8,
                },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                columnStyles: {
                    0: { cellWidth: 8,  halign: "center", textColor: [120, 120, 120] },  // #
                    1: { cellWidth: 28, halign: "center" },                               // Date
                    2: { cellWidth: 42, fontStyle: "bold", halign: "left" },              // ID
                    3: { cellWidth: 46, halign: "left" },                                 // Resident Name
                    4: { cellWidth: 42, halign: "left" },                                 // Service Type
                    5: { cellWidth: 24, halign: "center" },                               // Barangay
                    6: { cellWidth: 24, halign: "center" },                               // Status
                    7: { cellWidth: "auto" as any, halign: "right", fontStyle: "bold" },  // Amount
                },
                willDrawCell: (data) => {
                    if (data.section === "body" && data.column.index === 6) {
                        const statusVal = String(data.cell.text[0]);
                        if (statusVal === "Released") data.cell.styles.textColor = [21, 128, 61];
                        else if (["For Requesting", "For Inspection", "For Revision", "In Processing"].includes(statusVal)) {
                            data.cell.styles.textColor = [161, 98, 7];
                        } else if (statusVal === "Rejected") data.cell.styles.textColor = [185, 28, 28];
                        data.cell.styles.fontStyle = "bold";
                    }
                },
                margin: { left: MARGIN, right: MARGIN, top: MARGIN },
            });

            let summaryY = (doc as any).lastAutoTable.finalY;
            summaryY += 5;

            // Left side: Date Range
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Date Range:", MARGIN, summaryY);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 20, 20);
            doc.text(rangeLabel, MARGIN + 20, summaryY);

            // Right side: Total Records + Total Amount (stacked)
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Total Records:", PAGE_W - MARGIN - 100, summaryY);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 20, 20);
            doc.text(String(res.transactions.length), PAGE_W - MARGIN - 55, summaryY, { align: "right" });

            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Total Collections (Paid):", PAGE_W - MARGIN - 100, summaryY + 5);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(r, g, b);
            doc.text(
                `PHP ${stats.revenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                PAGE_W - MARGIN,
                summaryY + 5,
                { align: "right" }
            );

            // Underline below Total Amount
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.4);
            doc.line(PAGE_W - MARGIN - 55, summaryY + 7, PAGE_W - MARGIN, summaryY + 7);

            // --- Certification + Signatures ---
            const certY = summaryY + 16;
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(70, 70, 70);
            doc.text(
                "I hereby certify that the above requests and transactions are true and correct based on municipal system logs.",
                MARGIN,
                certY
            );

            const sigY = certY + 10;
            doc.setDrawColor(60, 60, 60);
            doc.setLineWidth(0.3);
            doc.line(MARGIN, sigY, MARGIN + 55, sigY);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(90, 90, 90);
            doc.text("Prepared by / Document Processor", MARGIN, sigY + 3.5);

            doc.line(PAGE_W - MARGIN - 55, sigY, PAGE_W - MARGIN, sigY);
            doc.text("Noted by / Municipal Administrator", PAGE_W - MARGIN - 55, sigY + 3.5);

            // --- Header/Footer on every page ---
            const pageCount = (doc.internal as any).getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setDrawColor(20, 20, 20);
                doc.setLineWidth(0.5);
                doc.line(MARGIN, PAGE_H - 10, PAGE_W - MARGIN, PAGE_H - 10);
                doc.setLineWidth(0.15);
                doc.line(MARGIN, PAGE_H - 9.3, PAGE_W - MARGIN, PAGE_H - 9.3);

                doc.setFontSize(6);
                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(`${brand1} ${brand2} — Daily Requests Report`, MARGIN, PAGE_H - 6);

                doc.setFont("helvetica", "italic");
                doc.setTextColor(130, 130, 130);
                doc.text("This document is for official audit use only.", PAGE_W / 2, PAGE_H - 6, { align: "center" });

                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: "right" });
            }

            doc.save(`Daily_Requests_Report_${fileRangeLabel}.pdf`);
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
                        Daily Requests <span style={{ color: themeColor }}>Report</span>
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
                {/* Top Row: Filters */}
                <div className="flex flex-wrap items-center gap-4 w-full">
                    {/* Date From */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl w-full sm:w-[190px]">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer [color-scheme:light|dark] w-full"
                        />
                    </div>

                    <span className="text-slate-400 text-xs font-bold shrink-0">to</span>

                    {/* Date To */}
                    <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-xl w-full sm:w-[190px]">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer [color-scheme:light|dark] w-full"
                        />
                    </div>

                    {/* Category Dropdown */}
                    <div className="relative w-full sm:w-[190px]">
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
                    <div className="relative w-full sm:w-[190px]">
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="FOR_REQUESTING">For Requesting</option>
                            <option value="FOR_INSPECTION">For Inspection</option>
                            <option value="FOR_REVISION">For Revision</option>
                            <option value="FOR_PROCESSING">In Processing</option>
                            <option value="RELEASED">Released</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                            <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                    </div>

                    {/* Barangay Dropdown (only visible to LGU Admin) */}
                    {!(session?.user?.role === "BARANGAY_ADMIN") && (
                        <div className="relative w-full sm:w-[190px]">
                            <select
                                value={barangay}
                                onChange={(e) => setBarangay(e.target.value)}
                                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase italic tracking-wider rounded-xl outline-none cursor-pointer appearance-none text-slate-700 dark:text-slate-200"
                            >
                                <option value="ALL">All Barangays</option>
                                {barangays.map((b) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                        </div>
                    )}

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        className="h-10 w-10 rounded-xl flex items-center justify-center border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1e2330] hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-slate-600 dark:text-slate-300 disabled:opacity-40 cursor-pointer shrink-0"
                        disabled={isPending}
                        title="Refresh data"
                    >
                        <RefreshCcw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Bottom Row: Search Bar */}
                <div className="w-full pt-2 flex justify-end">
                    <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-[320px] lg:w-[360px]">
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
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs text-slate-500 dark:text-slate-400">
                        <thead className="bg-slate-50 dark:bg-[#1e2330] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-widest text-[9px]">
                            <tr>
                                <th className="px-6 py-4 w-12 text-center">#</th>
                                <th className="px-6 py-4">Date Requested</th>
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
                                transactions.map((tx, index) => {
                                    const amountPaid = tx.payment && tx.payment.status === "PAID" ? tx.payment.amount : 0;
                                    const rowNumber = (currentPage - 1) * 10 + index + 1;
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-center font-bold text-slate-400">
                                                {rowNumber}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {format(new Date(tx.createdAt), "yyyy-MM-dd HH:mm")}
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

                {/* Pagination & Limit Selection Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-[#2a3040]">
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Showing page <span className="font-bold">{currentPage}</span> of <span className="font-bold">{totalPages}</span> ({totalCount} total logs)
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        {/* Page Limit Dropdown Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-bold">Show:</span>
                            <div className="relative">
                                <select
                                    value={limit}
                                    onChange={(e) => handleLimitChange(Number(e.target.value))}
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

                        {/* Prev / Next Buttons */}
                        {totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => fetchReportData(currentPage - 1, limit)}
                                    disabled={currentPage === 1 || isPending}
                                    className="p-2 border border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
                                >
                                    <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                </button>
                                <button
                                    onClick={() => fetchReportData(currentPage + 1, limit)}
                                    disabled={currentPage === totalPages || isPending}
                                    className="p-2 border border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
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
