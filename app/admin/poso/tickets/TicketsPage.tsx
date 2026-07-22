"use client";

import React, { useState } from "react";
import { getTickets, getTicketById, updateTicketStatus } from "@/app/admin/poso/actions";
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
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ShieldAlert,
    Search,
    Eye,
    RefreshCw,
    X,
    FileSpreadsheet,
    Calendar,
    MapPin,
    UserCheck,
    CreditCard,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
    paymentStatus: string;
    createdAt: Date;
    transactionId?: string | null;
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
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);

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
                paymentStatus: pst,
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
        fetchTickets(1, val, statusFilter, paymentFilter);
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

    const handleViewDetail = async (id: string) => {
        setLoadingDetail(true);
        setIsDetailModalOpen(true);
        try {
            const res = await getTicketById(id);
            if (res.success && res.ticket) {
                setSelectedTicket(res.ticket);
            } else {
                toast.error(res.error || "Failed to load ticket details.");
                setIsDetailModalOpen(false);
            }
        } catch (err: any) {
            toast.error(err.message || "Error fetching details.");
            setIsDetailModalOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleUpdateStatus = async (status: string, paymentStatus?: string) => {
        if (!selectedTicket) return;
        try {
            const res = await updateTicketStatus(selectedTicket.id, status, paymentStatus);
            if (res.success) {
                toast.success("Ticket status updated!");
                setSelectedTicket((prev: any) => ({
                    ...prev,
                    status: res.ticket.status,
                    paymentStatus: res.ticket.paymentStatus,
                }));
                router.refresh();
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch (err: any) {
            toast.error(err.message || "Error updating status.");
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
                                <TableHead className="w-[240px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Violator Details
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Plate / Vehicle
                                </TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Enforcer Officer
                                </TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Total Fine
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
                            {tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-64 text-center">
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
                                        className="group hover:bg-rose-50/20 dark:hover:bg-rose-950/10 transition-colors border-b border-slate-200 dark:border-[#2a3040]"
                                    >
                                        <TableCell className="pl-8 py-5 font-black text-xs text-rose-600 dark:text-rose-400 italic uppercase">
                                            {item.ticketNo}
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
                                            {item.plateNo || "N/A"}
                                        </TableCell>

                                        <TableCell className="font-semibold text-xs text-slate-600 dark:text-slate-400">
                                            {item.officerName || "POSO Enforcer"}
                                        </TableCell>

                                        <TableCell className="text-center font-black text-sm text-rose-600 dark:text-rose-400 italic">
                                            ₱ {item.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase italic w-fit ${
                                                    item.paymentStatus === "PAID"
                                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                                                        : "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                                                }`}
                                            >
                                                {item.paymentStatus}
                                            </span>
                                        </TableCell>

                                        <TableCell className="text-right pr-8">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleViewDetail(item.id)}
                                                className="h-9 px-4 rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 font-bold text-xs transition-all"
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                View Details
                                            </Button>
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

            {/* Ticket Detail Modal */}
            <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                <DialogContent showCloseButton={false} className="sm:max-w-4xl p-0 overflow-hidden bg-slate-50 dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-2xl">
                    <div className="relative flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]">
                        {/* Header */}
                        <div className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] bg-rose-50/40 dark:bg-rose-950/20 flex flex-row items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-rose-600 text-white shadow-lg shadow-rose-600/30">
                                    <ShieldAlert className="w-5 h-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                        Citation Ticket #{selectedTicket?.ticketNo || "..."}
                                    </DialogTitle>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Issued by {selectedTicket?.officerName || "POSO Officer"}
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsDetailModalOpen(false)}
                                className="h-10 w-10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 z-50 shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 pb-24 overflow-y-auto custom-scrollbar space-y-8">
                            {loadingDetail ? (
                                <div className="h-64 flex items-center justify-center space-x-3 text-slate-500">
                                    <RefreshCw className="w-6 h-6 animate-spin text-rose-600" />
                                    <span className="font-bold">Loading citation details...</span>
                                </div>
                            ) : selectedTicket ? (
                                <>
                                    {/* Violator & Vehicle Snapshot Card */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-[#151b2b] p-6 rounded-2xl border border-slate-200 dark:border-[#2a3040]">
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center">
                                                <UserCheck className="w-4 h-4 mr-2 text-rose-600" /> Violator Details
                                            </h3>
                                            <p className="text-lg font-black text-slate-900 dark:text-white uppercase italic">
                                                {selectedTicket.violatorName}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                <span className="font-bold">License No:</span> {selectedTicket.licenseNo || "N/A"}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                <span className="font-bold">Address:</span> {selectedTicket.violatorAddress || "N/A"}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                <span className="font-bold">Birth Date:</span> {selectedTicket.birthDate || "N/A"}
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center">
                                                <MapPin className="w-4 h-4 mr-2 text-rose-600" /> Apprehension & Vehicle
                                            </h3>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                <span className="font-bold">Plate No:</span> {selectedTicket.plateNo || "N/A"} ({selectedTicket.typeOfVehicle || "Vehicle"})
                                            </p>
                                            {selectedTicket.puvBodyName && (
                                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                                    <span className="font-bold">PUV / TODA:</span> {selectedTicket.puvBodyName} #{selectedTicket.puvBodyNo || ""}
                                                </p>
                                            )}
                                            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
                                                <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" /> {selectedTicket.location || "Mapandan"}, {selectedTicket.barangay || ""}
                                            </p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center">
                                                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> {new Date(selectedTicket.dateTime).toLocaleString("en-PH")}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Violations List Table */}
                                    <div className="space-y-3">
                                        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                            Recorded Violations & Fines
                                        </h3>
                                        <div className="border border-slate-200 dark:border-[#2a3040] rounded-xl overflow-hidden">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-100 dark:bg-[#1a1f2e]">
                                                        <TableHead className="font-bold text-xs">Violation Name</TableHead>
                                                        <TableHead className="text-center font-bold text-xs">Offense Level</TableHead>
                                                        <TableHead className="text-right font-bold text-xs pr-6">Amount</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {selectedTicket.ticketDetails?.map((d: any) => (
                                                        <TableRow key={d.id}>
                                                            <TableCell className="font-bold text-xs">{d.violationName}</TableCell>
                                                            <TableCell className="text-center font-bold text-xs">
                                                                {d.offenseLevel === 1 ? "1st Offense" : d.offenseLevel === 2 ? "2nd Offense" : "3rd Offense"}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold text-xs text-rose-600 pr-6">
                                                                ₱ {d.amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 flex justify-between items-center border-t border-slate-200 dark:border-[#2a3040]">
                                                <span className="font-black uppercase text-xs text-slate-700 dark:text-slate-300">Total Citation Fine</span>
                                                <span className="font-black text-xl text-rose-600 italic">
                                                    ₱ {selectedTicket.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Evidentiary Photos & Signature */}
                                    {selectedTicket.ticketPhotos && selectedTicket.ticketPhotos.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                                                Evidentiary Photos ({selectedTicket.ticketPhotos.length})
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {selectedTicket.ticketPhotos.map((photo: any) => (
                                                    <div key={photo.id} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-[#2a3040] bg-slate-900">
                                                        <Image
                                                            src={photo.photoUrl}
                                                            alt="Violation photo"
                                                            fill
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>

                        {/* Footer Quick Actions */}
                        {selectedTicket && (
                            <div className="p-6 sticky bottom-0 bg-white dark:bg-[#0f1117] border-t border-slate-200 dark:border-[#2a3040] flex justify-between items-center z-50">
                                <div className="flex items-center space-x-2">
                                    <CreditCard className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs font-bold text-slate-500">
                                        Treasury Status: <strong className="text-slate-900 dark:text-white uppercase">{selectedTicket.paymentStatus}</strong>
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    {selectedTicket.paymentStatus !== "PAID" && (
                                        <Button
                                            onClick={() => handleUpdateStatus("RESOLVED", "PAID")}
                                            className="h-10 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark as Paid (Manual)
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
