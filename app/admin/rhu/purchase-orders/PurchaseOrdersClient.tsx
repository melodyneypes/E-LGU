"use client";

import React, { useState, useEffect, useCallback } from "react";
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
    Search, RefreshCcw, ShoppingCart, CheckCircle2,
    Clock, FileSpreadsheet, FileText, Eye, Pill, Download
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getRHUPurchaseOrders } from "../actions";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

function getResidentSnapshot(tx: any): any {
    if (!tx?.residentSnapshot) return {};
    if (typeof tx.residentSnapshot === 'string') {
        try {
            return JSON.parse(tx.residentSnapshot);
        } catch {
            return {};
        }
    }
    return tx.residentSnapshot;
}

function getAdditionalData(tx: any): any {
    if (!tx?.additionalData) return {};
    if (typeof tx.additionalData === 'string') {
        try {
            return JSON.parse(tx.additionalData);
        } catch {
            return {};
        }
    }
    return tx.additionalData;
}

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function getPOOrdersDisplay(tx: any): string {
    const addData = getAdditionalData(tx);
    const dispenseInfo = addData.dispenseInfo || {};

    if (dispenseInfo.items && Array.isArray(dispenseInfo.items) && dispenseInfo.items.length > 0) {
        return dispenseInfo.items
            .map((item: any) => `• ${item.name} — ${item.quantity} ${item.unit || "pcs"} dispensed`)
            .join("\n");
    }
    if (dispenseInfo.summaryText) {
        return dispenseInfo.summaryText;
    }

    const rawOrders = addData.deos?.orders || addData.deos?.diagnosis || "Prescription Encoded";
    return rawOrders
        .split("\n")
        .map((line: string) => {
            const trimmed = line.trim();
            if (!trimmed) return "";
            const prefix = trimmed.startsWith("•") || trimmed.startsWith("-") ? "" : "• ";
            if (/\b\d+\s*$/.test(trimmed)) {
                return `${prefix}${trimmed} pcs`;
            }
            return `${prefix}${trimmed}`;
        })
        .filter(Boolean)
        .join("\n");
}

