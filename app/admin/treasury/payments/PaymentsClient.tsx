"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Copy, Check, RefreshCcw, DollarSign, CheckCircle2, CalendarIcon, X, FileDown, ChevronDown, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { getPaymentsLedger } from "./actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
        };
        user: {
            name: string | null;
            email: string;
        } | null;
    };
}

interface PaymentsClientProps {
    initialPayments: PaymentRecord[];
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

export default function PaymentsClient({ initialPayments }: PaymentsClientProps) {
    const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [methodFilter, setMethodFilter] = useState<string>("ALL");
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const router = useRouter();

    const handleRefresh = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await getPaymentsLedger("");
            if (res.success && res.data) {
                setPayments(res.data as any);
                if (!silent) {
                    toast.success("Payments list updated!");
                }
            } else {
                if (!silent) {
                    toast.error(res.error || "Failed to update payments.");
                }
            }
        } catch (err) {
            console.error(err);
            if (!silent) {
                toast.error("An unexpected error occurred.");
            }
        } finally {
            if (!silent) setLoading(false);
        }
    };

    // Real-time updates subscription using Server-Sent Events (SSE)
    useEffect(() => {
        const eventSource = new EventSource("/api/admin/treasury/payments/stream");

        eventSource.onmessage = (event) => {
            if (event.data === "refresh") {
                console.log("[PaymentsClient] SSE refresh event received, updating ledger...");
                handleRefresh(true);
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

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Reference number copied!");
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleExport = async () => {
        if (filteredPayments.length === 0) {
            toast.error("Walang data para i-export.");
            return;
        }

        toast.loading("Generating PDF report...", { id: "pdf-export" });

        try {
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

            // --- 3. Labels ---
            const rangeLabel = dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MMMM d, yyyy")} to ${format(dateRange.to, "MMMM d, yyyy")}`
                : `All Records as of ${format(new Date(), "MMMM d, yyyy")}`;
            const fileRangeLabel = dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MMM-dd-yyyy")}_to_${format(dateRange.to, "MMM-dd-yyyy")}`
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

            const tableRows = filteredPayments.map((p, idx) => {
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
                theme: "grid",
                head: [["#", "Reference No.", "OR No.", "Name of Payee", "Nature of Collection", "Payment Mode", "Amount Collected", "Status", "Date of Payment"]],
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
                    1: { cellWidth: 30, fontStyle: "bold", halign: "left" },              // Reference
                    2: { cellWidth: 20, halign: "center" },                               // OR No.
                    3: { cellWidth: 48, halign: "left" },                                 // Payee
                    4: { cellWidth: 40, halign: "left" },                                 // Nature
                    5: { cellWidth: 24, halign: "center" },                               // Mode
                    6: { cellWidth: 34, halign: "right", fontStyle: "bold" },             // Amount
                    7: { cellWidth: 18, halign: "center" },                               // Status
                    8: { cellWidth: "auto" as any, halign: "center" },                   // Date
                },
                willDrawCell: (data) => {
                    if (data.section === "body" && data.column.index === 7) {
                        const status = String(data.cell.text[0]);
                        if (status === "PAID") data.cell.styles.textColor = [21, 128, 61];
                        else if (status === "PENDING") data.cell.styles.textColor = [161, 98, 7];
                        else data.cell.styles.textColor = [185, 28, 28];
                        data.cell.styles.fontStyle = "bold";
                    }
                },
                margin: { left: MARGIN, right: MARGIN, top: MARGIN },
            });

            // ====================================================
            // SECTION C: SUMMARY BELOW TABLE
            // ====================================================

            const PAID = filteredPayments.filter(p => p.status === "PAID");
            const totalPaid = PAID.reduce((a, p) => a + p.amount, 0);
            let summaryY = (doc as any).lastAutoTable.finalY;

            // Thin rule right after table bottom border
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
            doc.text(String(filteredPayments.length), PAGE_W - MARGIN - 55, summaryY, { align: "right" });

            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Total Amount Collected:", PAGE_W - MARGIN - 100, summaryY + 5);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(r, g, b);
            doc.text(
                `PHP ${totalPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                PAGE_W - MARGIN,
                summaryY + 5,
                { align: "right" }
            );

            // Underline below Total Amount
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.4);
            doc.line(PAGE_W - MARGIN - 55, summaryY + 7, PAGE_W - MARGIN, summaryY + 7);

            // ====================================================
            // SECTION D: CERTIFICATION + SIGNATURE LINES
            // ====================================================

            const certY = summaryY + 16;
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(70, 70, 70);
            doc.text(
                "I hereby certify that the above records are true and correct based on official records of the Municipal Treasury Office.",
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
            doc.text("Prepared by / Treasury Officer", MARGIN, sigY + 3.5);

            doc.line(PAGE_W - MARGIN - 55, sigY, PAGE_W - MARGIN, sigY);
            doc.text("Noted by / Municipal Treasurer", PAGE_W - MARGIN - 55, sigY + 3.5);

            // ====================================================
            // SECTION E: FOOTER — every page
            // ====================================================

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
                doc.text(`${brand1} ${brand2} — Office of the Municipal Treasurer`, MARGIN, PAGE_H - 6);

                doc.setFont("helvetica", "italic");
                doc.setTextColor(130, 130, 130);
                doc.text("This document is for official use only.", PAGE_W / 2, PAGE_H - 6, { align: "center" });

                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: "right" });
            }

            // --- Save ---
            doc.save(`Treasury_Payments_${fileRangeLabel}.pdf`);
            toast.success(`PDF exported with ${filteredPayments.length} record(s)!`, { id: "pdf-export" });

        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF. Please try again.", { id: "pdf-export" });
        }
    };

    const handleExportExcel = async () => {
        if (filteredPayments.length === 0) {
            toast.error("Walang data para i-export.");
            return;
        }

        toast.loading("Generating Excel report...", { id: "excel-export" });

        try {
            // Fetch theme color for header styling
            let themeColor = "2563EB";
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    themeColor = (data.themeColor || "#2563EB").replace("#", "");
                }
            } catch { /* use default */ }

            const fileRangeLabel = dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MMM-dd-yyyy")}_to_${format(dateRange.to, "MMM-dd-yyyy")}`
                : `All_Records_${format(new Date(), "MMM-dd-yyyy")}`;
            const rangeLabel = dateRange?.from && dateRange?.to
                ? `${format(dateRange.from, "MMMM d, yyyy")} to ${format(dateRange.to, "MMMM d, yyyy")}`
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

            // ── Data rows ────────────────────────────────────────
            const PAID = filteredPayments.filter(p => p.status === "PAID");
            const totalPaid = PAID.reduce((a, p) => a + p.amount, 0);

            const borderThin: Partial<ExcelJS.Border> = { style: "medium", color: { argb: "FFB0B0B0" } };
            const fullBorder = { top: borderThin, left: borderThin, bottom: borderThin, right: borderThin };

            filteredPayments.forEach((p, idx) => {
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

            const totalRecordsRow = sheet.addRow(["", "Total Records:", filteredPayments.length]);
            totalRecordsRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            totalRecordsRow.getCell(3).font = { bold: true, size: 9, name: "Calibri" };

            const totalAmountRow = sheet.addRow(["", "Total Amount Collected (PHP):", totalPaid]);
            totalAmountRow.getCell(2).font = { bold: true, size: 9, name: "Calibri" };
            totalAmountRow.getCell(3).numFmt = '#,##0.00';
            totalAmountRow.getCell(3).font = {
                bold: true, size: 11, name: "Calibri",
                color: { argb: `FF${themeColor.toUpperCase()}` },
            };
            // Underline the total amount cell
            totalAmountRow.getCell(3).border = {
                bottom: { style: "double", color: { argb: `FF${themeColor.toUpperCase()}` } },
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

            toast.success(`Excel exported with ${filteredPayments.length} record(s)!`, { id: "excel-export" });

        } catch (err) {
            console.error(err);
            toast.error("Failed to generate Excel. Please try again.", { id: "excel-export" });
        }
    };

    const dateRangeLabel = useMemo(() => {
        if (dateRange?.from && dateRange?.to) {
            return `${format(dateRange.from, "MMM d, yyyy")} – ${format(dateRange.to, "MMM d, yyyy")}`;
        }
        if (dateRange?.from) {
            return `From ${format(dateRange.from, "MMM d, yyyy")}`;
        }
        return "Pick date range";
    }, [dateRange]);

    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            const citizenName = getRequesterName(payment);
            const businessName = payment.transaction?.businessName || "";
            const searchLower = search.toLowerCase();
            
            const matchesSearch = 
                payment.reference?.toLowerCase().includes(searchLower) ||
                payment.transactionId.toLowerCase().includes(searchLower) ||
                payment.id.toLowerCase().includes(searchLower) ||
                citizenName.toLowerCase().includes(searchLower) ||
                businessName.toLowerCase().includes(searchLower);

            const matchesMethod = methodFilter === "ALL" || payment.method === methodFilter;

            let matchesDate = true;
            if (dateRange?.from) {
                const payDate = new Date(payment.createdAt);
                // Normalize from to start of day
                const from = new Date(dateRange.from);
                from.setHours(0, 0, 0, 0);

                if (dateRange.to) {
                    // Normalize to to end of day
                    const to = new Date(dateRange.to);
                    to.setHours(23, 59, 59, 999);
                    matchesDate = payDate >= from && payDate <= to;
                } else {
                    // Only from date selected — show that single day
                    const fromEnd = new Date(from);
                    fromEnd.setHours(23, 59, 59, 999);
                    matchesDate = payDate >= from && payDate <= fromEnd;
                }
            }

            return matchesSearch && matchesMethod && matchesDate;
        });
    }, [payments, search, methodFilter, dateRange]);

    // Statistics calculations
    const stats = useMemo(() => {
        const totalPaid = filteredPayments
            .filter(p => p.status === "PAID")
            .reduce((acc, p) => acc + p.amount, 0);

        const paidCount = filteredPayments.filter(p => p.status === "PAID").length;

        return { totalPaid, paidCount };
    }, [filteredPayments]);

    const formatDateTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return {
            date: d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }),
            time: d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }),
        };
    };

    return (
        <div className="space-y-6">
            {/* Top Cards Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Collections */}
                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Total Paid Amount</span>
                        <p className="text-2xl font-black italic tracking-tighter text-slate-900 dark:text-white mt-1">
                            ₱{stats.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                        <DollarSign className="w-6 h-6" />
                    </div>
                </div>

                {/* Paid Transactions */}
                <div className="bg-white dark:bg-[#151b2b] p-6 rounded-2xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Paid Transactions</span>
                        <p className="text-2xl font-black italic tracking-tighter text-emerald-500 mt-1">
                            {stats.paidCount}
                        </p>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-[#151b2b] p-4 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-[350px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                        placeholder="Search ref no, transaction, citizen..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-blue-500 rounded-xl"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    {/* Method Filter */}
                    <Select value={methodFilter} onValueChange={setMethodFilter}>
                        <SelectTrigger className="h-11 w-40 rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]">
                            <SelectValue placeholder="Payment Method" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                            <SelectItem value="ALL">All Methods</SelectItem>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="E_PAYMENT">E-Payment</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                            <SelectItem value="CASH_ON_DELIVERY">COD</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Date Range Picker */}
                    <div className="flex items-center gap-1.5">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={`h-11 rounded-xl border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] font-normal justify-start text-left gap-2 min-w-[200px] ${
                                        !dateRange ? "text-slate-400" : "text-slate-900 dark:text-white"
                                    }`}
                                >
                                    <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                    <span className="text-xs truncate">{dateRangeLabel}</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] shadow-xl rounded-2xl overflow-hidden"
                                align="end"
                            >
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                    className="p-4"
                                />
                            </PopoverContent>
                        </Popover>
                        {dateRange && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDateRange(undefined)}
                                className="h-11 w-11 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                                title="Clear date filter"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                disabled={filteredPayments.length === 0}
                                className="h-11 rounded-xl gap-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                            >
                                <FileDown className="w-4 h-4" />
                                <span className="text-xs font-bold">Export Report</span>
                                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-xl shadow-xl p-1 min-w-[160px]"
                        >
                            <DropdownMenuItem
                                onClick={handleExport}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1a1f2e]"
                            >
                                <FileDown className="w-4 h-4 text-red-500" />
                                Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={handleExportExcel}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#1a1f2e]"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                                Export as Excel
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-[10px] uppercase tracking-wider animate-pulse shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Live
                    </div>

                    <Button
                        onClick={() => handleRefresh(false)}
                        variant="outline"
                        className="h-11 w-11 rounded-xl p-0 border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117]"
                        disabled={loading}
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e] border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow>
                            <TableHead className="font-bold py-4 pl-6 text-slate-700 dark:text-slate-300">Reference No.</TableHead>
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
                        {filteredPayments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center text-slate-500 dark:text-slate-400">
                                    No payment records found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredPayments.map((payment) => {
                                const formattedDate = formatDateTime(payment.createdAt);
                                const citizenName = getRequesterName(payment);
                                const serviceName = payment.transaction?.type?.name || "Service Payment";
                                const refDisplay = payment.reference || "N/A";
                                
                                return (
                                    <TableRow 
                                        key={payment.id} 
                                        onClick={() => router.push(`/admin/treasury/${payment.transactionId}`)}
                                        className="border-b border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e]/50 transition-colors cursor-pointer select-none"
                                    >
                                        <TableCell className="py-4 pl-6 font-mono text-xs font-bold text-slate-900 dark:text-white">
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
        </div>
    );
}
