"use client";

import React, { useState } from "react";
import { getTickets, getViolatorHistory, processTicketSettlement } from "@/app/admin/poso/actions";
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
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    History,
    AlertTriangle,
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
}: {
    initialTickets: TicketItem[];
    initialTotalCount: number;
}) {
    const router = useRouter();
    const [tickets, setTickets] = useState<TicketItem[]>(initialTickets);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [paymentFilter, setPaymentFilter] = useState("All");
    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [isPending, setIsPending] = useState(false);

    // Violator History Modal State
    const [historyData, setHistoryData] = useState<any | null>(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);

    React.useEffect(() => {
        setTickets(initialTickets);
        setTotalCount(initialTotalCount);
    }, [initialTickets, initialTotalCount]);

    const fetchTickets = React.useCallback(async (p: number, s: string, st: string, pst: string) => {
        setIsPending(true);
        try {
            const res = await getTickets({
                page: p,
                pageSize,
                search: s,
                status: st,
                isPaid: pst,
            });

            if (res.success && res.tickets) {
                setTickets(res.tickets);
                setTotalCount(res.totalCount || 0);
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to load tickets.");
        } finally {
            setIsPending(false);
        }
    }, [pageSize]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSearch(val);
        setPage(1);

        const timeout = setTimeout(() => {
            fetchTickets(1, val, statusFilter, paymentFilter);
        }, 400);
        return () => clearTimeout(timeout);
    };

    const handleStatusChange = (val: string) => {
        setStatusFilter(val);
        setPage(1);
        fetchTickets(1, search, val, paymentFilter);
    };

    const handlePaymentFilterChange = (val: string) => {
        setPaymentFilter(val);
        setPage(1);
        fetchTickets(1, search, statusFilter, val);
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchTickets(newPage, search, statusFilter, paymentFilter);
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
        const unpaidIds = historyData.tickets.filter((t: any) => !t.isPaid).map((t: any) => t.id);
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
            const results = await Promise.all(
                selectedTicketIds.map((id) => processTicketSettlement(id))
            );
            const allSuccess = results.every((r: any) => r.success);
            if (allSuccess) {
                toast.success(`Successfully marked ${selectedTicketIds.length} ticket(s) as PAID!`);
                // Update local modal data
                setHistoryData((prev: any) => {
                    if (!prev) return prev;
                    const updatedTickets = prev.tickets.map((t: any) =>
                        selectedTicketIds.includes(t.id) ? { ...t, status: "RESOLVED", isPaid: true } : t
                    );
                    const newUnpaidCount = updatedTickets.filter((t: any) => !t.isPaid).length;
                    return {
                        ...prev,
                        tickets: updatedTickets,
                        unpaidCount: newUnpaidCount,
                    };
                });
                setSelectedTicketIds([]);
                router.refresh();
            } else {
                toast.error("Some tickets failed to update.");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to process batch payment.");
        } finally {
            setBatchPaying(false);
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
            </div>

            {/* Main Table Card */}
            <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] overflow-hidden shadow-xl ring-1 ring-slate-200 dark:ring-white/5 relative">
                {/* Glassmorphic Loading Overlay */}
                {isPending && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-[#151b2b]/50 backdrop-blur-sm z-20 flex items-center justify-center">
                        <div className="flex items-center space-x-2 bg-white dark:bg-[#1a1f2e] px-4 py-2 rounded-full shadow-lg border border-slate-200 dark:border-[#2a3040]">
                            <RefreshCw className="w-5 h-5 text-rose-600 animate-spin" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Updating tickets...</span>
                        </div>
                    </div>
                )}

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

                    <div className="flex items-center gap-3">
                        <Select value={statusFilter} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[160px] h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-xs">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Ticket Status</SelectItem>
                                <SelectItem value="ISSUED">ISSUED</SelectItem>
                                <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                                <SelectItem value="CONTESTED">CONTESTED</SelectItem>
                                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={paymentFilter} onValueChange={handlePaymentFilterChange}>
                            <SelectTrigger className="w-[160px] h-11 bg-slate-50 dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] font-bold text-xs">
                                <SelectValue placeholder="Payment" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Payment Status</SelectItem>
                                <SelectItem value="UNPAID">UNPAID</SelectItem>
                                <SelectItem value="PAID">PAID</SelectItem>
                            </SelectContent>
                        </Select>
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
                                 tickets.map((item) => (
                                    <TableRow
                                        key={item.id}
                                        onClick={() => router.push(`/admin/poso/tickets/${item.id}`)}
                                        className="group hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-colors border-b border-slate-200 dark:border-[#2a3040] cursor-pointer"
                                    >
                                        <TableCell className="pl-8 py-5 font-black text-xs text-rose-600 dark:text-rose-400 italic uppercase">
                                            {item.ticketNo}
                                        </TableCell>

                                        <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                            {new Date(item.dateTime || item.createdAt).toLocaleDateString("en-PH", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric"
                                            })}
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex flex-col space-y-1">
                                                <span className="text-sm font-black dark:text-white uppercase italic tracking-tight leading-tight">
                                                    {item.violatorName}
                                                </span>
                                                <span className="text-xs text-slate-500 italic">
                                                    License: {item.licenseNo || "N/A"}
                                                </span>
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

                                        <TableCell className="text-center font-black text-sm text-rose-600 dark:text-rose-400 italic">
                                            ₱ {(item.totalAmount + (item.isImpounded ? Number(item.impoundFee || 0) : 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase italic w-fit ${
                                                    item.isPaid
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                                }`}
                                            >
                                                {item.isPaid ? "PAID" : "UNPAID"}
                                            </span>
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
                                ))
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
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                            {historyData.unpaidCount > 0 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleSelectAllUnpaid}
                                                    className="h-8 text-xs font-bold text-blue-600 hover:text-blue-700"
                                                >
                                                    {selectedTicketIds.length === historyData.unpaidCount
                                                        ? "Deselect All Unpaid"
                                                        : "Select All Unpaid"}
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {historyData.tickets.map((t: any, index: number) => {
                                                const isSelected = selectedTicketIds.includes(t.id);
                                                return (
                                                    <div
                                                        key={t.id}
                                                        onClick={() => !t.isPaid && handleToggleSelectTicket(t.id)}
                                                        className={`p-5 rounded-2xl bg-white dark:bg-[#151b2b] border space-y-3 shadow-sm transition-all ${
                                                            !t.isPaid ? "cursor-pointer hover:border-blue-500/50" : "opacity-90"
                                                        } ${
                                                            isSelected
                                                                ? "border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/10"
                                                                : "border-slate-200 dark:border-[#2a3040]"
                                                        }`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#2a3040] pb-3">
                                                            <div className="flex items-center space-x-3">
                                                                {!t.isPaid && (
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isSelected}
                                                                        onChange={() => {}}
                                                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 pointer-events-none"
                                                                    />
                                                                )}
                                                                <span className="w-7 h-7 rounded-full bg-slate-100 dark:bg-[#1a1f2e] text-slate-700 dark:text-slate-200 flex items-center justify-center font-black text-xs">
                                                                    #{historyData.tickets.length - index}
                                                                </span>
                                                                <div>
                                                                    <span className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-tight">
                                                                        {t.ticketNo}
                                                                    </span>
                                                                    <span className="text-xs text-slate-400 block font-medium">
                                                                        Apprehended by: {t.officerName || "POSO Officer"}
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                                                    ₱{t.totalAmount?.toLocaleString()}
                                                                </span>
                                                                <span
                                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase italic ${
                                                                        t.isPaid
                                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                                            : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                                                    }`}
                                                                >
                                                                    {t.isPaid ? "PAID" : "UNPAID"}
                                                                </span>
                                                            </div>
                                                        </div>

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
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    Selected <strong className="text-blue-600">{selectedTicketIds.length} unpaid ticket(s)</strong> for settlement
                                </span>
                                <Button
                                    onClick={handleBatchPay}
                                    disabled={batchPaying}
                                    className="h-10 px-5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg flex items-center gap-2"
                                >
                                    {batchPaying ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    <span>Process Selected Batch Payment</span>
                                </Button>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
