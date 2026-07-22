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
    Search, RefreshCcw, Activity, CheckCircle2,
    Clock, XCircle, Volume2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { getRHUAdminTransactions } from "../actions";
import { fetchAndCallNextTicket } from "@/app/admin/transactions/calling-actions";

function formatDateTime(dateStr?: string | Date): string {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

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

const CHECKUP_TYPES = [
    { id: "ALL", label: "All Consultations" },
    { id: "General Consultation", label: "General Consultation" },
    { id: "Pre-Marital", label: "Pre-Marital" },
    { id: "Prenatal / Maternal", label: "Prenatal / Maternal" },
    { id: "Pediatric", label: "Pediatric" },
    { id: "Dental", label: "Dental" },
    { id: "OTHER", label: "Other" },
];

export default function ConsultationsClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlCheckup = searchParams.get("checkupType") || "ALL";

    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [checkupFilter, setCheckupFilter] = useState(urlCheckup);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        setCheckupFilter(urlCheckup);
        setPage(1);
    }, [urlCheckup]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const txRes = await getRHUAdminTransactions({
                status: statusFilter,
                page,
                limit: 10,
                search,
                checkupType: checkupFilter === "ALL" ? undefined : checkupFilter
            });

            if (txRes.success && txRes.data) {
                setTransactions(txRes.data);
                if (txRes.pagination) {
                    setTotalPages(txRes.pagination.totalPages || 1);
                }
            } else {
                toast.error(txRes.error || "Failed to load RHU consultations.");
            }
        } catch {
            toast.error("Error connecting to server.");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, page, search, checkupFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleCallNextTicket = async () => {
        try {
            const result = await fetchAndCallNextTicket("Rural Health Unit");
            if (result.success && result.data) {
                const txData: any = result.data;
                toast.success(`Now Calling Ticket #${txData.controlNumber || txData.id.slice(0, 8)}`);
                loadData();
            } else {
                toast.info(result.error || "No waiting patients in queue.");
            }
        } catch {
            toast.error("Failed to call next ticket.");
        }
    };

    const getStatusBadge = (tx: any) => {
        if (tx.isCancelled) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-800">
                    <XCircle className="w-3 h-3" /> Cancelled
                </span>
            );
        }

        switch (tx.status) {
            case "COMPLETED":
            case "RELEASED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" /> Completed
                    </span>
                );
            case "EVALUATED":
            case "APPROVED":
            case "FOR_PROCESSING":
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800">
                        <CheckCircle2 className="w-3 h-3" /> Confirmed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-800">
                        <Clock className="w-3 h-3" /> Pending Review
                    </span>
                );
        }
    };

    return (
        <div className="space-y-8 pb-16 w-full max-w-full">
            {/* Header with Counter Selector */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Activity className="w-6 h-6 text-rose-500" />
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">
                            Medical <span className="text-rose-500">Consultations</span>
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        View, evaluate, and manage all clinical check-ups and patient bookings.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Button
                        onClick={handleCallNextTicket}
                        className="h-10 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md active:scale-95 transition-all"
                    >
                        <Volume2 className="w-4 h-4" />
                        Call Next Ticket
                    </Button>
                </div>
            </div>

            {/* Sub-Category Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {CHECKUP_TYPES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => {
                            setCheckupFilter(cat.id);
                            setPage(1);
                            if (cat.id === "ALL") {
                                router.push("/admin/rhu/consultations");
                            } else {
                                router.push(`/admin/rhu/consultations?checkupType=${encodeURIComponent(cat.id)}`);
                            }
                        }}
                        className={cn(
                            "px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all border",
                            checkupFilter === cat.id
                                ? "bg-rose-500 text-white border-rose-500 shadow-md scale-105"
                                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-rose-400"
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Filter & Table Container */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                        <Input
                            placeholder="Search patient name, control #, barangay..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-10 h-10 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                            <SelectTrigger className="h-10 w-44 rounded-2xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-bold">
                                <SelectValue placeholder="Filter Status" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="ALL" className="text-xs font-bold uppercase">All Statuses</SelectItem>
                                <SelectItem value="FOR_INSPECTION" className="text-xs font-bold uppercase">Pending</SelectItem>
                                <SelectItem value="EVALUATED" className="text-xs font-bold uppercase">Confirmed</SelectItem>
                                <SelectItem value="COMPLETED" className="text-xs font-bold uppercase">Completed</SelectItem>
                                <SelectItem value="CANCELLED" className="text-xs font-bold uppercase">Cancelled</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            onClick={loadData}
                            className="h-10 w-10 p-0 rounded-2xl border-slate-200 dark:border-white/10"
                        >
                            <RefreshCcw className={cn("w-4 h-4", loading && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-white/5">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Ref / Control #</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Patient / Applicant</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Check-up Type</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Appt Date & Slot</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Priority</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider italic">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse">
                                        <TableCell className="py-4">
                                            <div className="h-4 w-20 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-36 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                                <div className="h-3 w-24 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-24 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                                <div className="h-3 w-16 bg-slate-100 dark:bg-white/5 rounded-lg" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-white/10 rounded-lg" />
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="h-6 w-28 bg-slate-200 dark:bg-white/10 rounded-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-xs font-bold text-slate-400">
                                        No RHU consultations found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx) => {
                                    const resident = getResidentSnapshot(tx);
                                    const addData = getAdditionalData(tx);

                                    const patientName = resident.firstName
                                        ? `${resident.firstName} ${resident.lastName}`
                                        : tx.user?.name || "N/A";
                                    const isPriority = addData.isPriorityLane;
                                    const checkupDisplay = addData.checkupType === "OTHER"
                                        ? addData.customCheckupType || "Custom Check-up"
                                        : addData.checkupType || tx.type?.name || "Consultation";

                                    return (
                                        <TableRow
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/rhu/${tx.id}`)}
                                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                                        >
                                            <TableCell className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {tx.controlNumber || tx.id.slice(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {patientName}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 italic">
                                                        {addData.relationship ? `For: ${addData.relationship}` : "Self"} • Brgy. {resident.barangay || "Mapandan"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                    {checkupDisplay}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                        {formatDateTime(tx.appointmentDate)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-rose-500 italic">
                                                        {tx.appointmentSlot || "Anytime"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {isPriority ? (
                                                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950/50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-200 dark:border-rose-800">
                                                        Priority Lane
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">Regular</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(tx)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-slate-400">
                            Page {page} of {totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="h-8 rounded-xl text-xs font-bold"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                className="h-8 rounded-xl text-xs font-bold"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
