"use client";

import React, { useState, useMemo } from "react";
import {
    Pill,
    Search,
    Download,
    Plus,
    RotateCcw,
    FileText,
    FileSpreadsheet,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    SlidersHorizontal,
    Boxes,
    PackageMinus,
    Eye,
    Copy,
    X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { RHUInventoryMovementData } from "../actions";
import { recordRHUInventoryMovement } from "../actions";

interface MedicineLedgerClientProps {
    initialMovements: RHUInventoryMovementData[];
    initialItems: any[];
    initialCenters: any[];
    currentUser?: any;
    matchedCenter?: any;
}

export default function MedicineLedgerClient({
    initialMovements,
    initialItems,
    initialCenters,
    currentUser: _currentUser,
    matchedCenter
}: MedicineLedgerClientProps) {
    const [movements, setMovements] = useState<RHUInventoryMovementData[]>(initialMovements);
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [centerFilter, setCenterFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Quick Action Modals
    const [isStockInModalOpen, setIsStockInModalOpen] = useState(false);
    const [isIssuanceModalOpen, setIsIssuanceModalOpen] = useState(false);
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [selectedMovementDetail, setSelectedMovementDetail] = useState<RHUInventoryMovementData | null>(null);

    // Form states
    const [selectedItemId, setSelectedItemId] = useState("");
    const [transQty, setTransQty] = useState<number | "">("");
    const [transRemarks, setTransRemarks] = useState("");
    const [transBatch, setTransBatch] = useState("");

    // Statistics for right sidebar
    const totalMedicines = initialItems.filter(i => i.category === "MEDICINE").length;
    const inStockCount = initialItems.filter(i => i.category === "MEDICINE" && i.quantity > i.reorderLevel).length;
    const lowStockCount = initialItems.filter(i => i.category === "MEDICINE" && i.quantity > 0 && i.quantity <= i.reorderLevel).length;
    const outOfStockCount = initialItems.filter(i => i.category === "MEDICINE" && i.quantity <= 0).length;

    // Donut chart math
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const activeSegmentsCount = (inStockCount > 0 ? 1 : 0) + (lowStockCount > 0 ? 1 : 0) + (outOfStockCount > 0 ? 1 : 0);
    const gap = activeSegmentsCount > 1 ? 4 : 0;
    const inStockLen = totalMedicines > 0 ? (inStockCount / totalMedicines) * circumference : 0;
    const inStockDash = Math.max(0, inStockLen - gap);
    const lowStockLen = totalMedicines > 0 ? (lowStockCount / totalMedicines) * circumference : 0;
    const lowStockDash = Math.max(0, lowStockLen - gap);
    const outOfStockLen = totalMedicines > 0 ? (outOfStockCount / totalMedicines) * circumference : 0;
    const outOfStockDash = Math.max(0, outOfStockLen - gap);

    // Low stock items for sidebar list
    const lowStockItems = initialItems
        .filter(i => i.category === "MEDICINE" && (i.quantity <= i.reorderLevel || i.quantity <= 0))
        .slice(0, 3);

    // Filtered ledger rows
    const filteredMovements = useMemo(() => {
        return movements.filter(m => {
            if (typeFilter !== "ALL" && m.transactionType.toLowerCase() !== typeFilter.toLowerCase()) {
                return false;
            }
            if (categoryFilter !== "ALL") {
                const cat = (m.category || "").toLowerCase();
                const gen = (m.genericName || "").toLowerCase();
                if (!cat.includes(categoryFilter.toLowerCase()) && !gen.includes(categoryFilter.toLowerCase())) {
                    return false;
                }
            }
            if (centerFilter !== "ALL" && m.healthCenterId !== centerFilter) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const name = (m.medicineName || "").toLowerCase();
                const gen = (m.genericName || "").toLowerCase();
                const rem = (m.personRemarks || "").toLowerCase();
                const batch = (m.batchNumber || "").toLowerCase();
                const ref = (m.referenceNo || "").toLowerCase();
                return name.includes(q) || gen.includes(q) || rem.includes(q) || batch.includes(q) || ref.includes(q);
            }
            return true;
        });
    }, [movements, typeFilter, categoryFilter, centerFilter, searchQuery]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredMovements.length / itemsPerPage));
    const paginatedMovements = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredMovements.slice(start, start + itemsPerPage);
    }, [filteredMovements, currentPage]);

    const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

    const handleExportExcel = async () => {
        if (filteredMovements.length === 0) {
            toast.error("No transactions to export.");
            return;
        }

        setIsExporting("excel");
        const toastId = toast.loading("Generating Excel workbook...");
        try {
            const XLSX = await import("xlsx");

            const rows = filteredMovements.map((m, idx) => {
                const dateObj = new Date(m.timestamp);
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                });
                const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
                const dateTimeStr = `${formattedDate} ${formattedTime}`;

                return {
                    "No.": idx + 1,
                    "Date & Time": dateTimeStr,
                    "Transaction Type": m.transactionType,
                    "Medicine Name": m.medicineName,
                    "Generic Name": m.genericName || "—",
                    "Batch Number": m.batchNumber ? `#${m.batchNumber}` : "—",
                    "Category": m.category || "General",
                    "Quantity": m.quantity > 0 ? `+${m.quantity}` : `${m.quantity}`,
                    "Unit": m.unit || "pcs",
                    "Balance After": m.balanceAfter !== undefined && m.balanceAfter !== null ? m.balanceAfter : "—",
                    "Person / Remarks": m.personRemarks || "—",
                    "Facility": m.facilityName || matchedCenter?.name || "Main Rural Health Unit (RHU)",
                    "Reference No.": m.referenceNo || "—"
                };
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            ws["!cols"] = [
                { wch: 6 },
                { wch: 22 },
                { wch: 18 },
                { wch: 26 },
                { wch: 22 },
                { wch: 18 },
                { wch: 16 },
                { wch: 12 },
                { wch: 10 },
                { wch: 14 },
                { wch: 32 },
                { wch: 24 },
                { wch: 18 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Medicine Ledger");

            XLSX.writeFile(wb, `RHU_Medicine_Ledger_${new Date().toISOString().split("T")[0]}.xlsx`);
            toast.success("Medicine ledger exported to Excel successfully!", { id: toastId });
        } catch (err: any) {
            console.error("Excel Export error:", err);
            toast.error("Failed to export Excel workbook.", { id: toastId });
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportPDF = async () => {
        if (filteredMovements.length === 0) {
            toast.error("No transactions to export.");
            return;
        }

        setIsExporting("pdf");
        const toastId = toast.loading("Generating PDF document...");
        try {
            const { default: jsPDF } = await import("jspdf");
            const { default: autoTable } = await import("jspdf-autotable");

            const doc = new jsPDF({ orientation: "landscape" });

            // Header Section
            doc.setFontSize(13);
            doc.setFont("helvetica", "bold");
            doc.text("LOCAL GOVERNMENT UNIT — RURAL HEALTH UNIT (RHU)", 14, 14);

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            doc.text("RHU MEDICINE TRANSACTION LEDGER & STOCK MOVEMENT REPORT", 14, 20);

            doc.setFontSize(8);
            doc.setTextColor(100);
            const facilityLabel = matchedCenter?.name || "Main RHU (Main & Sub-Centers)";
            const summaryText = `Generated: ${new Date().toLocaleString("en-PH")} | Facility: ${facilityLabel} | Total Records: ${filteredMovements.length}`;
            doc.text(summaryText, 14, 26);

            const tableRows = filteredMovements.map((m, idx) => {
                const dateObj = new Date(m.timestamp);
                const formattedDate = dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                });
                const formattedTime = dateObj.toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit"
                });
                const dateTimeStr = `${formattedDate}\n${formattedTime}`;
                const medicineWithBatch = m.batchNumber ? `${m.medicineName}\nBatch: #${m.batchNumber}` : m.medicineName;
                const qtyStr = m.quantity > 0 ? `+${m.quantity} ${m.unit || "pcs"}` : `${m.quantity} ${m.unit || "pcs"}`;
                const balStr = m.balanceAfter !== undefined && m.balanceAfter !== null ? `${m.balanceAfter} ${m.unit || "pcs"}` : "—";

                return [
                    (idx + 1).toString(),
                    dateTimeStr,
                    m.transactionType,
                    medicineWithBatch,
                    m.category || "General",
                    qtyStr,
                    balStr,
                    m.personRemarks || "—",
                    m.facilityName || matchedCenter?.name || "Main Rural Health Unit (RHU)"
                ];
            });

            autoTable(doc, {
                startY: 30,
                head: [["#", "Date & Time", "Type", "Medicine & Batch", "Category", "Quantity", "Balance", "Person / Remarks", "Facility"]],
                body: tableRows,
                theme: "grid",
                headStyles: {
                    fillColor: [15, 27, 52],
                    textColor: [255, 255, 255],
                    fontStyle: "bold",
                    fontSize: 8,
                    halign: "center"
                },
                bodyStyles: {
                    fontSize: 7.5,
                    textColor: [30, 41, 59]
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles: {
                    0: { cellWidth: 8, halign: "center" },
                    1: { cellWidth: 26 },
                    2: { cellWidth: 22, halign: "center", fontStyle: "bold" },
                    3: { cellWidth: 42, fontStyle: "bold" },
                    4: { cellWidth: 24 },
                    5: { cellWidth: 24, halign: "right", fontStyle: "bold" },
                    6: { cellWidth: 20, halign: "right" },
                    7: { cellWidth: 55 },
                    8: { cellWidth: 35 }
                },
                margin: { top: 30, bottom: 18, left: 14, right: 14 },
                didDrawPage: (data: any) => {
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
                    doc.setFontSize(8);
                    doc.setTextColor(120);
                    doc.text(
                        `Page ${data.pageNumber} — Official RHU E-LGU Electronic Medicine Ledger Report`,
                        14,
                        pageHeight - 8
                    );
                }
            });

            doc.save(`RHU_Medicine_Ledger_${new Date().toISOString().split("T")[0]}.pdf`);
            toast.success("Medicine ledger exported to PDF successfully!", { id: toastId });
        } catch (err: any) {
            console.error("PDF Export error:", err);
            toast.error("Failed to export PDF document.", { id: toastId });
        } finally {
            setIsExporting(null);
        }
    };

    const handleSaveMovement = async (type: "Stock In" | "Issuance" | "Adjustment") => {
        if (!selectedItemId) {
            toast.error("Please select a medicine.");
            return;
        }
        const qtyNum = Number(transQty);
        if (!qtyNum || qtyNum <= 0) {
            toast.error("Please enter a valid quantity.");
            return;
        }

        const item = initialItems.find(i => i.id === selectedItemId);
        if (!item) return;

        const delta = type === "Issuance" ? -qtyNum : (type === "Stock In" ? qtyNum : qtyNum);
        const signedQty = type === "Issuance" ? -qtyNum : qtyNum;
        const newBal = Math.max(0, (item.quantity || 0) + delta);

        const newMov: RHUInventoryMovementData = {
            id: `mov_${Date.now()}`,
            timestamp: new Date(),
            transactionType: type,
            medicineName: item.name,
            genericName: item.genericName,
            category: item.genericName || "Pharmaceutical",
            quantity: signedQty,
            unit: item.unit || "pcs",
            batchNumber: transBatch || item.batchNumber || null,
            balanceAfter: newBal,
            personRemarks: transRemarks || `${type} recorded manually`,
            facilityName: matchedCenter?.name || "Main Rural Health Unit (RHU)",
            referenceNo: `MANUAL-${Date.now().toString().slice(-4)}`
        };

        setMovements(prev => [newMov, ...prev]);
        setIsStockInModalOpen(false);
        setIsIssuanceModalOpen(false);
        setIsAdjustModalOpen(false);
        setSelectedItemId("");
        setTransQty("");
        setTransRemarks("");
        setTransBatch("");

        await recordRHUInventoryMovement({
            transactionType: type,
            medicineName: item.name,
            genericName: item.genericName,
            category: item.genericName || "Pharmaceutical",
            quantity: signedQty,
            unit: item.unit || "pcs",
            batchNumber: transBatch || item.batchNumber || null,
            balanceAfter: newBal,
            personRemarks: transRemarks || `${type} recorded manually`,
            facilityName: matchedCenter?.name || "Main Rural Health Unit (RHU)",
            healthCenterId: matchedCenter?.id || null,
            referenceNo: `MANUAL-${Date.now().toString().slice(-4)}`
        });

        toast.success(`${type} recorded in ledger!`);
    };

    return (
        <div className="p-2 md:p-4 max-w-full mx-auto space-y-6 pb-20">
            {/* 2-Column Responsive Layout */}
            <div className="flex flex-col xl:flex-row items-start gap-6">
                {/* Main Content Area */}
                <div className="flex-1 min-w-0 w-full space-y-6">
                    {/* Header Banner */}
                    <div className="p-6 sm:p-7 rounded-3xl bg-[#091122] border border-[#162340] shadow-xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-[#0f1b34] border border-blue-500/25 flex items-center justify-center text-slate-100 shrink-0 shadow-inner mt-0.5">
                                <Pill className="w-6 h-6 -rotate-45" />
                            </div>
                            <div className="space-y-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                                    Medicine Ledger
                                </h1>
                                <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
                                    Track all medicine transactions, including purchases, issuances, adjustments, and current stock levels in real time.
                                </p>
                            </div>
                        </div>

                        {/* Export Action in Banner */}
                        <div className="shrink-0 flex items-center gap-2 self-start sm:self-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        disabled={isExporting !== null}
                                        className="h-10 px-4 text-xs font-semibold rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white shadow-sm gap-2 backdrop-blur-sm transition-all cursor-pointer hover:border-blue-500/40 hover:text-white"
                                    >
                                        <Download className="w-4 h-4 text-blue-400" />
                                        <span>{isExporting ? `Exporting ${isExporting.toUpperCase()}...` : "Export Ledger"}</span>
                                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-52 bg-[#091122] border-[#162340] text-slate-200 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md"
                                >
                                    <DropdownMenuItem
                                        onClick={handleExportExcel}
                                        className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-white/10 hover:text-white text-slate-200 cursor-pointer focus:bg-white/10 focus:text-white transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-white">Export as Excel</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Spreadsheet (.xlsx)</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-white/10 hover:text-white text-slate-200 cursor-pointer focus:bg-white/10 focus:text-white transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                            <FileText className="w-4 h-4 text-rose-400" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-white">Export as PDF</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Document (.pdf)</span>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    {/* Filter and Search Bar */}
                    <Card className="rounded-2xl border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl p-3 sm:p-3.5">
                        <CardContent className="p-0 flex flex-wrap items-center gap-2.5 sm:gap-3">
                            {/* Medicine Category */}
                            <div className="w-full sm:w-[160px] shrink-0">
                                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                        <SelectValue placeholder="Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Categories</SelectItem>
                                        <SelectItem value="Antibiotic">Antibiotic</SelectItem>
                                        <SelectItem value="Analgesic">Analgesic</SelectItem>
                                        <SelectItem value="Rehydration">Rehydration</SelectItem>
                                        <SelectItem value="Respiratory">Respiratory</SelectItem>
                                        <SelectItem value="Supplement">Supplement</SelectItem>
                                        <SelectItem value="Ophthalmic">Ophthalmic</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Transaction Type */}
                            <div className="w-full sm:w-[150px] shrink-0">
                                <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                        <SelectValue placeholder="Transaction Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Types</SelectItem>
                                        <SelectItem value="Stock In">Stock In</SelectItem>
                                        <SelectItem value="Issuance">Issuance</SelectItem>
                                        <SelectItem value="Adjustment">Adjustment</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Facility Filter */}
                            {initialCenters && initialCenters.length > 0 && (
                                <div className="w-full sm:w-[165px] shrink-0">
                                    <Select value={centerFilter} onValueChange={(val) => { setCenterFilter(val); setCurrentPage(1); }}>
                                        <SelectTrigger className="w-full h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]">
                                            <SelectValue placeholder="Facility" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Facilities</SelectItem>
                                            {initialCenters.map((c: any) => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Search Input */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <Input
                                    placeholder="Search medicine name, remarks, ref..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-9 pr-8 h-9 text-xs rounded-xl bg-slate-50 dark:bg-[#0d1629] border-slate-200 dark:border-[#1c2c4d]"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setCurrentPage(1);
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Reset Button */}
                            {(categoryFilter !== "ALL" || typeFilter !== "ALL" || centerFilter !== "ALL" || searchQuery.trim() !== "") && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setCategoryFilter("ALL");
                                        setTypeFilter("ALL");
                                        setCenterFilter("ALL");
                                        setSearchQuery("");
                                        setCurrentPage(1);
                                    }}
                                    className="h-9 px-2.5 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-semibold gap-1.5 rounded-xl cursor-pointer transition-all shrink-0"
                                    title="Reset all filters"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Reset</span>
                                </Button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Ledger Table */}
                    <div className="rounded-2xl border border-slate-200 dark:border-[#162340] bg-white dark:bg-[#091122] shadow-sm dark:shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/80 dark:bg-[#0d1629]/90 border-b border-slate-200 dark:border-[#162340]">
                                    <TableRow className="border-0">
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 py-3.5">
                                            Date & Time
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Transaction Type
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Medicine Name
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Category
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Quantity
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                            Stock Balance
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Unit
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300">
                                            Person / Remarks
                                        </TableHead>
                                        <TableHead className="font-bold text-xs text-slate-600 dark:text-slate-300 text-center">
                                            Actions
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-[#162340]">
                                    {paginatedMovements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-slate-400">
                                                <Boxes className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                                <p className="font-semibold text-sm">No transaction records found</p>
                                                <p className="text-xs opacity-70 mt-0.5">Try adjusting your filters or record an issuance/stock in.</p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedMovements.map((m) => {
                                            const isStockIn = m.transactionType === "Stock In";
                                            const isIssuance = m.transactionType === "Issuance";
                                            const isAdjustment = m.transactionType === "Adjustment";

                                            const dateObj = new Date(m.timestamp);
                                            const formattedDate = dateObj.toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            });
                                            const formattedTime = dateObj.toLocaleTimeString("en-US", {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            });

                                            return (
                                                <TableRow key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0f1b34]/40 transition-colors">
                                                    <TableCell className="py-3.5 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                        <span className="font-semibold">{formattedDate}</span>
                                                        <span className="text-slate-400 ml-2">{formattedTime}</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        {isStockIn && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#00d084] text-white shadow-sm shadow-[#00d084]/20">
                                                                Stock In
                                                            </span>
                                                        )}
                                                        {isIssuance && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#ff0055] text-white shadow-sm shadow-[#ff0055]/20">
                                                                Issuance
                                                            </span>
                                                        )}
                                                        {isAdjustment && (
                                                            <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[#f59e0b] text-slate-900 shadow-sm shadow-[#f59e0b]/20">
                                                                Adjustment
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                                                        {m.medicineName}
                                                        {m.batchNumber && (
                                                            <span className="block text-[10px] text-slate-400 font-normal">
                                                                Batch: #{m.batchNumber}
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                                                        {m.category || "General"}
                                                    </TableCell>
                                                    <TableCell className="font-bold text-xs whitespace-nowrap">
                                                        <span className={cn(
                                                            isStockIn && "text-emerald-500",
                                                            isIssuance && "text-[#ff0055]",
                                                            isAdjustment && "text-amber-500"
                                                        )}>
                                                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 font-mono">
                                                            <span className={cn(
                                                                "font-bold text-xs",
                                                                (m.balanceAfter ?? 0) <= 0
                                                                    ? "text-rose-500 dark:text-rose-400"
                                                                    : (m.balanceAfter ?? 0) <= 10
                                                                    ? "text-amber-500 dark:text-amber-400"
                                                                    : "text-slate-800 dark:text-slate-100"
                                                            )}>
                                                                {m.balanceAfter !== undefined && m.balanceAfter !== null ? m.balanceAfter.toLocaleString() : "—"}
                                                            </span>
                                                            {(m.balanceAfter ?? 0) <= 0 && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/25">
                                                                    Out
                                                                </span>
                                                            )}
                                                            {(m.balanceAfter ?? 0) > 0 && (m.balanceAfter ?? 0) <= 10 && (
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-sans font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                                                                    Low
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500 dark:text-slate-400">
                                                        {m.unit}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 dark:text-slate-300 max-w-[220px] truncate" title={m.personRemarks || ""}>
                                                        {m.personRemarks || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-center py-3.5">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedMovementDetail(m)}
                                                            className="h-8 w-8 p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-[#162340] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                                            title="View Transaction Details"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Bar */}
                        <div className="p-4 border-t border-slate-200 dark:border-[#162340] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <div>
                                Showing {filteredMovements.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–
                                {Math.min(currentPage * itemsPerPage, filteredMovements.length)} of {filteredMovements.length} transactions
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    className="h-8 w-8 p-0 rounded-lg"
                                >
                                    &lt;
                                </Button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(page => (
                                    <Button
                                        key={page}
                                        size="sm"
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            "h-8 w-8 p-0 rounded-lg text-xs font-bold",
                                            currentPage === page
                                                ? "bg-[#ff0055] text-white shadow-md shadow-[#ff0055]/30 hover:bg-rose-600"
                                                : "bg-slate-100 dark:bg-[#0d1629] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#162340]"
                                        )}
                                    >
                                        {page}
                                    </Button>
                                ))}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    className="h-8 w-8 p-0 rounded-lg"
                                >
                                    &gt;
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar (Collapsible) */}
                {isSidebarCollapsed ? (
                    <div className="hidden xl:flex flex-col items-center gap-3 w-14 shrink-0 xl:sticky xl:top-4 p-2 rounded-2xl bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-xl text-slate-900 dark:text-white transition-all duration-300">
                        {/* Expand Button */}
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0d1629] hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-all cursor-pointer shadow-sm"
                            title="Expand Summary & Actions"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="w-6 h-px bg-slate-200 dark:bg-[#162340] my-0.5" />

                        {/* Quick Stock Summary Indicator */}
                        <button
                            type="button"
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#0f1b34] border border-blue-200 dark:border-blue-500/25 flex flex-col items-center justify-center text-blue-600 dark:text-slate-100 hover:scale-105 transition-transform cursor-pointer shadow-inner"
                            title={`Stock Summary: ${totalMedicines} Items (${inStockCount} In Stock, ${lowStockCount} Low, ${outOfStockCount} Out)`}
                        >
                            <Pill className="w-4 h-4 -rotate-45" />
                            <span className="text-[9px] font-black leading-none mt-0.5">{totalMedicines}</span>
                        </button>

                        {/* Quick Low Stock Alert Indicator */}
                        {lowStockItems.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsSidebarCollapsed(false)}
                                className="relative w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex flex-col items-center justify-center text-[#ff0055] hover:scale-105 transition-transform cursor-pointer shadow-sm"
                                title={`${lowStockItems.length} Low / Out of Stock Items`}
                            >
                                <Boxes className="w-4 h-4" />
                                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[#ff0055] text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                                    {lowStockItems.length}
                                </span>
                            </button>
                        )}

                        {/* Quick Actions Shortcuts */}
                        <div className="w-6 h-px bg-slate-200 dark:bg-[#162340] my-0.5" />

                        {/* Add Stock shortcut */}
                        <button
                            type="button"
                            onClick={() => setIsStockInModalOpen(true)}
                            className="w-10 h-10 rounded-xl bg-[#ff0055] hover:bg-rose-600 text-white flex items-center justify-center shadow-md shadow-[#ff0055]/30 hover:scale-105 transition-transform cursor-pointer"
                            title="Add Stock (Stock In)"
                        >
                            <Plus className="w-5 h-5" />
                        </button>

                        {/* Record Issuance shortcut */}
                        <button
                            type="button"
                            onClick={() => setIsIssuanceModalOpen(true)}
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-center text-rose-500 hover:scale-105 transition-transform cursor-pointer"
                            title="Record Issuance (Out)"
                        >
                            <PackageMinus className="w-4 h-4" />
                        </button>
                    </div>
                ) : (
                    <div className="w-full xl:w-[340px] 2xl:w-[350px] shrink-0 space-y-5 xl:sticky xl:top-4 transition-all duration-300">
                        {/* Card 1: Stock Summary */}
                        <div className="rounded-2xl p-5 bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-sm dark:shadow-xl text-slate-900 dark:text-white">
                            <div className="flex items-center justify-between gap-3 mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#0f1b34] border border-blue-200 dark:border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-slate-100 shadow-inner">
                                        <Pill className="w-5 h-5 -rotate-45" />
                                    </div>
                                    <h3 className="text-base font-bold tracking-tight">
                                        Stock Summary
                                    </h3>
                                </div>

                                {/* Collapse Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsSidebarCollapsed(true)}
                                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer"
                                    title="Collapse side panel"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 128 128">
                                    <circle cx="64" cy="64" r={radius} fill="transparent" className="stroke-slate-200 dark:stroke-[#162340]" strokeWidth="13" />
                                    {inStockCount > 0 && (
                                        <circle
                                            cx="64" cy="64" r={radius} fill="transparent" stroke="#00d084" strokeWidth="13"
                                            strokeDasharray={`${inStockDash} ${circumference - inStockDash}`} strokeDashoffset="0" strokeLinecap="round"
                                        />
                                    )}
                                    {lowStockCount > 0 && (
                                        <circle
                                            cx="64" cy="64" r={radius} fill="transparent" stroke="#f89a1c" strokeWidth="13"
                                            strokeDasharray={`${lowStockDash} ${circumference - lowStockDash}`} strokeDashoffset={-inStockLen} strokeLinecap="round"
                                        />
                                    )}
                                    {outOfStockCount > 0 && (
                                        <circle
                                            cx="64" cy="64" r={radius} fill="transparent" stroke="#ff0055" strokeWidth="13"
                                            strokeDasharray={`${outOfStockDash} ${circumference - outOfStockDash}`} strokeDashoffset={-(inStockLen + lowStockLen)} strokeLinecap="round"
                                        />
                                    )}
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-black leading-none">{totalMedicines}</span>
                                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 text-center leading-tight mt-1 max-w-[62px]">
                                        Total Items
                                    </span>
                                </div>
                            </div>

                            <div className="flex-1 space-y-3 pl-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#00d084] shadow-sm shadow-[#00d084]/50 shrink-0" />
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">In Stock</span>
                                    </div>
                                    <span className="text-xs font-bold tabular-nums">{inStockCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#f89a1c] shadow-sm shadow-[#f89a1c]/50 shrink-0" />
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Low Stock</span>
                                    </div>
                                    <span className="text-xs font-bold tabular-nums">{lowStockCount}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff0055] shadow-sm shadow-[#ff0055]/50 shrink-0" />
                                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Out of Stock</span>
                                    </div>
                                    <span className="text-xs font-bold tabular-nums">{outOfStockCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Low Stock Alert */}
                    <div className="rounded-2xl p-5 bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-sm dark:shadow-xl text-slate-900 dark:text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#ff0055]">
                                    <Boxes className="w-4 h-4" />
                                </div>
                                <h3 className="text-base font-bold tracking-tight">Low Stock Alert</h3>
                            </div>
                            <span className="text-xs font-semibold text-[#ff0055] hover:underline cursor-pointer">View All</span>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                            {lowStockItems.map((item) => (
                                <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-xs font-semibold truncate">{item.name}</h4>
                                        <p className="text-[11px] text-rose-500 font-bold mt-0.5">
                                            {item.quantity <= 0 ? "0 pcs left (Out)" : `${item.quantity} ${item.unit || "pcs"} left`}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => {
                                            setSelectedItemId(item.id);
                                            setIsStockInModalOpen(true);
                                        }}
                                        size="sm"
                                        className="h-7 px-3 text-[11px] bg-[#ff0055] hover:bg-rose-600 text-white rounded-full font-bold shadow-sm shadow-[#ff0055]/30 shrink-0"
                                    >
                                        Reorder
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Card 3: Quick Actions */}
                    <div className="rounded-2xl p-5 bg-white dark:bg-[#091122] border border-slate-200 dark:border-[#162340] shadow-sm dark:shadow-xl text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-[#ff0055]">
                                <SlidersHorizontal className="w-4 h-4" />
                            </div>
                            <h3 className="text-base font-bold tracking-tight">Quick Actions</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setIsStockInModalOpen(true)}
                                className="p-3.5 rounded-2xl bg-[#ff0055] hover:bg-rose-600 text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 shadow-md shadow-[#ff0055]/20 transition-all cursor-pointer"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Add Stock</span>
                                <span className="text-[10px] opacity-80 font-normal">(Stock In)</span>
                            </button>

                            <button
                                onClick={() => setIsIssuanceModalOpen(true)}
                                className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] text-slate-800 dark:text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <PackageMinus className="w-5 h-5 text-rose-500" />
                                <span>Record Issuance</span>
                                <span className="text-[10px] text-slate-400 font-normal">(Out)</span>
                            </button>

                            <button
                                onClick={() => setIsAdjustModalOpen(true)}
                                className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] text-slate-800 dark:text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                                <RotateCcw className="w-5 h-5 text-amber-500" />
                                <span>Adjust Stock</span>
                                <span className="text-[10px] text-slate-400 font-normal">(Adjustment)</span>
                            </button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        disabled={isExporting !== null}
                                        className="p-3.5 rounded-2xl bg-slate-100 dark:bg-[#0d1629] hover:bg-slate-200 dark:hover:bg-[#162340] border border-slate-200 dark:border-[#1c2c4d] text-slate-800 dark:text-white font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        <span>Generate Report</span>
                                        <span className="text-[10px] text-slate-400 font-normal">(Ledger)</span>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-52 bg-[#091122] border-[#162340] text-slate-200 rounded-2xl p-1.5 shadow-2xl backdrop-blur-md"
                                >
                                    <DropdownMenuItem
                                        onClick={handleExportExcel}
                                        className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-white/10 hover:text-white text-slate-200 cursor-pointer focus:bg-white/10 focus:text-white transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-white">Export as Excel</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Spreadsheet (.xlsx)</span>
                                        </div>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleExportPDF}
                                        className="flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold rounded-xl hover:bg-white/10 hover:text-white text-slate-200 cursor-pointer focus:bg-white/10 focus:text-white transition-colors"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                            <FileText className="w-4 h-4 text-rose-400" />
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-white">Export as PDF</span>
                                            <span className="text-[10px] text-slate-400 font-normal">Document (.pdf)</span>
                                        </div>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
                )}
            </div>

            {/* Quick Action Dialog (Stock In / Issuance / Adjustment) */}
            <Dialog open={isStockInModalOpen || isIssuanceModalOpen || isAdjustModalOpen} onOpenChange={() => {
                setIsStockInModalOpen(false);
                setIsIssuanceModalOpen(false);
                setIsAdjustModalOpen(false);
            }}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-600">
                            {isStockInModalOpen && "Record Stock In Delivery"}
                            {isIssuanceModalOpen && "Record Medicine Issuance (Out)"}
                            {isAdjustModalOpen && "Record Stock Audit Adjustment"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            This transaction will be appended to the official permanent medicine ledger.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <Label className="text-xs font-semibold">Select Medicine *</Label>
                            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                                <SelectTrigger className="mt-1.5 text-xs rounded-xl">
                                    <SelectValue placeholder="Choose medicine from catalog..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialItems.map((item) => (
                                        <SelectItem key={item.id} value={item.id}>
                                            {item.name} ({item.quantity} {item.unit || "pcs"} available)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs font-semibold">Quantity *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    placeholder="e.g. 50"
                                    value={transQty}
                                    onChange={(e) => setTransQty(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="mt-1.5 text-xs rounded-xl"
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-semibold">Batch / Lot No.</Label>
                                <Input
                                    placeholder="e.g. #BAT-2026-11"
                                    value={transBatch}
                                    onChange={(e) => setTransBatch(e.target.value)}
                                    className="mt-1.5 text-xs rounded-xl"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs font-semibold">Person / Reason / Remarks</Label>
                            <Input
                                placeholder={isStockInModalOpen ? "e.g. Municipal Purchase Order #2026-05" : (isIssuanceModalOpen ? "e.g. Patient Prescription / Clinic Out" : "e.g. Inventory audit recount adjustment")}
                                value={transRemarks}
                                onChange={(e) => setTransRemarks(e.target.value)}
                                className="mt-1.5 text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsStockInModalOpen(false);
                                setIsIssuanceModalOpen(false);
                                setIsAdjustModalOpen(false);
                            }}
                            className="rounded-xl text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                if (isStockInModalOpen) handleSaveMovement("Stock In");
                                if (isIssuanceModalOpen) handleSaveMovement("Issuance");
                                if (isAdjustModalOpen) handleSaveMovement("Adjustment");
                            }}
                            className="bg-[#ff0055] hover:bg-rose-600 text-white rounded-xl text-xs font-bold"
                        >
                            Confirm & Log Entry
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Transaction Details Modal */}
            <Dialog open={!!selectedMovementDetail} onOpenChange={() => setSelectedMovementDetail(null)}>
                <DialogContent className="sm:max-w-[560px] rounded-2xl bg-white dark:bg-[#091122] border-slate-200 dark:border-[#162340]">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2 pr-6">
                            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Eye className="w-4 h-4" />
                                </div>
                                Transaction Details
                            </DialogTitle>
                            {selectedMovementDetail?.referenceNo && (
                                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#162340] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#22355e]">
                                    {selectedMovementDetail.referenceNo}
                                </span>
                            )}
                        </div>
                        <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                            Complete audit record of this medicine transaction and balance history.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedMovementDetail && (
                        <div className="space-y-4 py-2">
                            {/* Type & Impact Banner */}
                            <div className={cn(
                                "p-4 rounded-xl border flex items-center justify-between",
                                selectedMovementDetail.transactionType === "Stock In" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                                selectedMovementDetail.transactionType === "Issuance" && "bg-[#ff0055]/10 border-[#ff0055]/20 text-[#ff0055]",
                                selectedMovementDetail.transactionType === "Adjustment" && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                            )}>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                                        Transaction Type
                                    </span>
                                    <span className="text-base font-black">
                                        {selectedMovementDetail.transactionType}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                                        Quantity Changed
                                    </span>
                                    <span className="text-lg font-black font-mono">
                                        {selectedMovementDetail.quantity > 0 ? `+${selectedMovementDetail.quantity}` : selectedMovementDetail.quantity} {selectedMovementDetail.unit}
                                    </span>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#0d1629] p-4 rounded-xl border border-slate-200 dark:border-[#162340] text-xs">
                                <div className="col-span-2 sm:col-span-1">
                                    <span className="text-slate-400 block text-[11px]">Medicine Name</span>
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                                        {selectedMovementDetail.medicineName}
                                    </span>
                                    {selectedMovementDetail.genericName && (
                                        <span className="text-[11px] text-slate-500 block">
                                            Generic: {selectedMovementDetail.genericName}
                                        </span>
                                    )}
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <span className="text-slate-400 block text-[11px]">Category</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedMovementDetail.category || "Pharmaceutical"}
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 dark:border-[#162340]">
                                    <span className="text-slate-400 block text-[11px]">Batch / Lot No.</span>
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedMovementDetail.batchNumber ? `#${selectedMovementDetail.batchNumber}` : "None Specified"}
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 dark:border-[#162340]">
                                    <span className="text-slate-400 block text-[11px]">Balance After Transaction</span>
                                    <span className="font-bold text-slate-900 dark:text-white">
                                        {selectedMovementDetail.balanceAfter !== undefined && selectedMovementDetail.balanceAfter !== null
                                            ? `${selectedMovementDetail.balanceAfter} ${selectedMovementDetail.unit}`
                                            : "—"}
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 dark:border-[#162340]">
                                    <span className="text-slate-400 block text-[11px]">Facility</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedMovementDetail.facilityName || "Main Rural Health Unit (RHU)"}
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-slate-200/60 dark:border-[#162340]">
                                    <span className="text-slate-400 block text-[11px]">Date & Time</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {new Date(selectedMovementDetail.timestamp).toLocaleString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                        })}
                                    </span>
                                </div>

                                <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-[#162340]">
                                    <span className="text-slate-400 block text-[11px]">Person / Remarks / Reason</span>
                                    <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 whitespace-pre-wrap">
                                        {selectedMovementDetail.personRemarks || "No remarks logged."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:gap-0 pt-2 border-t border-slate-100 dark:border-[#162340]">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                if (selectedMovementDetail?.referenceNo || selectedMovementDetail?.id) {
                                    navigator.clipboard.writeText(selectedMovementDetail.referenceNo || selectedMovementDetail.id);
                                    toast.success("Transaction Reference ID copied to clipboard!");
                                }
                            }}
                            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 gap-1.5 rounded-xl cursor-pointer"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            Copy Ref
                        </Button>
                        <Button
                            onClick={() => setSelectedMovementDetail(null)}
                            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
