"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
    FileWarning, 
    ArrowLeft, 
    Printer, 
    Search, 
    Filter, 
    Clock, 
    Layers, 
    ShieldAlert,
    RefreshCw,
    CheckCircle2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    FileSpreadsheet,
    FileText,
    X
} from "lucide-react";
import { format, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAccountableFormIncidentsAction } from "@/app/admin/transactions/treasury-incident-actions";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

interface IncidentItem {
    id: string;
    action: string;
    entityName: string;
    description: string;
    transactionId: string | null;
    formType: string;
    incidentType: string;
    damagedSeriesNumber: string;
    replacedSeriesNumber: string;
    reasonDetails: string | null;
    counterName: string | null;
    reportedBy: string;
    reportedRole: string;
    createdAt: string | Date;
}

interface CurrentUserContext {
    name: string;
    email: string;
    role: string;
}

interface SystemSettingsContext {
    logoUrl: string | null;
    brandWord1: string;
    brandWord2: string;
    themeColor: string;
    treasurerName: string;
}

interface Props {
    initialIncidents: IncidentItem[];
    currentUser?: CurrentUserContext;
    settings?: SystemSettingsContext;
}

export default function AccountableFormsView({ initialIncidents, currentUser, settings }: Props) {
    const router = useRouter();
    const [incidents, setIncidents] = useState<IncidentItem[]>(initialIncidents);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
    
    // Explicit Start & End Date State
    const [startDate, setStartDate] = useState<string>("");
    const [endDate, setEndDate] = useState<string>("");
    
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingExcel, setIsExportingExcel] = useState(false);

    // Pagination States
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Refresh incidents on demand
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            const res = await getAccountableFormIncidentsAction();
            if (res.success && res.data) {
                setIncidents(res.data as any);
                toast.success("Incident records updated");
            } else {
                toast.error(res.error || "Failed to update incidents");
            }
        } catch (_e) {
            toast.error("Failed to refresh records");
        } finally {
            setIsRefreshing(false);
        }
    };

    // Quick Date Range Helpers
    const setQuickDateRange = (preset: "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "CLEAR") => {
        const now = new Date();
        if (preset === "TODAY") {
            const d = format(now, "yyyy-MM-dd");
            setStartDate(d);
            setEndDate(d);
        } else if (preset === "THIS_WEEK") {
            setStartDate(format(subDays(now, 7), "yyyy-MM-dd"));
            setEndDate(format(now, "yyyy-MM-dd"));
        } else if (preset === "THIS_MONTH") {
            setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
            setEndDate(format(endOfMonth(now), "yyyy-MM-dd"));
        } else {
            setStartDate("");
            setEndDate("");
        }
    };

    // Filtered Incidents
    const filteredIncidents = useMemo(() => {
        return incidents.filter(item => {
            const itemDate = new Date(item.createdAt);

            // 1. Text Search Filter
            const term = search.toLowerCase();
            const matchesSearch = 
                item.damagedSeriesNumber.toLowerCase().includes(term) ||
                item.replacedSeriesNumber.toLowerCase().includes(term) ||
                item.formType.toLowerCase().includes(term) ||
                item.reportedBy.toLowerCase().includes(term) ||
                (item.counterName && item.counterName.toLowerCase().includes(term)) ||
                (item.reasonDetails && item.reasonDetails.toLowerCase().includes(term));

            // 2. Incident Category Filter
            const matchesCategory = categoryFilter === "ALL" || item.incidentType === categoryFilter;

            // 3. Explicit Start & End Date Filter
            let matchesDate = true;
            if (startDate && endDate) {
                matchesDate = isWithinInterval(itemDate, {
                    start: startOfDay(new Date(startDate)),
                    end: endOfDay(new Date(endDate))
                });
            } else if (startDate) {
                matchesDate = itemDate >= startOfDay(new Date(startDate));
            } else if (endDate) {
                matchesDate = itemDate <= endOfDay(new Date(endDate));
            }

            return matchesSearch && matchesCategory && matchesDate;
        });
    }, [incidents, search, categoryFilter, startDate, endDate]);

    // Reset page to 1 whenever filters change
    React.useEffect(() => {
        setCurrentPage(1);
    }, [search, categoryFilter, startDate, endDate, pageSize]);

    // Paginated Sliced Incidents
    const totalPages = Math.max(1, Math.ceil(filteredIncidents.length / pageSize));
    const paginatedIncidents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredIncidents.slice(start, start + pageSize);
    }, [filteredIncidents, currentPage, pageSize]);

    // Helper for date range display string
    const rangeLabel = useMemo(() => {
        if (startDate && endDate) {
            return `${format(new Date(startDate), "MMM dd, yyyy")} to ${format(new Date(endDate), "MMM dd, yyyy")}`;
        }
        if (startDate) return `From ${format(new Date(startDate), "MMM dd, yyyy")}`;
        if (endDate) return `Until ${format(new Date(endDate), "MMM dd, yyyy")}`;
        return `All Records (Cumulative as of ${format(new Date(), "MMM dd, yyyy")})`;
    }, [startDate, endDate]);

    // KPI Metrics
    const stats = useMemo(() => {
        const total = incidents.length;
        const paperJams = incidents.filter(i => i.incidentType === "PAPER_JAM").length;
        const misfeeds = incidents.filter(i => i.incidentType === "PRINTER_MISFEED").length;
        const damagedLeaves = incidents.filter(i => i.incidentType === "DAMAGED_LEAF").length;
        const others = total - (paperJams + misfeeds + damagedLeaves);

        return { total, paperJams, misfeeds, damagedLeaves, others };
    }, [incidents]);

    // -------------------------------------------------------------
    // 📄 OFFICIAL COA MUNICIPAL PDF EXPORT (jsPDF + autoTable)
    // -------------------------------------------------------------
    const handleExportPDF = async () => {
        if (!filteredIncidents.length) {
            toast.error("No incident logs available to export.");
            return;
        }

        setIsExportingPdf(true);
        const toastId = toast.loading("Generating Official COA PDF Registry...");

        try {
            const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
            const PAGE_W = doc.internal.pageSize.getWidth();  // 297mm
            const PAGE_H = doc.internal.pageSize.getHeight(); // 210mm
            const MARGIN = 14;

            let currentY = 12;

            // Municipal Logo (if present)
            if (settings?.logoUrl) {
                try {
                    const imgRes = await fetch(settings.logoUrl);
                    const imgBlob = await imgRes.blob();
                    const imgDataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(imgBlob);
                    });
                    const ext = (settings.logoUrl.split(".").pop()?.toUpperCase() || "PNG") as any;
                    doc.addImage(imgDataUrl, ext, PAGE_W / 2 - 8, currentY, 16, 16);
                    currentY += 19;
                } catch {
                    currentY += 2;
                }
            }

            // Republic Letterhead
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(80, 80, 80);
            doc.text("Republic of the Philippines", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            const brandTitle = `${settings?.brandWord1 || "Municipality of"} ${settings?.brandWord2 || "Mapandan"}`.toUpperCase();
            doc.text(brandTitle, PAGE_W / 2, currentY, { align: "center" });
            currentY += 4.5;

            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text("Province of Pangasinan · Office of the Municipal Treasurer", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text("REGISTRY OF CANCELLED ACCOUNTABLE FORMS", PAGE_W / 2, currentY, { align: "center" });
            currentY += 3.5;

            doc.setFontSize(6.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(100, 116, 139);
            doc.text("Compliance with COA Circular No. 92-382 & RAAF Liquidation Standards", PAGE_W / 2, currentY, { align: "center" });
            currentY += 4;

            // Top Header Double Rule
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.7);
            doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY);
            currentY += 1;
            doc.setLineWidth(0.2);
            doc.line(MARGIN, currentY, PAGE_W - MARGIN, currentY);
            currentY += 4;

            // Audit Metadata Bar
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(71, 85, 105);
            doc.text(`Covered Period: ${rangeLabel}`, MARGIN, currentY);
            doc.text(`Generated By: ${currentUser?.name || "Treasury Staff"} (${format(new Date(), "MMMM d, yyyy · hh:mm a")})`, PAGE_W - MARGIN, currentY, { align: "right" });
            currentY += 4;

            // Table Data Mapping
            const tableRows = filteredIncidents.map((item, idx) => [
                idx + 1,
                format(new Date(item.createdAt), "yyyy-MM-dd HH:mm"),
                item.counterName || "Window 1",
                item.formType,
                item.incidentType.replace(/_/g, " "),
                item.damagedSeriesNumber,
                item.replacedSeriesNumber,
                item.reasonDetails || "No Remarks",
                item.reportedBy
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [["#", "Timestamp", "Counter", "Form Classification", "Incident Category", "Damaged Serial", "Replacement Serial", "Audit Remarks / Cause", "Reporting Officer"]],
                body: tableRows,
                theme: "grid",
                styles: { fontSize: 6.5, cellPadding: 2, font: "helvetica", lineColor: [203, 213, 225], lineWidth: 0.15 },
                headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
                columnStyles: {
                    0: { cellWidth: 8, halign: "center", fontStyle: "bold" },
                    1: { cellWidth: 26, halign: "center" },
                    2: { cellWidth: 22, halign: "center", fontStyle: "bold" },
                    3: { cellWidth: 34, halign: "left" },
                    4: { cellWidth: 28, halign: "center" },
                    5: { cellWidth: 32, halign: "center", fontStyle: "bold", textColor: [225, 29, 72] },
                    6: { cellWidth: 32, halign: "center", fontStyle: "bold", textColor: [16, 185, 129] },
                    7: { cellWidth: 50, halign: "left" },
                    8: { cellWidth: 37, halign: "left" },
                },
                margin: { left: MARGIN, right: MARGIN, top: MARGIN },
                didDrawPage: (data) => {
                    // Page number footer
                    doc.setFontSize(6.5);
                    doc.setFont("helvetica", "normal");
                    doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Page ${data.pageNumber} of ${doc.getNumberOfPages()} · Municipality of Mapandan Treasury System`,
                        PAGE_W / 2,
                        PAGE_H - 7,
                        { align: "center" }
                    );
                }
            });

            // Summary Footer & Formal COA Sign-off
            let finalY = (doc as any).lastAutoTable.finalY + 6;
            if (finalY > PAGE_H - 35) {
                doc.addPage();
                finalY = 20;
            }

            // Summary Totals
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text(`Total Recorded Incidents: ${filteredIncidents.length} stub(s)`, MARGIN, finalY);

            // Audit Certification Clause
            finalY += 8;
            doc.setFontSize(6.5);
            doc.setFont("helvetica", "italic");
            doc.setTextColor(71, 85, 105);
            doc.text(
                "I hereby certify under oath that the above accountable forms and stubs were cancelled, damaged, or jammed during official issuance, and replacement stubs were verified.",
                MARGIN,
                finalY
            );

            // Signatures
            finalY += 14;
            doc.setDrawColor(71, 85, 105);
            doc.setLineWidth(0.3);

            // Left Signature: Reporting Officer
            doc.line(MARGIN, finalY, MARGIN + 60, finalY);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text(currentUser?.name || "Treasury Accountable Officer", MARGIN, finalY + 4);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text("Prepared by / Accountable Form Custodian", MARGIN, finalY + 7);

            // Right Signature: Municipal Treasurer
            doc.line(PAGE_W - MARGIN - 60, finalY, PAGE_W - MARGIN, finalY);
            doc.setFontSize(7.5);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(15, 23, 42);
            doc.text(settings?.treasurerName || "Municipal Treasurer", PAGE_W - MARGIN - 60, finalY + 4);
            doc.setFontSize(6);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text("Noted by / Municipal Treasurer", PAGE_W - MARGIN - 60, finalY + 7);

            const fileSuffix = startDate && endDate ? `${startDate}_to_${endDate}` : format(new Date(), "yyyyMMdd_HHmm");
            doc.save(`Cancelled_Accountable_Forms_${fileSuffix}.pdf`);
            toast.success("COA PDF Registry generated successfully!", { id: toastId });
        } catch (err) {
            console.error("Error generating PDF:", err);
            toast.error("Failed to generate PDF document.", { id: toastId });
        } finally {
            setIsExportingPdf(false);
        }
    };

    // -------------------------------------------------------------
    // 📗 OFFICIAL EXCEL EXPORT (ExcelJS)
    // -------------------------------------------------------------
    const handleExportExcel = async () => {
        if (!filteredIncidents.length) {
            toast.error("No incident logs available to export.");
            return;
        }

        setIsExportingExcel(true);
        const toastId = toast.loading("Generating Official Excel (.xlsx) Ledger...");

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Cancelled Accountable Forms");

            // Municipal Headers
            worksheet.addRow(["MUNICIPALITY OF MAPANDAN — OFFICE OF THE MUNICIPAL TREASURER"]);
            worksheet.addRow(["REGISTRY OF CANCELLED ACCOUNTABLE FORMS"]);
            worksheet.addRow([`Period: ${rangeLabel} | Exported: ${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`]);
            worksheet.addRow([]); // Blank spacer

            worksheet.mergeCells("A1:I1");
            worksheet.mergeCells("A2:I2");
            worksheet.mergeCells("A3:I3");

            worksheet.getCell("A1").font = { bold: true, size: 12, color: { argb: "FF0F172A" } };
            worksheet.getCell("A2").font = { bold: true, size: 11, color: { argb: "FF2563EB" } };
            worksheet.getCell("A3").font = { italic: true, size: 9, color: { argb: "FF64748B" } };

            worksheet.getCell("A1").alignment = { horizontal: "left" };
            worksheet.getCell("A2").alignment = { horizontal: "left" };
            worksheet.getCell("A3").alignment = { horizontal: "left" };

            // Column Headers
            const headers = [
                "#",
                "Timestamp",
                "Counter Window",
                "Form Classification",
                "Incident Category",
                "Cancelled Serial #",
                "Replacement Serial (Active)",
                "Remarks / Detailed Cause",
                "Reporting Officer",
            ];

            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF2563EB" },
                };
                cell.alignment = { vertical: "middle", horizontal: "center" };
                cell.border = {
                    top: { style: "thin", color: { argb: "FFCBD5E1" } },
                    bottom: { style: "medium", color: { argb: "FF1E293B" } },
                    left: { style: "thin", color: { argb: "FFCBD5E1" } },
                    right: { style: "thin", color: { argb: "FFCBD5E1" } },
                };
            });
            headerRow.height = 24;

            // Set Column Widths
            worksheet.columns = [
                { width: 6 },
                { width: 20 },
                { width: 16 },
                { width: 28 },
                { width: 22 },
                { width: 24 },
                { width: 24 },
                { width: 40 },
                { width: 26 },
            ];

            // Data Rows
            filteredIncidents.forEach((item, idx) => {
                const row = worksheet.addRow([
                    idx + 1,
                    format(new Date(item.createdAt), "yyyy-MM-dd HH:mm"),
                    item.counterName || "Window 1",
                    item.formType,
                    item.incidentType.replace(/_/g, " "),
                    item.damagedSeriesNumber,
                    item.replacedSeriesNumber,
                    item.reasonDetails || "No Remarks",
                    item.reportedBy,
                ]);

                row.eachCell((cell, colNumber) => {
                    cell.border = {
                        top: { style: "thin", color: { argb: "FFE2E8F0" } },
                        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
                        left: { style: "thin", color: { argb: "FFE2E8F0" } },
                        right: { style: "thin", color: { argb: "FFE2E8F0" } },
                    };
                    cell.alignment = {
                        vertical: "middle",
                        horizontal: [1, 2, 3, 5, 6, 7].includes(colNumber) ? "center" : "left",
                    };
                    cell.font = { size: 9 };
                });

                // Style Cancelled Serial in Red
                row.getCell(6).font = { bold: true, color: { argb: "FFE11D48" }, strike: true };
                // Style Replacement Serial in Green
                row.getCell(7).font = { bold: true, color: { argb: "FF10B981" } };
            });

            // Summary Rows
            worksheet.addRow([]);
            const summaryRow = worksheet.addRow(["", "TOTAL INCIDENTS", filteredIncidents.length, "", "", "", "", "", ""]);
            summaryRow.font = { bold: true, size: 10 };
            summaryRow.getCell(2).font = { bold: true, color: { argb: "FF0F172A" } };
            summaryRow.getCell(3).font = { bold: true, color: { argb: "FF2563EB" } };

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const fileSuffix = startDate && endDate ? `${startDate}_to_${endDate}` : format(new Date(), "yyyyMMdd_HHmm");
            a.download = `Cancelled_Accountable_Forms_${fileSuffix}.xlsx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.success("Excel Ledger (.xlsx) generated successfully!", { id: toastId });
        } catch (err) {
            console.error("Error generating Excel ledger:", err);
            toast.error("Failed to generate Excel file.", { id: toastId });
        } finally {
            setIsExportingExcel(false);
        }
    };

    const getIncidentBadge = (type: string) => {
        switch (type) {
            case "PAPER_JAM":
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black text-[10px] uppercase">Paper Jam</Badge>;
            case "PRINTER_MISFEED":
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-black text-[10px] uppercase">Printer Misfeed</Badge>;
            case "INK_SMUDGE":
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-black text-[10px] uppercase">Ink Smudge</Badge>;
            case "DAMAGED_LEAF":
                return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-black text-[10px] uppercase">Torn / Damaged</Badge>;
            default:
                return <Badge className="bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 font-black text-[10px] uppercase">{type.replace(/_/g, " ")}</Badge>;
        }
    };

    return (
        <div className="w-full space-y-8 animate-in fade-in duration-500">
            {/* Header / Sub-Nav */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-[#151b2b] p-6 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <Link href="/admin/treasury">
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5">
                                <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Registry of Cancelled Accountable Forms
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Official municipal audit trail for cancelled accountable forms, paper jams, and replacement serial numbers issued across Treasury counters.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Header Action Buttons (PDF, Excel) */}
                <div className="flex flex-wrap items-center gap-3 self-end lg:self-auto">
                    <Button
                        onClick={handleExportPDF}
                        disabled={isExportingPdf}
                        className="h-11 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-rose-600/20 flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" />
                        {isExportingPdf ? "Generating PDF..." : "Export COA PDF"}
                    </Button>

                    <Button
                        onClick={handleExportExcel}
                        disabled={isExportingExcel}
                        className="h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        {isExportingExcel ? "Generating Excel..." : "Export Excel (.xlsx)"}
                    </Button>
                </div>
            </div>

            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Cancelled Forms</p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Logged by Treasury Cashiers</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                        <FileWarning className="w-6 h-6 text-rose-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paper Jams</p>
                        <h3 className="text-3xl font-black text-amber-500 mt-1">{stats.paperJams}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Mechanical roller incidents</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                        <Printer className="w-6 h-6 text-amber-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Misfeeds / Alignment</p>
                        <h3 className="text-3xl font-black text-blue-500 mt-1">{stats.misfeeds}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Tray feeding errors</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                        <Layers className="w-6 h-6 text-blue-500" />
                    </div>
                </div>

                <div className="bg-white dark:bg-[#151b2b] p-5 rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Torn / Booklet Flaws</p>
                        <h3 className="text-3xl font-black text-emerald-500 mt-1">{stats.damagedLeaves}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Perforated leaf damage</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <ShieldAlert className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Main Content Table & Filters */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                {/* Search, Date Range & Category Filter Toolbar */}
                <div className="p-5 border-b border-slate-200 dark:border-[#2a3040] flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-50/50 dark:bg-[#151b2b]">
                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[260px] max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search serial #, staff, counter, remarks..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-11 pl-10 rounded-2xl bg-white dark:bg-[#1a2234] border-slate-200 dark:border-white/10 text-xs font-medium"
                        />
                    </div>

                    {/* Filter Controls Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Start to End Date Inputs */}
                        <div className="flex items-center gap-2 bg-white dark:bg-[#1a2234] border border-slate-200 dark:border-white/10 p-1.5 rounded-2xl shadow-sm">
                            <Calendar className="w-4 h-4 text-slate-400 ml-1.5" />
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                <span>From:</span>
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-8 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs font-bold w-[125px]"
                                />
                                <span>To:</span>
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-8 px-2 rounded-xl bg-slate-50 dark:bg-slate-800 border-none text-xs font-bold w-[125px]"
                                />
                            </div>

                            {(startDate || endDate) && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                    className="h-7 w-7 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600"
                                    title="Clear date filter"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>

                        {/* Quick Presets */}
                        <div className="hidden sm:flex items-center gap-1 bg-white dark:bg-[#1a2234] border border-slate-200 dark:border-white/10 p-1 rounded-2xl shadow-sm">
                            <button
                                type="button"
                                onClick={() => setQuickDateRange("TODAY")}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                            >
                                Today
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDateRange("THIS_WEEK")}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                            >
                                7 Days
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDateRange("THIS_MONTH")}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
                            >
                                Month
                            </button>
                        </div>

                        {/* Category Dropdown */}
                        <div className="flex items-center gap-1.5 bg-white dark:bg-[#1a2234] border border-slate-200 dark:border-white/10 p-1 rounded-2xl shadow-sm">
                            <Filter className="w-4 h-4 text-slate-400 ml-2" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="h-9 px-2 bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                            >
                                <option value="ALL" className="bg-white dark:bg-[#151b2b] text-slate-900 dark:text-slate-100">All Categories</option>
                                <option value="PAPER_JAM" className="bg-white dark:bg-[#151b2b] text-slate-900 dark:text-slate-100">Paper Jam</option>
                                <option value="PRINTER_MISFEED" className="bg-white dark:bg-[#151b2b] text-slate-900 dark:text-slate-100">Printer Misfeed</option>
                                <option value="INK_SMUDGE" className="bg-white dark:bg-[#151b2b] text-slate-900 dark:text-slate-100">Ink Smudge</option>
                                <option value="DAMAGED_LEAF" className="bg-white dark:bg-[#151b2b] text-slate-900 dark:text-slate-100">Torn / Damaged Leaf</option>
                                <option value="ENCODING_ERROR" className="bg-white dark:bg-[#151b2b] text-slate-900 dark:text-slate-100">Encoding Error</option>
                            </select>
                        </div>

                        {/* Sync Records Button placed beside category filter */}
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="h-11 px-3.5 rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a2234] font-bold text-xs flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : "text-slate-400"}`} />
                            <span className="hidden sm:inline">Sync</span>
                        </Button>
                    </div>
                </div>

                {/* Table View */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/60 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <tr>
                                <th className="py-4 px-4 w-12 text-center">#</th>
                                <th className="py-4 px-6">Timestamp & Counter</th>
                                <th className="py-4 px-6">Classification</th>
                                <th className="py-4 px-6">Category</th>
                                <th className="py-4 px-6">Cancelled Serial #</th>
                                <th className="py-4 px-6">Replacement Serial # (Active)</th>
                                <th className="py-4 px-6">Remarks & Officer</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-white/5 font-medium">
                            {paginatedIncidents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-14 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400">
                                                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                No accountable form incidents found
                                            </p>
                                            <p className="text-xs text-slate-400 max-w-sm">
                                                No records match your active search, category, or date range filter ({rangeLabel}).
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedIncidents.map((item, idx) => {
                                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                                    const isClickable = Boolean(item.transactionId);

                                    return (
                                        <tr 
                                            key={item.id} 
                                            onClick={() => {
                                                if (item.transactionId) {
                                                    router.push(`/admin/treasury/${item.transactionId}`);
                                                }
                                            }}
                                            className={`transition-colors group ${
                                                isClickable 
                                                    ? "hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer" 
                                                    : "hover:bg-slate-50/70 dark:hover:bg-white/[0.02]"
                                            }`}
                                        >
                                            <td className="py-4 px-4 text-center font-mono font-bold text-slate-400 group-hover:text-primary transition-colors">
                                                {rowNumber}
                                            </td>

                                            <td className="py-4 px-6">
                                                <div className="space-y-0.5">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 group-hover:text-primary transition-colors">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        {format(new Date(item.createdAt), "MMM dd, yyyy · hh:mm a")}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">
                                                        Counter: <span className="font-bold text-slate-700 dark:text-slate-200">{item.counterName || "Window 1"}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6">
                                                <Badge variant="outline" className="font-bold border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-[11px] bg-slate-50 dark:bg-white/5">
                                                    {item.formType}
                                                </Badge>
                                            </td>

                                            <td className="py-4 px-6">
                                                {getIncidentBadge(item.incidentType)}
                                            </td>

                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-mono font-black text-xs line-through tracking-wider">
                                                    {item.damagedSeriesNumber}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono font-black text-xs tracking-wider">
                                                    {item.replacedSeriesNumber}
                                                </span>
                                            </td>

                                            <td className="py-4 px-6 max-w-[280px]">
                                                <div className="space-y-0.5">
                                                    <p className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate" title={item.reasonDetails || "No remarks provided"}>
                                                        {item.reasonDetails || <span className="text-slate-400 italic">No remarks provided</span>}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                        By: <span className="font-bold text-slate-800 dark:text-slate-200">{item.reportedBy}</span>
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer with Rows Dropdown & Pagination Controls */}
                <div className="p-4 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-4 flex-wrap">
                        <p>
                            Showing <span className="font-bold text-slate-800 dark:text-white">{filteredIncidents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{" "}
                            <span className="font-bold text-slate-800 dark:text-white">
                                {Math.min(currentPage * pageSize, filteredIncidents.length)}
                            </span> of{" "}
                            <span className="font-bold text-slate-800 dark:text-white">{filteredIncidents.length}</span> filtered record(s)
                            {filteredIncidents.length !== incidents.length && (
                                <span className="text-slate-400 ml-1">({incidents.length} total)</span>
                            )}
                        </p>

                        {/* Page Size / Rows Dropdown moved to footer */}
                        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-white/10">
                            <span className="text-[11px] font-bold text-slate-400">Rows per page:</span>
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    setPageSize(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="h-8 px-2.5 rounded-xl bg-white dark:bg-[#1a2234] border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none shadow-sm cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>

                    {/* Pagination Nav */}
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold mr-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage <= 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className="h-8 w-8 rounded-xl border-slate-200 dark:border-white/10"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage >= totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className="h-8 w-8 rounded-xl border-slate-200 dark:border-white/10"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