export default function PurchaseOrdersClient() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [centerName, setCenterName] = useState<string | null>(null);
    const [staffName, setStaffName] = useState<string | null>(null);

    const [exportPreviewType, setExportPreviewType] = useState<"pdf" | "excel" | null>(null);
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const res: any = await getRHUPurchaseOrders({
                status: statusFilter,
                page,
                limit: 10,
                search
            });

            if (res?.success && res?.data) {
                setTransactions(res.data);
                setAllTransactions(res.allData || res.data);
                setCenterName(res.centerName || null);
                if (res.staffName) {
                    setStaffName(res.staffName);
                }
                if (res.pagination) {
                    setTotalPages(res.pagination.totalPages || 1);
                }
            } else {
                toast.error(res?.error || "Failed to load purchase orders.");
            }
        } catch {
            toast.error("Error connecting to server.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page, search]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const getPOStatusInfo = useCallback((tx: any) => {
        const addData = getAdditionalData(tx);
        const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
        const isDispensed = !!(addData.dispenseInfo || addData.dispensedAt || addData.poDispensedByPharmacy);

        if (tx.isCancelled || rhuStatus === "CANCELLED" || tx.status === "REJECTED") {
            return { label: "CANCELLED", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
        }
        if (rhuStatus === "COMPLETED" || tx.status === "RELEASED" || tx.status === "DELIVERED") {
            return { label: "COMPLETED", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
        }
        if (isDispensed) {
            return { label: "WAITING FOR APPROVAL", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse" };
        }
        return { label: "PRESCRIBED", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" };
    }, []);

    const generatePDFDoc = useCallback(async () => {
        const rawData = allTransactions.length > 0 ? allTransactions : transactions;
        const dataToExport = rawData.filter(tx => {
            const addData = getAdditionalData(tx);
            const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
            return rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
        });
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");

        const doc = new jsPDF({ orientation: "landscape" });

        // Header Section
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("MUNICIPALITY OF MAPANDAN — RURAL HEALTH UNIT (RHU)", 14, 15);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`APPROVED PURCHASE ORDERS SUMMARY REPORT (${centerName || "All Health Centers"})`, 14, 22);
        doc.setFontSize(9);
        doc.text(`Generated Date: ${new Date().toLocaleString("en-PH")} | Total Approved Purchase Orders: ${dataToExport.length}`, 14, 28);

        // Table Rows Formatting
        const tableRows = dataToExport.map((tx, idx) => {
            const resident = getResidentSnapshot(tx);
            const addData = getAdditionalData(tx);
            const controlNo = tx.controlNumber || tx.id.slice(0, 8).toUpperCase();
            const patientName = resident.firstName ? `${resident.firstName} ${resident.lastName}` : tx.user?.name || "N/A";
            const barangay = resident.barangay || "Mapandan";
            const healthCenter = addData.healthCenterName || centerName || "RHU Main";
            const rawPrescription = addData.deos?.orders || addData.deos?.diagnosis || "Prescription Encoded";
            const dispenseInfo = addData.dispenseInfo || {};
            const actualDispensedText = (dispenseInfo.items && Array.isArray(dispenseInfo.items) && dispenseInfo.items.length > 0)
                ? dispenseInfo.items.map((i: any) => `• ${i.name} — ${i.quantity} ${i.unit || "pcs"}`).join("\n")
                : (dispenseInfo.summaryText || "Awaiting Pharmacy Input");
            const apptDate = `${formatDateTime(tx.appointmentDate)} (${tx.appointmentSlot || "Regular"})`;
            const statusInfo = getPOStatusInfo(tx);
            const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
            const isCompleted = rhuStatus === "COMPLETED" || tx.status === "RELEASED" || tx.status === "DELIVERED";
            const fallbackStaff = staffName || (healthCenter ? `${healthCenter} Medical Admin` : "RHU Pharmacy Staff");
            const dispensedBy = dispenseInfo.dispensedBy || addData.dispensedBy || (isCompleted ? fallbackStaff : "Pending Dispense");

            return [
                idx + 1,
                controlNo,
                patientName,
                barangay,
                rawPrescription,
                actualDispensedText,
                apptDate,
                dispensedBy,
                statusInfo.label
            ];
        });

        autoTable(doc, {
            startY: 34,
            head: [["#", "Ref / Control #", "Patient Name", "Barangay", "Doctor Prescribed", "Actual Pharmacy Dispensed Qty", "Appt Date & Slot", "Dispensed By (Pharmacy)", "Status"]],
            body: tableRows,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 8 },
                1: { cellWidth: 22 },
                2: { cellWidth: 30 },
                3: { cellWidth: 20 },
                4: { cellWidth: 42 },
                5: { cellWidth: 45 },
                6: { cellWidth: 32 },
                7: { cellWidth: 35 },
                8: { cellWidth: 24 },
            }
        });

        return doc;
    }, [allTransactions, transactions, centerName, staffName, getPOStatusInfo]);

    const handleExportExcel = async () => {
        try {
            const rawData = allTransactions.length > 0 ? allTransactions : transactions;
            const dataToExport = rawData.filter(tx => {
                const addData = getAdditionalData(tx);
                const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                return rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
            });

            if (dataToExport.length === 0) {
                toast.error("No approved purchase orders available to export.");
                return;
            }

            const XLSX = await import("xlsx");

            // Build rows matching the PDF layout
            const excelRows = dataToExport.map((tx, idx) => {
                const resident = getResidentSnapshot(tx);
                const addData = getAdditionalData(tx);
                const healthCenter = addData.healthCenterName || centerName || "RHU Main";
                const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                const isCompleted = rhuStatus === "COMPLETED" || tx.status === "RELEASED" || tx.status === "DELIVERED";
                const dispenseInfo = addData.dispenseInfo || {};
                const fallbackStaff = staffName || (healthCenter ? `${healthCenter} Medical Admin` : "RHU Pharmacy Staff");
                const dispensedBy = dispenseInfo.dispensedBy || addData.dispensedBy || (isCompleted ? fallbackStaff : "Pending Dispense");
                const rawPrescription = addData.deos?.orders || addData.deos?.diagnosis || "Prescription Encoded";
                const actualDispensedText = (dispenseInfo.items && Array.isArray(dispenseInfo.items) && dispenseInfo.items.length > 0)
                    ? dispenseInfo.items.map((i: any) => `${i.name} — ${i.quantity} ${i.unit || "pcs"}`).join("; ")
                    : (dispenseInfo.summaryText || "Awaiting Pharmacy Input");
                const controlNo = tx.controlNumber || tx.id.slice(0, 8).toUpperCase();
                const patientName = resident.firstName ? `${resident.firstName} ${resident.lastName}` : tx.user?.name || "N/A";
                const barangay = resident.barangay || "Mapandan";
                const apptDate = `${formatDateTime(tx.appointmentDate)} ${tx.appointmentSlot || "Regular"}`;
                const statusInfo = getPOStatusInfo(tx);
                return [
                    idx + 1,
                    controlNo,
                    patientName,
                    barangay,
                    rawPrescription,
                    actualDispensedText,
                    apptDate,
                    dispensedBy,
                    statusInfo.label
                ];
            });

            // Assemble worksheet data with header rows similar to PDF
            const wsData = [
                ["Approved Prescription Purchase Orders Summary"],
                [centerName || "RHU Center"],
                [`Generated: ${new Date().toLocaleString()}`],
                [],
                ["#", "Ref / Control #", "Patient Name", "Barangay", "Doctor Prescribed", "Actual Pharmacy Dispensed Qty", "Appt Date & Slot", "Dispensed By (Pharmacy)", "Status"],
                ...excelRows
            ];

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            // Optional column widths for readability
            ws['!cols'] = [
                { wch: 5 }, { wch: 20 }, { wch: 25 }, { wch: 15 },
                { wch: 30 }, { wch: 30 }, { wch: 25 }, { wch: 25 }, { wch: 15 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Approved Purchase Orders");

            XLSX.writeFile(wb, `RHU_Approved_Purchase_Orders_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Approved purchase orders exported to Excel successfully!");
        } catch (err: any) {
            console.error("Excel Export error:", err);
            toast.error("Failed to export Excel summary.");
        }
    };

    const handleOpenExportModal = async (type: "pdf" | "excel") => {
        const rawData = allTransactions.length > 0 ? allTransactions : transactions;
        const approvedPOs = rawData.filter(tx => {
            const addData = getAdditionalData(tx);
            const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
            return rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
        });
        if (approvedPOs.length === 0) {
            toast.error("No approved purchase orders available to export.");
            return;
        }

        setExportPreviewType(type);
        setGeneratingPreview(true);
        setExportModalOpen(true);

        if (type === "pdf") {
            try {
                const doc = await generatePDFDoc();
                const dataUrl = doc.output("datauristring");
                setPdfPreviewUrl(dataUrl);
            } catch (err) {
                console.error("PDF Preview generation error:", err);
                toast.error("Failed to generate PDF document preview.");
            } finally {
                setGeneratingPreview(false);
            }
        } else {
            setPdfPreviewUrl(null);
            setGeneratingPreview(false);
        }
    };

    const handleConfirmExport = async () => {
        if (exportPreviewType === "pdf") {
            try {
                const doc = await generatePDFDoc();
                doc.save(`RHU_Purchase_Orders_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
                toast.success("PDF summary document exported successfully!");
            } catch {
                toast.error("Failed to export PDF file.");
            }
        } else if (exportPreviewType === "excel") {
            await handleExportExcel();
        }
        setExportModalOpen(false);
    };

    // Calculate Summary Stats
    const totalCount = allTransactions.length;
    const pendingApprovalCount = allTransactions.filter(tx => {
        const addData = getAdditionalData(tx);
        return addData.rhuStatus === "PRESCRIBED";
    }).length;
    const poApprovedCount = allTransactions.filter(tx => {
        const addData = getAdditionalData(tx);
        return addData.rhuStatus === "PO_APPROVED" || tx.status === "FOR_CLAIM";
    }).length;
    const completedCount = allTransactions.filter(tx => {
        const addData = getAdditionalData(tx);
        return addData.rhuStatus === "COMPLETED" || tx.status === "RELEASED" || tx.status === "DELIVERED";
    }).length;

    return (
        <div className="space-y-8 pb-16 w-full max-w-full">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ShoppingCart className="w-6 h-6 text-emerald-500" />
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            RHU <span className="text-emerald-500">Purchase Orders</span>
                        </h1>
                    </div>
                    {centerName && (
                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 opacity-90 pl-1 mb-1 mt-0.5">
                            📍 {centerName}
                        </p>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Manage, track, and export summaries for RHU prescription purchase orders.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        onClick={() => handleOpenExportModal("pdf")}
                        disabled={loading || transactions.length === 0}
                        className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-sm flex items-center gap-2"
                    >
                        <FileText className="w-4 h-4" /> EXPORT PDF
                    </Button>
                    <Button
                        onClick={() => handleOpenExportModal("excel")}
                        disabled={loading || transactions.length === 0}
                        className="h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs rounded-xl shadow-sm flex items-center gap-2"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> EXPORT EXCEL
                    </Button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Orders</span>
                        <ShoppingCart className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{totalCount}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-amber-500">Pending Approval</span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{pendingApprovalCount}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-teal-500">PO Approved</span>
                        <CheckCircle2 className="w-4 h-4 text-teal-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{poApprovedCount}</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-500">Completed & Dispensed</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 dark:text-white">{completedCount}</span>
                </div>
            </div>

            {/* Filter & Controls Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search PO #, patient, control #..."
                        className="pl-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-medium focus-visible:ring-emerald-500"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                        <SelectTrigger className="w-full md:w-60 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            <SelectItem value="ALL" className="text-xs font-bold">All Statuses</SelectItem>
                            <SelectItem value="PRESCRIBED" className="text-xs font-bold">Pending PO Approval</SelectItem>
                            <SelectItem value="PO_APPROVED" className="text-xs font-bold">Approved — Ready to Dispense</SelectItem>
                            <SelectItem value="COMPLETED" className="text-xs font-bold">Completed & Dispensed</SelectItem>
                            <SelectItem value="CANCELLED" className="text-xs font-bold">Cancelled / Rejected</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        onClick={loadData}
                        className="h-10 px-3 rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Purchase Orders Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-white/5">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Ref / Control #</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Patient / Applicant</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic text-sky-600 dark:text-sky-400">Doctor Prescribed</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic text-emerald-600 dark:text-emerald-400">Actual Pharmacy Dispensed Qty</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Appt Date & Slot</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Dispensed By (Pharmacy)</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell className="py-4"><Skeleton className="h-4 w-20 rounded-lg" /></TableCell>
                                        <TableCell className="py-4">
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-4 w-36 rounded-lg" />
                                                <Skeleton className="h-3 w-24 rounded-lg" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4"><Skeleton className="h-4 w-32 rounded-lg" /></TableCell>
                                        <TableCell className="py-4"><Skeleton className="h-4 w-36 rounded-lg" /></TableCell>
                                        <TableCell className="py-4"><Skeleton className="h-4 w-28 rounded-lg" /></TableCell>
                                        <TableCell className="py-4"><Skeleton className="h-4 w-32 rounded-lg" /></TableCell>
                                        <TableCell className="py-4"><Skeleton className="h-6 w-28 rounded-full" /></TableCell>
                                        <TableCell className="py-4 text-right"><Skeleton className="h-8 w-20 rounded-xl ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-40 text-center text-xs font-bold text-slate-400 italic">
                                        No purchase orders found matching your search criteria.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => {
                                    const resident = getResidentSnapshot(tx);
                                    const addData = getAdditionalData(tx);
                                    const controlNo = tx.controlNumber || tx.id.slice(0, 8).toUpperCase();
                                    const patientName = resident.firstName ? `${resident.firstName} ${resident.lastName}` : tx.user?.name || "N/A";
                                    const statusInfo = getPOStatusInfo(tx);
                                    const rawPrescription = addData.deos?.orders || addData.deos?.diagnosis || "Prescription Encoded";
                                    const healthCenter = addData.healthCenterName || centerName || "RHU Main";
                                    const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                                    const isCompleted = rhuStatus === "COMPLETED" || tx.status === "RELEASED" || tx.status === "DELIVERED";
                                    const dispenseInfo = addData.dispenseInfo || {};
                                    const fallbackStaff = staffName || (healthCenter ? `${healthCenter} Medical Admin` : "RHU Pharmacy Staff");
                                    const dispensedBy = dispenseInfo.dispensedBy || addData.dispensedBy || (isCompleted ? fallbackStaff : "Pending");

                                    const actualDispensedText = (dispenseInfo.items && Array.isArray(dispenseInfo.items) && dispenseInfo.items.length > 0)
                                        ? dispenseInfo.items.map((i: any) => `• ${i.name} — ${i.quantity} ${i.unit || "pcs"}`).join("\n")
                                        : (dispenseInfo.summaryText || null);

                                    return (
                                        <TableRow key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                            <TableCell className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {controlNo}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{patientName}</span>
                                                    <span className="text-[10px] text-slate-400">
                                                        For: <span className="font-semibold text-slate-500">{resident.relationship || "Self"}</span> • Brgy. {resident.barangay || "Mapandan"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            {/* Column 3: Doctor Prescribed */}
                                            <TableCell>
                                                <div className="flex items-start gap-2 max-w-xs">
                                                    <Pill className="w-3.5 h-3.5 text-sky-500 mt-0.5 flex-shrink-0" />
                                                    <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold whitespace-pre-line leading-relaxed">
                                                        {rawPrescription}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            {/* Column 4: Actual Pharmacy Dispensed Qty */}
                                            <TableCell>
                                                <div className="flex items-start gap-2 max-w-xs">
                                                    <Pill className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                    {actualDispensedText ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 whitespace-pre-line leading-relaxed">
                                                                {actualDispensedText}
                                                            </span>
                                                            <span className="text-[9px] font-mono text-emerald-500 font-bold mt-0.5">
                                                                ✓ Input by RHU Pharmacy
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[11px] font-medium text-amber-500 italic">
                                                            Awaiting Pharmacy Input
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDateTime(tx.appointmentDate)}</span>
                                                    <span className="text-[10px] font-mono text-rose-500">{tx.appointmentSlot || "Regular"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{dispensedBy}</span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {dispenseInfo.dispensedAt ? formatDateTime(dispenseInfo.dispensedAt) : (isCompleted ? "Dispensed" : "Not yet dispensed")}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusInfo.color}`}>
                                                    <CheckCircle2 className="w-3 h-3" /> {statusInfo.label}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    onClick={() => router.push(`/admin/rhu/purchase-orders/${tx.id}`)}
                                                    className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ml-auto"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> VIEW PO
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls */}
                {!loading && totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-white/10">
                        <span className="text-xs font-semibold text-slate-400">Page {page} of {totalPages}</span>
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                className="h-8 px-3 rounded-xl text-xs"
                            >
                                Previous
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                className="h-8 px-3 rounded-xl text-xs"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Document / Visual Export Preview Modal */}
            <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
                <DialogContent className="w-[94vw] sm:max-w-[94vw] max-w-[94vw] max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl overflow-hidden">
                    <DialogHeader className="pb-3 border-b border-slate-800 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${exportPreviewType === "pdf" ? "bg-rose-500/10 border border-rose-500/30 text-rose-400" : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"}`}>
                                    {exportPreviewType === "pdf" ? <FileText className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                                        {exportPreviewType === "pdf" ? "PDF Document Visual Preview" : "Excel Spreadsheet Visual Preview"}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-slate-400 mt-0.5">
                                        {exportPreviewType === "pdf" 
                                            ? "Interactive PDF Document preview showing exact layout, page numbers, and formatting." 
                                            : "Excel workbook sheet preview showing exact column letters, row numbers, and cell data."}
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Main Visual Preview Area */}
                    <div className="flex-1 my-3 overflow-hidden">
                        {exportPreviewType === "pdf" ? (
                            generatingPreview ? (
                                <div className="h-[60vh] flex flex-col items-center justify-center space-y-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                                    <RefreshCcw className="w-8 h-8 text-rose-500 animate-spin" />
                                    <p className="text-sm font-bold text-slate-300">Generating Document PDF Preview...</p>
                                </div>
                            ) : pdfPreviewUrl ? (
                                <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-white h-[60vh]">
                                    <iframe
                                        src={pdfPreviewUrl}
                                        className="w-full h-full border-none"
                                        title="PDF Document Visual Preview"
                                    />
                                </div>
                            ) : (
                                <div className="h-[60vh] flex items-center justify-center text-slate-400">
                                    Failed to load PDF preview.
                                </div>
                            )
                        ) : (
                            /* Visual Excel Spreadsheet Sheet Preview */
                            <div className="rounded-2xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden h-[60vh] flex flex-col font-sans shadow-inner">
                                {/* Excel Ribbon Top Title Bar */}
                                <div className="bg-emerald-700 text-white px-4 py-2 flex items-center justify-between border-b border-emerald-800 text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                                        <span className="tracking-tight">Microsoft Excel — RHU_Approved_Purchase_Orders.xlsx</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[11px] font-mono">
                                        <span className="bg-emerald-800/80 px-2.5 py-0.5 rounded text-emerald-100">
                                            Worksheet Mode • {
                                                (allTransactions.length > 0 ? allTransactions : transactions).filter(tx => {
                                                    const addData = getAdditionalData(tx);
                                                    const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                                                    return rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
                                                }).length
                                            } Data Rows
                                        </span>
                                    </div>
                                </div>

                                {/* Excel Menu Tabs */}
                                <div className="bg-slate-100 dark:bg-slate-900 px-4 py-1 flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-400 select-none">
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold border-b-2 border-emerald-600 pb-0.5">Home</span>
                                    <span>Insert</span>
                                    <span>Page Layout</span>
                                    <span>Formulas</span>
                                    <span>Data</span>
                                    <span>Review</span>
                                    <span>View</span>
                                </div>

                                {/* Formula Bar Mockup */}
                                <div className="bg-slate-50 dark:bg-slate-950 px-4 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs font-mono text-slate-700 dark:text-slate-300">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">A1</span>
                                    <span className="text-slate-400">fx</span>
                                    <span className="text-slate-800 dark:text-slate-200 font-sans font-medium">RHU Approved Purchase Orders Summary Sheet</span>
                                </div>

                                {/* Spreadsheet Table Grid */}
                                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 text-xs">
                                    <table className="w-full border-collapse text-left border border-slate-200 dark:border-slate-800">
                                        <thead className="bg-slate-200 dark:bg-slate-900 sticky top-0 z-10 text-slate-700 dark:text-slate-300 select-none">
                                            <tr className="border-b border-slate-300 dark:border-slate-800">
                                                <th className="w-10 bg-slate-300 dark:bg-slate-800 text-center font-mono font-bold text-slate-600 dark:text-slate-400 border-r border-b border-slate-300 dark:border-slate-700 py-1.5 text-[10px]">#</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900">A: Control #</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900">B: Patient Name</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900">C: Barangay</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900">D: Health Center</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900 min-w-[220px]">E: Prescribed Orders & Medicines</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900">F: Appt Date & Slot</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900">G: Dispensed By (Pharmacy)</th>
                                                <th className="font-mono text-[11px] font-bold border-r border-b border-slate-300 dark:border-slate-700 px-3 py-1.5 bg-slate-200 dark:bg-slate-900">H: Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-slate-950 font-mono text-slate-900 dark:text-slate-100">
                                            {(() => {
                                                const approvedList = (allTransactions.length > 0 ? allTransactions : transactions).filter(tx => {
                                                    const addData = getAdditionalData(tx);
                                                    const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                                                    return rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
                                                });
                                                return approvedList.map((tx, idx) => {
                                                    const resident = getResidentSnapshot(tx);
                                                    const addData = getAdditionalData(tx);
                                                    const controlNo = tx.controlNumber || tx.id.slice(0, 8).toUpperCase();
                                                    const patientName = resident.firstName ? `${resident.firstName} ${resident.lastName}` : tx.user?.name || "N/A";
                                                    const barangay = resident.barangay || "Mapandan";
                                                    const healthCenter = addData.healthCenterName || centerName || "RHU Main";
                                                    const orders = getPOOrdersDisplay(tx);
                                                    const apptDate = `${formatDateTime(tx.appointmentDate)} (${tx.appointmentSlot || "Regular"})`;
                                                    const statusInfo = getPOStatusInfo(tx);
                                                    const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                                                    const isCompleted = rhuStatus === "COMPLETED" || tx.status === "RELEASED" || tx.status === "DELIVERED";
                                                    const dispenseInfo = addData.dispenseInfo || {};
                                                    const fallbackStaff = staffName || (healthCenter ? `${healthCenter} Medical Admin` : "RHU Pharmacy Staff");
                                                    const dispensedBy = dispenseInfo.dispensedBy || addData.dispensedBy || (isCompleted ? fallbackStaff : "Pending Dispense");

                                                    return (
                                                        <tr key={tx.id || idx} className="hover:bg-emerald-500/10 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                                                            <td className="bg-slate-100 dark:bg-slate-900 text-center font-bold text-slate-500 border-r border-slate-200 dark:border-slate-800 px-2 py-1.5 select-none">{idx + 1}</td>
                                                            <td className="font-mono font-bold text-teal-600 dark:text-teal-300 border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">{controlNo}</td>
                                                            <td className="font-sans font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">{patientName}</td>
                                                            <td className="font-sans text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">{barangay}</td>
                                                            <td className="font-sans text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">{healthCenter}</td>
                                                            <td className="font-sans text-slate-700 dark:text-slate-300 max-w-xs truncate border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">{orders}</td>
                                                            <td className="font-sans text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">{apptDate}</td>
                                                            <td className="font-sans font-semibold text-slate-800 dark:text-slate-200 border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">{dispensedBy}</td>
                                                            <td className="font-sans border-r border-slate-200 dark:border-slate-800 px-3 py-1.5">
                                                                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${statusInfo.color}`}>
                                                                    {statusInfo.label}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}

                                            {/* Empty Worksheet Grid Rows for Authentic Excel Look */}
                                            {(() => {
                                                const approvedCount = (allTransactions.length > 0 ? allTransactions : transactions).filter(tx => {
                                                    const addData = getAdditionalData(tx);
                                                    const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                                                    return rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
                                                }).length;
                                                return Array.from({ length: Math.max(1, 15 - approvedCount) }).map((_, emptyIdx) => {
                                                    const rowNum = approvedCount + emptyIdx + 1;
                                                    return (
                                                        <tr key={`empty-${emptyIdx}`} className="border-b border-slate-200 dark:border-slate-800/60 text-[11px] h-7">
                                                            <td className="bg-slate-100 dark:bg-slate-900 text-center font-bold text-slate-400 dark:text-slate-600 border-r border-slate-200 dark:border-slate-800 px-2 select-none">{rowNum}</td>
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                            <td className="border-r border-slate-200 dark:border-slate-800/60" />
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Excel Bottom Sheet Tab Bar */}
                                <div className="bg-slate-100 dark:bg-slate-900 border-t border-slate-300 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between text-xs select-none">
                                    <div className="flex items-center gap-1">
                                        <span className="px-3 py-1 rounded-t bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1.5 border-t-2 border-emerald-500 border-x border-slate-300 dark:border-slate-700">
                                            <FileSpreadsheet className="w-3.5 h-3.5" /> Sheet1: Approved POs
                                        </span>
                                        <span className="px-2 text-slate-400 text-base font-bold">+</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        100% Zoom • {
                                            (allTransactions.length > 0 ? allTransactions : transactions).filter(tx => {
                                                const addData = getAdditionalData(tx);
                                                const rhuStatus = (addData.rhuStatus || tx.status || "").toUpperCase();
                                                return rhuStatus === "PO_APPROVED" || rhuStatus === "COMPLETED" || tx.status === "FOR_CLAIM" || tx.status === "RELEASED" || tx.status === "DELIVERED";
                                            }).length
                                        } records populated
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Dialog Actions */}
                    <DialogFooter className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3 flex-shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setExportModalOpen(false)}
                            className="h-10 px-4 rounded-xl border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-300 text-xs font-semibold"
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={handleConfirmExport}
                            className={`h-10 px-5 rounded-xl font-extrabold uppercase text-xs text-white shadow-lg flex items-center gap-2 ${exportPreviewType === "pdf" ? "bg-rose-600 hover:bg-rose-500 shadow-rose-900/30" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30"}`}
                        >
                            <Download className="w-4 h-4" /> Download {exportPreviewType === "pdf" ? "PDF Document (.pdf)" : "Excel File (.xlsx)"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
