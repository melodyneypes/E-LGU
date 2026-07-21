"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Search, Copy, Check, DollarSign, CalendarIcon, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2, ArrowLeft, FileText, RotateCcw, Folder } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

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
        type: {
            name: string;
            category?: string;
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
    if (snap.firstName || snap.lastName) {
        return `${snap.firstName || ""} ${snap.lastName || ""}`.trim();
    }
    return tx.user?.name || "Registered Resident";
}

export default function PaymentsClient({
    initialData,
    categories = [],
    themeColor = "#2563eb",
    initialFrom,
    initialTo,
    initialCategory = "ALL",
    initialMethod = "ALL",
    initialSearch = ""
}: PaymentsClientProps) {
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

    const fetchExportData = async (): Promise<PaymentRecord[]> => {
        const queryParams = new URLSearchParams({
            search,
            method: methodFilter,
            category: categoryFilter,
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

    // Real-time updates subscription using Server-Sent Events (SSE)
    useEffect(() => {
        const eventSource = new EventSource("/api/admin/treasury/payments/stream");

        eventSource.onmessage = (event) => {
            if (event.data === "refresh") {
                console.log("[PaymentsClient] SSE refresh event received, updating ledger...");
                fetchPaymentsData(currentPage, limit);
            }
        };

        eventSource.onerror = () => {
            console.warn("SSE stream connection lost or errored. Reconnecting...");
        };

        return () => {
            eventSource.close();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, limit]);

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Reference number copied!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    // EXPORT PDF FUNCTION
    const handleExport = async () => {
        setIsExportingPdf(true);
        try {
            const exportPayments = await fetchExportData();
            if (exportPayments.length === 0) {
                toast.error("Walang data para i-export.");
                setIsExportingPdf(false);
                return;
            }

            toast.loading("Generating PDF report...", { id: "pdf-export" });

            // --- 1. Fetch branding ---
            let logoUrl = "";
            let brand1 = "MAPANDAN";
            let brand2 = "PORTAL";
            let activeThemeColor = themeColor;
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    logoUrl = data.logoUrl || "";
                    brand1 = data.brand1 || "MAPANDAN";
                    brand2 = data.brand2 || "PORTAL";
                    activeThemeColor = data.themeColor || themeColor;
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
            const { r, g, b } = hexToRgb(activeThemeColor);

            // --- 3. Labels ---
            const rangeLabel = fromDate && toDate
                ? `${format(new Date(fromDate), "MMMM d, yyyy")} to ${format(new Date(toDate), "MMMM d, yyyy")}`
                : `All Records as of ${format(new Date(), "MMMM d, yyyy")}`;
            const fileRangeLabel = fromDate && toDate
                ? `${format(new Date(fromDate), "MMM-dd-yyyy")}_to_${format(new Date(toDate), "MMM-dd-yyyy")}`
                : `All_Records_${format(new Date(), "MMM-dd-yyyy")}`;

            // --- 4. Landscape A4 ---
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const PAGE_W = doc.internal.pageSize.getWidth();   // 297mm
            const PAGE_H = doc.internal.pageSize.getHeight();  // 210mm
            const MARGIN = 14;

            // ====================================================
            // SECTION A: COMPACT CENTERED GOVERNMENT HEADER
            // ====================================================

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
            doc.text("Office of the Municipal Treasurer", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            // Document title
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 20, 20);
            doc.text("STATEMENT OF COLLECTIONS — PAYMENTS LEDGER", PAGE_W / 2, currentY, { align: "center" });
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

            // ====================================================
            // SECTION B: TABLE (Excel-style grid with serial no.)
            // ====================================================

            const tableRows = exportPayments.map((p, idx) => {
                const name = getRequesterName(p);
                const business = p.transaction?.businessName ? ` / ${p.transaction.businessName}` : "";
                const date = new Date(p.createdAt).toLocaleDateString("en-PH", {
                    month: "short", day: "numeric", year: "numeric",
                });
                const time = new Date(p.createdAt).toLocaleTimeString("en-PH", {
                    hour: "numeric", minute: "2-digit", hour12: true,
                });
                return [
                    String(idx + 1),                        // # serial number
                    p.reference || "N/A",
                    p.orNumber || "—",
                    `${name}${business}`,
                    p.transaction?.type?.name || "Service Payment",
                    (p.method || "").replace(/_/g, " "),
                    `PHP ${p.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                    p.status,
                    `${date} ${time}`,
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head: [["#", "Reference No.", "OR Number", "Name of Payee", "Nature of Collection", "Payment Mode", "Amount Collected", "Status", "Date of Payment"]],
                body: tableRows,
                theme: "grid",
                styles: { fontSize: 6.5, cellPadding: 1.5, font: "helvetica", lineColor: [180, 180, 180], lineWidth: 0.15 },
                headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
                columnStyles: {
                    0: { cellWidth: 8, halign: "center", fontStyle: "bold" },
                    1: { cellWidth: 26, halign: "left" },
                    2: { cellWidth: 20, halign: "center" },
                    3: { cellWidth: 46, halign: "left" },
                    4: { cellWidth: 42, halign: "left" },
                    5: { cellWidth: 24, halign: "center" },
                    6: { cellWidth: 32, halign: "right", fontStyle: "bold" },
                    7: { cellWidth: 20, halign: "center" },
                    8: { cellWidth: "auto" as any, halign: "center" },
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
            doc.text(String(exportPayments.length), PAGE_W - MARGIN - 55, summaryY, { align: "right" });

            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Total Collections (Paid):", PAGE_W - MARGIN - 100, summaryY + 5);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(r, g, b);
            doc.text(
                `PHP ${stats.totalPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
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
                "I hereby certify that the above collections and transactions are true and correct based on municipal system logs.",
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
                doc.text(`${brand1} ${brand2} — Treasury Payments Ledger`, MARGIN, PAGE_H - 6);

                doc.setFont("helvetica", "italic");
                doc.setTextColor(130, 130, 130);
                doc.text("This document is for official audit use only.", PAGE_W / 2, PAGE_H - 6, { align: "center" });

                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: "right" });
            }

            doc.save(`Treasury_Payments_${fileRangeLabel}.pdf`);
            toast.success(`PDF exported with ${exportPayments.length} record(s)!`, { id: "pdf-export" });
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF. Please try again.", { id: "pdf-export" });
        } finally {
            setIsExportingPdf(false);
        }
    };

    // EXPORT EXCEL FUNCTION
    const handleExportExcel = async () => {
        setIsExportingExcel(true);
        try {
            const exportPayments = await fetchExportData();
            if (exportPayments.length === 0) {
                toast.error("Walang data para i-export.");
                setIsExportingExcel(false);
                return;
            }

            toast.loading("Generating Excel report...", { id: "excel-export" });

            // Fetch theme color for header styling
            let activeThemeColor = "2563EB";
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    activeThemeColor = (data.themeColor || "#2563EB").replace("#", "");
                }
            } catch { /* use default */ }

            const fileRangeLabel = fromDate && toDate
                ? `${format(new Date(fromDate), "MMM-dd-yyyy")}_to_${format(new Date(toDate), "MMM-dd-yyyy")}`
                : `All_Records_${format(new Date(), "MMM-dd-yyyy")}`;
            const rangeLabel = fromDate && toDate
                ? `${format(new Date(fromDate), "MMMM d, yyyy")} to ${format(new Date(toDate), "MMMM d, yyyy")}`
                : `All Records as of ${format(new Date(), "MMMM d, yyyy")}`;

            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Treasury Portal";
            workbook.created = new Date();

            const sheet = workbook.addWorksheet("Payments Ledger", {
                pageSetup: { orientation: "landscape", fitToPage: true },
            });

            // ── Column definitions ──────────────────────────────
            sheet.columns = [
                { header: "#",                       key: "no",       width: 6  },
                { header: "Reference No.",            key: "ref",      width: 24 },
                { header: "OR Number",                key: "or",       width: 16 },
                { header: "Name of Payee",            key: "payee",    width: 38 },
                { header: "Nature of Collection",     key: "nature",   width: 32 },
                { header: "Payment Mode",             key: "mode",     width: 18 },
                { header: "Amount Collected (PHP)",   key: "amount",   width: 24 },
                { header: "Status",                   key: "status",   width: 14 },
                { header: "Date of Payment",          key: "date",     width: 24 },
            ];

            // ── Style the header row (row 1) ─────────────────────
            const headerRow = sheet.getRow(1);
            headerRow.height = 22;
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: `FF${activeThemeColor.toUpperCase()}` },
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

            // ── Data rows ────────────────────────────────────────
            const PAID = exportPayments.filter(p => p.status === "PAID");
            const totalPaid = PAID.reduce((a, p) => a + p.amount, 0);

            const borderThin: Partial<ExcelJS.Border> = { style: "medium", color: { argb: "FFB0B0B0" } };
            const fullBorder = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };

            exportPayments.forEach((p, idx) => {
                const name = getRequesterName(p);
                const business = p.transaction?.businessName ? ` / ${p.transaction.businessName}` : "";
                const date = new Date(p.createdAt).toLocaleDateString("en-PH", {
                    month: "short", day: "numeric", year: "numeric",
                });
                const time = new Date(p.createdAt).toLocaleTimeString("en-PH", {
                    hour: "numeric", minute: "2-digit", hour12: true,
                });

                const row = sheet.addRow({
                    no:     idx + 1,
                    ref:    p.reference || "N/A",
                    or:     p.orNumber || "—",
                    payee:  `${name}${business}`,
                    nature: p.transaction?.type?.name || "Service Payment",
                    mode:   (p.method || "").replace(/_/g, " "),
                    amount: p.amount,                // numeric for SUM formulas
                    status: p.status,
                    date:   `${date} ${time}`,
                });

                row.height = 16;

                const isAlt = idx % 2 === 1;
                row.eachCell({ includeEmpty: true }, (cell, colNum) => {
                    // Alternating row fill
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: isAlt ? "FFF5F7FA" : "FFFFFFFF" },
                    };
                    cell.border = fullBorder;
                    cell.font = { name: "Calibri", size: 9 };
                    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };

                    // Column-specific overrides
                    if (colNum === 1) { // #
                        cell.alignment = { ...cell.alignment, horizontal: "center" };
                        cell.font = { ...cell.font, color: { argb: "FF888888" } };
                    }
                    if (colNum === 2) { // Reference
                        cell.font = { ...cell.font, bold: true };
                    }
                    if (colNum === 3) { // OR No.
                        cell.alignment = { ...cell.alignment, horizontal: "center" };
                    }
                    if (colNum === 7) { // Amount
                        cell.numFmt = '#,##0.00';
                        cell.alignment = { ...cell.alignment, horizontal: "right" };
                        cell.font = { ...cell.font, bold: true };
                    }
                    if (colNum === 8) { // Status
                        cell.alignment = { ...cell.alignment, horizontal: "center" };
                        const s = String(cell.value);
                        if (s === "PAID")         cell.font = { ...cell.font, bold: true, color: { argb: "FF15803D" } };
                        else if (s === "PENDING") cell.font = { ...cell.font, bold: true, color: { argb: "FFA16207" } };
                        else                       cell.font = { ...cell.font, bold: true, color: { argb: "FFB91C1C" } };
                    }
                    if (colNum === 9) { // Date
                        cell.alignment = { ...cell.alignment, horizontal: "center" };
                    }
                });
            });

            // ── Summary rows below table ──────────────────────────
            sheet.addRow([]);  // spacer

            const dateRangeRow = sheet.addRow(["", "Date Range:", rangeLabel]);
            dateRangeRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            dateRangeRow.getCell(3).font = { size: 9, name: "Calibri" };

            const totalRecordsRow = sheet.addRow(["", "Total Records:", exportPayments.length]);
            totalRecordsRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            totalRecordsRow.getCell(3).font = { bold: true, size: 9, name: "Calibri" };

            const totalAmountRow = sheet.addRow(["", "Total Amount Collected (PHP):", totalPaid]);
            totalAmountRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            totalAmountRow.getCell(3).numFmt = '#,##0.00';
            totalAmountRow.getCell(3).font = {
                bold: true, size: 11, name: "Calibri",
                color: { argb: `FF${activeThemeColor.toUpperCase()}` },
            };
            // Underline the total amount cell
            totalAmountRow.getCell(3).border = {
                bottom: { style: "double", color: { argb: `FF${activeThemeColor.toUpperCase()}` } },
            };

            // ── Write and download ────────────────────────────────
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Treasury_Payments_${fileRangeLabel}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success(`Excel exported with ${exportPayments.length} record(s)!`, { id: "excel-export" });

        } catch (err) {
            console.error(err);
            toast.error("Failed to generate Excel. Please try again.", { id: "excel-export" });
        } finally {
            setIsExportingExcel(false);
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

                {/* Export Buttons */}
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
                        onClick={handleExport}
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
                    <button
                        onClick={handleRefresh}
                        className="flex items-center justify-center p-2.5 bg-white dark:bg-[#1e2330] text-slate-500 hover:text-red-500 border border-slate-200 dark:border-[#2a3040] hover:border-red-500/30 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                        title="Reset Filters"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
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
