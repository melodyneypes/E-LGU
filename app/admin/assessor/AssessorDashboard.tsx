"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getAssessorTransactions, evaluateAssessorTransaction } from "@/app/admin/transactions/rpt-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, RefreshCcw, Building2, CheckCircle2, XCircle, Eye, Calendar, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AssessorDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const categoryParam = searchParams.get("category");

    const [transactions, setTransactions] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState<number>(0);
    const [stats, setStats] = useState<{ total: number; pending: number; approved: number }>({
        total: 0,
        pending: 0,
        approved: 0
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>("");
    const [debouncedSearch, setDebouncedSearch] = useState<string>("");
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [rowsPerPage, setRowsPerPage] = useState<number>(10);
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [rejectionRemarks, setRejectionRemarks] = useState<string>("");
    const [isActionPending, setIsActionPending] = useState<boolean>(false);

    // 400ms Debounce for Search input
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
        }, 400);

        return () => {
            clearTimeout(handler);
        };
    }, [search]);

    // Reset pagination to page 1 when search or category changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, categoryParam]);

    const fetchTransactions = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const res = await getAssessorTransactions({
            page: currentPage,
            limit: rowsPerPage,
            search: debouncedSearch,
            category: categoryParam
        });
        if (res.success && res.data) {
            setTransactions(res.data);
            setTotalCount(res.totalCount || 0);
            if (res.stats) {
                setStats(res.stats);
            }
        } else if (!silent) {
            toast.error(res.error || "Failed to load transactions.");
        }
        if (!silent) setLoading(false);
    }, [currentPage, rowsPerPage, debouncedSearch, categoryParam]);

    useEffect(() => {
        fetchTransactions();

        // Supabase Real-Time Live Subscription
        const channel = supabase
            .channel("admin-assessor-realtime-channel")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "Transaction"
                },
                (payload: any) => {
                    console.log("[AssessorDashboard] Realtime change detected:", payload);
                    toast.info("⚡ Realtime Update: Assessor applications updated live.", { id: "realtime-update-assessor" });
                    fetchTransactions(true);
                }
            )
            .subscribe();

        // 10s Fallback Polling
        const interval = setInterval(() => {
            fetchTransactions(true);
        }, 10000);

        return () => {
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
            clearInterval(interval);
        };
    }, [fetchTransactions]);

    const totalPages = Math.ceil(totalCount / rowsPerPage) || 1;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + transactions.length;

    const handleAction = async (action: "APPROVE" | "REJECT" | "SCHEDULE_INSPECTION") => {
        if (!selectedTx) return;
        if (action === "REJECT" && !rejectionRemarks.trim()) {
            toast.error("Please enter a reason for rejection.");
            return;
        }

        setIsActionPending(true);
        const res = await evaluateAssessorTransaction(selectedTx.id, action, rejectionRemarks);
        setIsActionPending(false);

        if (res.success) {
            toast.success(`Application updated successfully (${action})!`);
            setSelectedTx(null);
            setRejectionRemarks("");
            fetchTransactions();
        } else {
            toast.error(res.error || "Action failed.");
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Compact Stats Cards */}
                <div className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm flex items-center justify-between shadow-xs">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Applications</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{stats.total}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <FileText className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/15 backdrop-blur-sm flex items-center justify-between shadow-xs">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Reviews</p>
                        <p className="text-2xl font-black text-amber-600 dark:text-amber-400 leading-tight mt-0.5">{stats.pending}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100/60 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <Building2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/30 bg-emerald-50/40 dark:bg-emerald-950/15 backdrop-blur-sm flex items-center justify-between shadow-xs">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Approved Declarations</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-tight mt-0.5">{stats.approved}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Controls & Search */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search Owner, TDN, Queue #..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 h-10 rounded-xl text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {[
                            { code: null, label: "All Categories" },
{ code: "RPT_CAT1", label: "Cat 1: Routine Tax (Viewing Only)" },
                            { code: "RPT_CAT2", label: "Cat 2: New Property" },
                            { code: "RPT_CAT3", label: "Cat 3: Transfer Ownership" },
                        ].map((cat) => {
                            const isSelected = (!categoryParam && cat.code === null) || categoryParam === cat.code;
                            return (
                                <Button
                                    key={cat.label}
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => router.push(cat.code ? `/admin/assessor?category=${cat.code}` : "/admin/assessor")}
                                    className="h-10 rounded-xl text-xs font-bold"
                                >
                                    {cat.label}
                                </Button>
                            );
                        })}
                    </div>

                    <Button
                        onClick={() => fetchTransactions()}
                        variant="outline"
                        className="h-10 rounded-xl text-xs font-bold"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh Table
                    </Button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                                <TableHead className="w-12 font-bold text-xs uppercase text-slate-500">#</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Queue Ticket</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Owner Name</TableHead>
                                <TableHead className="font-bold text-xs uppercase">TDN & Category</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Barangay</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Assessed Value</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Appt Date</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                Array.from({ length: Math.min(rowsPerPage, 8) }).map((_, i) => (
                                    <TableRow key={`skeleton-row-${i}`} className="border-b border-slate-100 dark:border-slate-800/60 animate-pulse">
                                        <TableCell className="w-12 py-4">
                                            <div className="h-4 w-4 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                        <TableCell>
                                            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700/80 rounded" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs italic">
                                        No RPT applications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((tx, index) => {
                                    const rpt = tx.realPropertyTax || {};
                                    const catName = tx.type?.name || rpt.rptCategory || "RPT";
                                    return (
                                        <TableRow
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/assessor/${tx.id}`)}
                                            className="hover:bg-blue-50/60 dark:hover:bg-blue-950/20 cursor-pointer transition-colors duration-150 group"
                                        >
                                            <TableCell className="w-12 py-3 font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
                                                {startIndex + index + 1}
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 group-hover:underline">
                                                {tx.queueNumber || "N/A"}
                                            </TableCell>
                                            <TableCell className="font-bold text-xs">
                                                {rpt.ownerName || tx.user?.name || "N/A"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="font-mono font-semibold">{rpt.tdn || "N/A"}</div>
                                                <div className="text-[10px] text-slate-500">{catName}</div>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium">
                                                {rpt.barangay || "N/A"}
                                            </TableCell>
                                            <TableCell className="text-xs font-bold text-slate-900 dark:text-white">
                                                ₱{(rpt.assessedValue || tx.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {tx.appointmentDate ? format(new Date(tx.appointmentDate), "MMM dd, yyyy") : "N/A"}
                                                <div className="text-[10px] text-slate-500 font-semibold">{tx.appointmentSlot || ""}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={
                                                    tx.status === "REJECTED" ? "bg-red-500 text-white text-[10px]" :
                                                    rpt.assessorStatus === "APPROVED" ? "bg-emerald-500 text-white text-[10px]" :
                                                    tx.status === "FOR_INSPECTION" ? "bg-blue-600 text-white text-[10px]" :
                                                    "bg-amber-500 text-white text-[10px]"
                                                }>
                                                    {rpt.assessorStatus === "APPROVED" ? "APPROVED" :
                                                     tx.status === "FOR_INSPECTION" ? "FOR_INSPECTION" :
                                                     tx.status === "REJECTED" ? "REJECTED" :
                                                     "SUBMITTED"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Controls — matching Treasury & Resident standard */}
                <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                        <span>Rows per page:</span>
                        <Select value={rowsPerPage.toString()} onValueChange={(value) => {
                            setRowsPerPage(Number(value));
                            setCurrentPage(1);
                        }}>
                            <SelectTrigger className="h-8 w-[72px] border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg text-xs font-bold">
                                <SelectValue placeholder={rowsPerPage.toString()} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#1e293b]">
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="30">30</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            Showing {totalCount === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, totalCount)} of {totalCount}
                        </span>
                        <div className="flex items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1 || loading}
                                className="h-8 px-3 rounded-lg border-slate-200 dark:border-slate-800 text-xs font-bold"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
                            </Button>
                            <div className="text-xs font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {currentPage} / {totalPages}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0 || loading}
                                className="h-8 px-3 rounded-lg border-slate-200 dark:border-slate-800 text-xs font-bold"
                            >
                                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Review Dialog */}
            <Dialog open={!!selectedTx} onOpenChange={(open) => { if (!open) setSelectedTx(null); }}>
                <DialogContent className="max-w-2xl bg-white dark:bg-[#1e293b] rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-600" /> Assessor Property Evaluation
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Review submitted document attachments and approve Tax Declaration for Treasury billing.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTx && (
                        <div className="space-y-4 text-xs">
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 grid grid-cols-2 gap-3 font-medium">
                                <div><span className="text-slate-500">Queue Ticket:</span> <span className="font-mono font-bold text-blue-600">{selectedTx.queueNumber}</span></div>
                                <div><span className="text-slate-500">TDN:</span> <span className="font-mono font-bold">{selectedTx.realPropertyTax?.tdn}</span></div>
                                <div><span className="text-slate-500">Owner Name:</span> <span className="font-bold">{selectedTx.realPropertyTax?.ownerName}</span></div>
                                <div><span className="text-slate-500">Barangay:</span> <span className="font-bold">{selectedTx.realPropertyTax?.barangay}</span></div>
                                <div><span className="text-slate-500">Property Type:</span> <span className="font-bold">{selectedTx.realPropertyTax?.propertyType}</span></div>
                                <div><span className="text-slate-500">Assessed Value:</span> <span className="font-bold text-emerald-600">₱{(selectedTx.realPropertyTax?.assessedValue || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                            </div>

                            {/* Document Links */}
                            <div className="space-y-2">
                                <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500">Submitted Category Attachments</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {[
                                        { label: "Valid Government ID", url: selectedTx.realPropertyTax?.validIdUrl },
                                        { label: "Previous O.R. / SOA", url: selectedTx.realPropertyTax?.previousOrUrl },
                                        { label: "Building / Occupancy Permit", url: selectedTx.realPropertyTax?.buildingPermitUrl },
                                        { label: "Deed of Sale", url: selectedTx.realPropertyTax?.deedOfSaleUrl },
                                        { label: "Land Title (TCT)", url: selectedTx.realPropertyTax?.titleUrl },
                                        { label: "BIR eCAR Certificate", url: selectedTx.realPropertyTax?.birEcarUrl },
                                    ].filter(d => d.url).map((doc, idx) => (
                                        <a
                                            key={idx}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 flex items-center justify-between text-xs font-bold text-blue-600"
                                        >
                                            <span className="flex items-center gap-2"><FileText className="w-4 h-4" /> {doc.label}</span>
                                            <Eye className="w-3.5 h-3.5" />
                                        </a>
                                    ))}
                                </div>
                            </div>

                            {/* Rejection remarks field */}
                            <div className="space-y-1.5 pt-2">
                                <label className="font-bold text-[11px] text-slate-600">Rejection / Evaluation Remarks (Required for Rejection)</label>
                                <Textarea
                                    placeholder="Enter reason if rejecting or requesting revision..."
                                    value={rejectionRemarks}
                                    onChange={(e) => setRejectionRemarks(e.target.value)}
                                    className="text-xs rounded-xl"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button
                            variant="destructive"
                            onClick={() => handleAction("REJECT")}
                            disabled={isActionPending}
                            className="rounded-xl text-xs font-bold"
                        >
                            <XCircle className="w-4 h-4 mr-1" /> Reject Application
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => handleAction("SCHEDULE_INSPECTION")}
                            disabled={isActionPending}
                            className="rounded-xl text-xs font-bold"
                        >
                            <Calendar className="w-4 h-4 mr-1" /> Schedule Inspection
                        </Button>
                        <Button
                            onClick={() => handleAction("APPROVE")}
                            disabled={isActionPending}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve & Send to Treasury
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
