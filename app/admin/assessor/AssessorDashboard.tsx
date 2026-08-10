"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getAssessorTransactions, evaluateAssessorTransaction } from "@/app/admin/transactions/rpt-actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, RefreshCcw, Building2, CheckCircle2, XCircle, Eye, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AssessorDashboard() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const categoryParam = searchParams.get("category");

    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [search, setSearch] = useState<string>("");
    const [selectedTx, setSelectedTx] = useState<any | null>(null);
    const [rejectionRemarks, setRejectionRemarks] = useState<string>("");
    const [isActionPending, setIsActionPending] = useState<boolean>(false);

    const fetchTransactions = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const res = await getAssessorTransactions();
        if (res.success && res.data) {
            setTransactions(res.data);
        } else if (!silent) {
            toast.error(res.error || "Failed to load transactions.");
        }
        if (!silent) setLoading(false);
    }, []);

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

    const filtered = transactions.filter((tx) => {
        const query = search.toLowerCase();
        const rpt = tx.realPropertyTax || {};
        const name = (rpt.ownerName || tx.user?.name || "").toLowerCase();
        const tdn = (rpt.tdn || "").toLowerCase();
        const queueNum = (tx.queueNumber || "").toLowerCase();

        const matchesCategory = !categoryParam || categoryParam === "ALL" || rpt.rptCategory === categoryParam;

        return matchesCategory && (name.includes(query) || tdn.includes(query) || queueNum.includes(query));
    });

    const pendingReviewCount = transactions.filter(t =>
        t.realPropertyTax?.assessorStatus === "PENDING" ||
        t.status === "FOR_INSPECTION" ||
        (t.status === "FOR_REQUESTING" && t.realPropertyTax?.assessorStatus !== "APPROVED")
    ).length;
    const approvedCount = transactions.filter(t => t.realPropertyTax?.assessorStatus === "APPROVED" || t.status === "FOR_REQUESTING" || t.status === "PAID").length;

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
                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Applications</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{transactions.length}</div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-amber-50/50 dark:bg-amber-950/20">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Pending Assessor Reviews</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-black text-amber-600 dark:text-amber-400">{pendingReviewCount}</div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Approved Tax Declarations</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</div>
                    </CardContent>
                </Card>
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
                                <TableHead className="font-bold text-xs uppercase">Queue Ticket</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Owner Name</TableHead>
                                <TableHead className="font-bold text-xs uppercase">TDN & Category</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Barangay</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Assessed Value</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Appt Date</TableHead>
                                <TableHead className="font-bold text-xs uppercase">Status</TableHead>
                                <TableHead className="font-bold text-xs uppercase text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs italic">
                                        Loading Assessor records...
                                    </TableCell>
                                </TableRow>
                            ) : filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs italic">
                                        No RPT applications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((tx) => {
                                    const rpt = tx.realPropertyTax || {};
                                    const catName = tx.type?.name || rpt.rptCategory || "RPT";
                                    return (
<TableRow
                                            key={tx.id}
                                            onClick={() => router.push(`/admin/assessor/${tx.id}`)}
                                            className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 cursor-pointer"
                                        >
                                            <TableCell className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
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
<TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => router.push(`/admin/assessor/${tx.id}`)}
                                                    className="h-8 text-xs font-bold rounded-lg"
                                                >
                                                    <Eye className="w-3.5 h-3.5 mr-1" /> Review
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
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
