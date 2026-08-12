"use client";

import React, { useState } from "react";
import { useCollections } from "./CollectionsProvider";
import { DollarSign, CheckCircle2, Search, Calendar, X, FileText, FileSpreadsheet, Loader2, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

export function CollectionsHeader() {
    const {
        collections,
        stalls,
        themeColor,
        search,
        setSearch,
        paymentMethodFilter,
        setPaymentMethodFilter,
        statusFilter,
        setStatusFilter,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        isLoading,
        setIsLoading,
    } = useCollections();

    const router = useRouter();

    // Local search state for immediate UI feedback + 400ms debounce
    const [searchInput, setSearchInput] = useState(search);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    const handleRefresh = () => {
        setIsLoading(true);
        toast.info("Refreshing collections data...");
        router.refresh();
        setTimeout(() => {
            setIsLoading(false);
        }, 600);
    };

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchInput, setSearch]);

    // Compute active filtered dataset for exports & stat cards
    const filteredExportData = collections.filter((item) => {
        const s = search.trim().toLowerCase();
        const matchesSearch =
            !s ||
            item.ticketNumber.toLowerCase().includes(s) ||
            item.stall.stallNumber.toLowerCase().includes(s) ||
            item.stall.stallType.name.toLowerCase().includes(s) ||
            (item.vendor?.name && item.vendor.name.toLowerCase().includes(s)) ||
            (item.collector?.name && item.collector.name.toLowerCase().includes(s)) ||
            (item.collector?.email && item.collector.email.toLowerCase().includes(s)) ||
            item.paymentMethod.toLowerCase().includes(s) ||
            item.status.toLowerCase().includes(s);

        const matchesMethod =
            paymentMethodFilter === "ALL" || item.paymentMethod === paymentMethodFilter;

        const matchesStatus =
            statusFilter === "ALL" || item.status === statusFilter;

        const matchesDateRange = (() => {
            if (!startDate && !endDate) return true;
            const cDate = new Date(item.collectedDate);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (cDate < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (cDate > end) return false;
            }
            return true;
        })();

        return matchesSearch && matchesMethod && matchesStatus && matchesDateRange;
    });

    // Calculate metrics based on active filters
    const totalRevenueFiltered = filteredExportData
        .filter((c) => c.status === "PAID" || c.status === "PARTIAL")
        .reduce((acc, curr) => acc + curr.totalAmountPaid, 0);

    const totalPaidStallsFiltered = new Set(
        filteredExportData
            .filter((c) => c.status === "PAID" || c.status === "PARTIAL")
            .map((c) => c.stallId)
    ).size;

    const totalOccupiedStalls = stalls.length;

    const hasActiveFilters = Boolean(startDate || endDate || searchInput || paymentMethodFilter !== "ALL" || statusFilter !== "ALL");

    // ====================================================
    // EXPORT PDF FUNCTION (Municipal Audit Standard)
    // ====================================================
    const handleExportPdf = async () => {
        if (filteredExportData.length === 0) {
            toast.error("No data available to export.");
            return;
        }

        setIsExportingPdf(true);
        toast.loading("Generating PDF Collection Ledger...", { id: "pdf-export" });

        try {
            // 1. Fetch municipal branding & settings
            let logoUrl = "";
            let brand1 = "MAPANDAN";
            let brand2 = "SMART MUNICIPALITY";
            let activeThemeColor = themeColor || "#2563eb";
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    logoUrl = data.logoUrl || "";
                    brand1 = data.brand1 || "MAPANDAN";
                    brand2 = data.brand2 || "SMART MUNICIPALITY";
                    activeThemeColor = data.themeColor || activeThemeColor;
                }
            } catch { /* fallback to defaults */ }

            // Parse hex -> RGB
            const hexToRgb = (hex: string) => {
                const c = hex.replace("#", "");
                return {
                    r: parseInt(c.substring(0, 2), 16) || 37,
                    g: parseInt(c.substring(2, 4), 16) || 99,
                    b: parseInt(c.substring(4, 6), 16) || 235,
                };
            };
            const { r, g, b } = hexToRgb(activeThemeColor);

            const rangeLabel = startDate && endDate
                ? `${format(new Date(startDate), "MMMM d, yyyy")} to ${format(new Date(endDate), "MMMM d, yyyy")}`
                : `All Records as of ${format(new Date(), "MMMM d, yyyy")}`;
            const fileRangeLabel = startDate && endDate
                ? `${format(new Date(startDate), "MMM-dd-yyyy")}_to_${format(new Date(endDate), "MMM-dd-yyyy")}`
                : `All_Records_${format(new Date(), "MMM-dd-yyyy")}`;

            // 2. Setup Landscape A4 Document
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const PAGE_W = doc.internal.pageSize.getWidth();   // 297mm
            const PAGE_H = doc.internal.pageSize.getHeight();  // 210mm
            const MARGIN = 14;

            let currentY = 10;

            // Centered Municipal Logo
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

            // Republic Label
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(90, 90, 90);
            doc.text("Republic of the Philippines", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            // Brand Header
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(r, g, b);
            doc.text(`${brand1} ${brand2}`, PAGE_W / 2, currentY, { align: "center" });
            currentY += 4.5;

            // Office Header
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(50, 50, 50);
            doc.text("Office of the Municipal Treasurer · Market Stall Collection Division", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            // Document Title
            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 20, 20);
            doc.text("STATEMENT OF DAILY MARKET STALL COLLECTIONS — TICKET LEDGER", PAGE_W / 2, currentY, { align: "center" });
            currentY += 3.5;

            // Generated date right-aligned
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(130, 130, 130);
            doc.text(`Date Generated: ${format(new Date(), "MMMM d, yyyy hh:mm a")}`, PAGE_W - MARGIN, currentY, { align: "right" });

            // Double border rule under header
            currentY += 1.5;
            doc.setDrawColor(20, 20, 20);
            doc.setLineWidth(0.8);
            doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY);
            currentY += 1;
            doc.setLineWidth(0.25);
            doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY);
            currentY += 4;

            // 3. Table Rows
            const tableRows = filteredExportData.map((item, idx) => {
                const dateStr = format(new Date(item.collectedDate), "MMM d, yyyy");
                const vendorName = item.vendor?.name || "Anonymous";
                const collectorName = item.collector?.name || item.collector?.email || "Collector";
                const stallInfo = `Stall ${item.stall.stallNumber} (${item.stall.stallType.name})`;

                return [
                    String(idx + 1),
                    item.ticketNumber,
                    dateStr,
                    stallInfo,
                    vendorName,
                    collectorName,
                    `PHP ${item.baseAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                    `PHP ${item.otherFeesPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                    `PHP ${item.overdueFeePaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                    `PHP ${item.totalAmountPaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                    item.paymentMethod,
                    item.status,
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head: [["#", "Ticket #", "Date", "Stall & Section", "Vendor Occupant", "Collector", "Base Fee", "Other Fees", "Penalty", "Total Amount", "Method", "Status"]],
                body: tableRows,
                theme: "grid",
                styles: { fontSize: 6, cellPadding: 1.5, font: "helvetica", lineColor: [180, 180, 180], lineWidth: 0.15 },
                headStyles: { fillColor: [r, g, b], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
                columnStyles: {
                    0: { cellWidth: 7, halign: "center", fontStyle: "bold" },
                    1: { cellWidth: 26, halign: "left", fontStyle: "bold" },
                    2: { cellWidth: 20, halign: "center" },
                    3: { cellWidth: 38, halign: "left" },
                    4: { cellWidth: 35, halign: "left" },
                    5: { cellWidth: 30, halign: "left" },
                    6: { cellWidth: 20, halign: "right" },
                    7: { cellWidth: 20, halign: "right" },
                    8: { cellWidth: 18, halign: "right" },
                    9: { cellWidth: 26, halign: "right", fontStyle: "bold" },
                    10: { cellWidth: 16, halign: "center" },
                    11: { cellWidth: 14, halign: "center" },
                },
                margin: { left: MARGIN, right: MARGIN, top: MARGIN },
            });

            // 4. Financial Totals & Signatures
            const summaryY = (doc as any).lastAutoTable.finalY + 5;
            const totalRevenue = filteredExportData.reduce((acc, curr) => acc + curr.totalAmountPaid, 0);

            // Left side: Date Range
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Date Range:", MARGIN, summaryY);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 20, 20);
            doc.text(rangeLabel, MARGIN + 18, summaryY);

            // Right side: Total Records + Total Revenue
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Total Collections Count:", PAGE_W - MARGIN - 90, summaryY);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(20, 20, 20);
            doc.text(String(filteredExportData.length), PAGE_W - MARGIN - 45, summaryY, { align: "right" });

            doc.setFontSize(6.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            doc.text("Total Revenue Collected:", PAGE_W - MARGIN - 90, summaryY + 5);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(r, g, b);
            doc.text(
                `PHP ${totalRevenue.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
                PAGE_W - MARGIN,
                summaryY + 5,
                { align: "right" }
            );

            // Underline under total revenue
            doc.setDrawColor(r, g, b);
            doc.setLineWidth(0.4);
            doc.line(PAGE_W - MARGIN - 45, summaryY + 7, PAGE_W - MARGIN, summaryY + 7);

            // Audit Certification
            const certY = summaryY + 16;
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(70, 70, 70);
            doc.text(
                "I hereby certify that the above daily stall ticket collections and revenue records are true and correct based on municipal system logs.",
                MARGIN,
                certY
            );

            // Signatures
            const sigY = certY + 10;
            doc.setDrawColor(60, 60, 60);
            doc.setLineWidth(0.3);
            doc.line(MARGIN, sigY, MARGIN + 55, sigY);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(90, 90, 90);
            doc.text("Prepared by / Treasury Ticket Collector", MARGIN, sigY + 3.5);

            doc.line(PAGE_W - MARGIN - 55, sigY, PAGE_W - MARGIN, sigY);
            doc.text("Noted by / Municipal Treasurer", PAGE_W - MARGIN - 55, sigY + 3.5);

            // Page Footers on every page
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
                doc.text(`${brand1} ${brand2} — Market Stall Collection Ledger`, MARGIN, PAGE_H - 6);

                doc.setFont("helvetica", "italic");
                doc.setTextColor(130, 130, 130);
                doc.text("This document is for official audit use only.", PAGE_W / 2, PAGE_H - 6, { align: "center" });

                doc.setFont("helvetica", "normal");
                doc.setTextColor(80, 80, 80);
                doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: "right" });
            }

            doc.save(`Stall_Collections_${fileRangeLabel}.pdf`);
            toast.success(`PDF exported with ${filteredExportData.length} collection record(s)!`, { id: "pdf-export" });
        } catch (err: any) {
            console.error("PDF Export error:", err);
            toast.error("Failed to generate PDF report.", { id: "pdf-export" });
        } finally {
            setIsExportingPdf(false);
        }
    };

    // ====================================================
    // EXPORT EXCEL FUNCTION (ExcelJS Audit Standard)
    // ====================================================
    const handleExportExcel = async () => {
        if (filteredExportData.length === 0) {
            toast.error("No data available to export.");
            return;
        }

        setIsExportingExcel(true);
        toast.loading("Generating Excel Collection Ledger...", { id: "excel-export" });

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Daily Ticket Collections");

            // Header Title Rows
            worksheet.addRow(["MUNICIPALITY OF MAPANDAN — OFFICE OF THE MUNICIPAL TREASURER"]);
            worksheet.addRow(["DAILY MARKET STALL TICKET COLLECTIONS LEDGER"]);
            worksheet.addRow([`Date Generated: ${format(new Date(), "MMMM d, yyyy hh:mm a")}`]);
            worksheet.addRow([]); // Blank spacer

            worksheet.mergeCells("A1:L1");
            worksheet.mergeCells("A2:L2");
            worksheet.mergeCells("A3:L3");

            worksheet.getCell("A1").font = { bold: true, size: 12 };
            worksheet.getCell("A2").font = { bold: true, size: 10, color: { argb: "FF2563EB" } };
            worksheet.getCell("A3").font = { italic: true, size: 9, color: { argb: "FF666666" } };

            // Column Headers
            const headers = [
                "#",
                "Ticket Number",
                "Collected Date",
                "Stall Number",
                "Section Name",
                "Vendor Name",
                "Collector Name",
                "Base Daily Fee (PHP)",
                "Other Fees (PHP)",
                "Overdue Penalty (PHP)",
                "Total Paid (PHP)",
                "Payment Method",
                "Status",
            ];

            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF2563EB" },
                };
                cell.alignment = { vertical: "middle", horizontal: "center" };
            });

            // Data Rows
            filteredExportData.forEach((item, idx) => {
                const row = worksheet.addRow([
                    idx + 1,
                    item.ticketNumber,
                    format(new Date(item.collectedDate), "yyyy-MM-dd HH:mm"),
                    item.stall.stallNumber,
                    item.stall.stallType.name,
                    item.vendor?.name || "Anonymous",
                    item.collector?.name || item.collector?.email || "Collector",
                    item.baseAmount,
                    item.otherFeesPaid,
                    item.overdueFeePaid,
                    item.totalAmountPaid,
                    item.paymentMethod,
                    item.status,
                ]);

                // Currency columns formatting
                row.getCell(8).numFmt = "₱#,##0.00";
                row.getCell(9).numFmt = "₱#,##0.00";
                row.getCell(10).numFmt = "₱#,##0.00";
                row.getCell(11).numFmt = "₱#,##0.00";
            });

            // Total Summary Row
            const totalRevenue = filteredExportData.reduce((acc, c) => acc + c.totalAmountPaid, 0);
            const totalBase = filteredExportData.reduce((acc, c) => acc + c.baseAmount, 0);
            const totalOther = filteredExportData.reduce((acc, c) => acc + c.otherFeesPaid, 0);
            const totalOverdue = filteredExportData.reduce((acc, c) => acc + c.overdueFeePaid, 0);

            const summaryRow = worksheet.addRow([
                "", "TOTALS", "", "", "", "", "",
                totalBase,
                totalOther,
                totalOverdue,
                totalRevenue,
                "", ""
            ]);
            summaryRow.font = { bold: true };
            summaryRow.getCell(8).numFmt = "₱#,##0.00";
            summaryRow.getCell(9).numFmt = "₱#,##0.00";
            summaryRow.getCell(10).numFmt = "₱#,##0.00";
            summaryRow.getCell(11).numFmt = "₱#,##0.00";

            // Set column widths
            worksheet.columns = [
                { width: 6 },   // #
                { width: 22 },  // Ticket Number
                { width: 18 },  // Collected Date
                { width: 15 },  // Stall Number
                { width: 25 },  // Section Name
                { width: 25 },  // Vendor Name
                { width: 25 },  // Collector Name
                { width: 20 },  // Base Daily Fee
                { width: 18 },  // Other Fees
                { width: 20 },  // Overdue Penalty
                { width: 20 },  // Total Paid
                { width: 16 },  // Payment Method
                { width: 14 },  // Status
            ];

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Stall_Collections_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);

            toast.success(`Excel exported with ${filteredExportData.length} collection record(s)!`, { id: "excel-export" });
        } catch (err: any) {
            console.error("Excel Export error:", err);
            toast.error("Failed to generate Excel report.", { id: "excel-export" });
        } finally {
            setIsExportingExcel(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Total Revenue */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-5 rounded-3xl shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <DollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total Revenue</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">₱{totalRevenueFiltered.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</h3>
                    </div>
                </div>

                {/* Paid Stalls Count */}
                <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-5 rounded-3xl shadow-lg flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Paid Stalls Count</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">{totalPaidStallsFiltered} <span className="text-xs text-slate-400 font-normal italic">/ {totalOccupiedStalls} stalls</span></h3>
                    </div>
                </div>
            </div>

            {/* Toolbar Filter */}
            <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] p-4 rounded-2xl shadow-md">
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search Ticket # or Stall #..."
                            className="pl-10 h-10 bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-medium"
                        />
                    </div>

                    {/* Start Date (From) */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] px-3 h-10 rounded-xl">
                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer [color-scheme:light_dark]"
                        />
                    </div>

                    {/* End Date (To) */}
                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] px-3 h-10 rounded-xl">
                        <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">To:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer [color-scheme:light_dark]"
                        />
                    </div>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setStartDate("");
                                setEndDate("");
                                setSearchInput("");
                                setSearch("");
                                setPaymentMethodFilter("ALL");
                                setStatusFilter("ALL");
                            }}
                            className="h-10 px-3 rounded-xl text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold flex items-center gap-1 cursor-pointer"
                        >
                            <X className="w-3.5 h-3.5" /> Clear Filters
                        </Button>
                    )}
                </div>

                {/* Filters & Export Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
                    {/* Payment Method Select */}
                    <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                        <SelectTrigger className="h-10 w-[140px] bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                            <SelectValue placeholder="All Methods" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                            <SelectItem value="ALL">All Methods</SelectItem>
                            <SelectItem value="CASH">CASH</SelectItem>
                            <SelectItem value="EPAYMENT">EPAYMENT</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Status Select */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-10 w-[140px] bg-slate-50 dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] rounded-xl text-xs font-bold">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="PAID">PAID</SelectItem>
                            <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                            <SelectItem value="PENDING">PENDING</SelectItem>
                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Export PDF */}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isExportingPdf || filteredExportData.length === 0}
                        onClick={handleExportPdf}
                        className="h-10 px-3.5 text-xs font-bold rounded-xl border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                        <span>Export PDF</span>
                    </Button>

                    {/* Export Excel */}
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isExportingExcel || filteredExportData.length === 0}
                        onClick={handleExportExcel}
                        className="h-10 px-3.5 text-xs font-bold rounded-xl border-emerald-200 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                        {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                        <span>Export Excel</span>
                    </Button>

                    {/* Refresh Button */}
                    <Button
                        variant="outline"
                        size="icon"
                        disabled={isLoading}
                        onClick={handleRefresh}
                        className="h-10 w-10 rounded-xl border-slate-200 dark:border-[#2a3040] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer shadow-sm"
                        title="Refresh Collections Data"
                    >
                        <RotateCcw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-500" : ""}`} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
