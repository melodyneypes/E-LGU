"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { getAssessorTransactionById, evaluateAssessorTransaction } from "@/app/admin/transactions/rpt-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
    ArrowLeft, 
    Building2, 
    CheckCircle2, 
    XCircle, 
    Calendar, 
    FileText, 
    Eye, 
    Info, 
    Clock, 
    DollarSign,
    UserCheck,
    MapPin,
    ShieldAlert
} from "lucide-react";

export default function AssessorTransactionDetailPage() {
    const params = useParams();
    const id = params.id as string;

    const [tx, setTx] = useState<any | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [rejectionRemarks, setRejectionRemarks] = useState<string>("");
    const [actionPending, setActionPending] = useState<boolean>(false);

    const [isInspectionDialogOpen, setIsInspectionDialogOpen] = useState<boolean>(false);
    const [inspectionDate, setInspectionDate] = useState<string>("");
    const [inspectionTime, setInspectionTime] = useState<string>("09:00");
    const [inspectionError, setInspectionError] = useState<string>("");

    const todayStr = new Date().toISOString().split("T")[0];

    const loadTransaction = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        const res = await getAssessorTransactionById(id);
        if (res.success && res.data) {
            setTx(res.data);
        } else {
            toast.error(res.error || "Failed to load transaction details.");
        }
        setLoading(false);
    }, [id]);

    useEffect(() => {
        loadTransaction();
    }, [loadTransaction]);

    const handleScheduleInspectionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inspectionDate) {
            setInspectionError("Please select an inspection date.");
            return;
        }
        if (inspectionDate < todayStr) {
            setInspectionError("Past dates are not allowed. Please choose today or a future date.");
            return;
        }
        if (!inspectionTime) {
            setInspectionError("Please select an inspection time slot.");
            return;
        }

        setInspectionError("");
        setActionPending(true);
        const res = await evaluateAssessorTransaction(
            tx.id,
            "SCHEDULE_INSPECTION",
            rejectionRemarks,
            { date: inspectionDate, time: inspectionTime }
        );
        setActionPending(false);

        if (res.success) {
            toast.success(`Ocular field inspection scheduled for ${inspectionDate} at ${inspectionTime}!`);
            setIsInspectionDialogOpen(false);
            loadTransaction();
        } else {
            toast.error(res.error || "Failed to schedule inspection.");
        }
    };

    const handleAction = async (action: "APPROVE" | "REJECT" | "SCHEDULE_INSPECTION") => {
        if (!tx) return;
        if (action === "REJECT" && !rejectionRemarks.trim()) {
            toast.error("Please enter a reason for rejection.");
            return;
        }

        setActionPending(true);
        const res = await evaluateAssessorTransaction(tx.id, action, rejectionRemarks);
        setActionPending(false);

        if (res.success) {
            toast.success(`Application updated successfully (${action})!`);
            loadTransaction();
        } else {
            toast.error(res.error || "Action failed.");
        }
    };

    if (loading) {
        return (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
                <div className="h-8 w-40 bg-slate-900 animate-pulse rounded-lg" />
                <div className="h-64 bg-slate-900/60 animate-pulse rounded-3xl" />
                <div className="h-96 bg-slate-900/60 animate-pulse rounded-3xl" />
            </div>
        );
    }

    if (!tx) {
        return (
            <div className="p-8 max-w-3xl mx-auto text-center space-y-4">
                <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto" />
                <h2 className="text-2xl font-black uppercase text-white italic">Application Not Found</h2>
                <p className="text-slate-400 text-sm">The requested transaction record could not be loaded.</p>
                <Button asChild className="rounded-xl bg-rose-600 hover:bg-rose-700">
                    <Link href="/admin/assessor"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessor Hub</Link>
                </Button>
            </div>
        );
    }

    const rpt = tx.realPropertyTax || {};
    const catCode = rpt.rptCategory || tx.type?.code || "";
    const isCategory1 = catCode === "RPT_CAT1";

    const addData = (typeof tx.additionalData === "string" ? JSON.parse(tx.additionalData || "{}") : tx.additionalData) || {};
    const isCheckedIn = Boolean(addData.checkedIn === true || addData.checkedInAt || tx.checkedIn === true);

    const attachments = [
        { label: "Valid Government ID", url: rpt.validIdUrl },
        { label: "Previous O.R. / SOA", url: rpt.previousOrUrl },
        { label: "Building / Occupancy Permit", url: rpt.buildingPermitUrl },
        { label: "Deed of Sale", url: rpt.deedOfSaleUrl },
        { label: "Land Title (TCT)", url: rpt.titleUrl },
        { label: "BIR eCAR Certificate", url: rpt.birEcarUrl },
    ].filter(d => d.url);

    return (
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto text-slate-100 animate-in fade-in duration-500">
            {/* Navigation Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <Link
                    href="/admin/assessor"
                    className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider italic"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Assessor Hub
                </Link>

                <div className="flex items-center gap-3">
                    <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 font-mono font-black text-xs tracking-wider">
                        TICKET: {tx.queueNumber || "N/A"}
                    </Badge>
                    <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest italic">
                        TYPE OF REQUEST: {rpt.assessorStatus === "APPROVED" ? "APPROVED" : tx.status === "FOR_REQUESTING" ? "SUBMITTED" : tx.status}
                    </Badge>
                </div>
            </div>

            {/* Main Header Banner */}
            <div className="bg-[#0c1017] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl">
                <div className="flex items-start justify-between gap-4 relative z-10">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[9px] font-black uppercase tracking-widest italic">
                            <Info className="w-3.5 h-3.5" /> Transaction Information
                        </div>
                        <h1 className="text-2xl md:text-4xl font-black uppercase italic tracking-tighter text-white">
                            {tx.type?.name || "Real Property Tax Application"}
                        </h1>
                        <p className="text-slate-400 text-xs font-semibold italic">
                            Municipal Assessor Property Declaration & Tax Assessment Evaluation Gateway
                        </p>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-rose-400" />
                    </div>
                </div>
            </div>

            {/* Grid Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Columns: Applicant & Property Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Applicant Profile Card */}
                    <Card className="bg-[#0c1017] border-white/5 rounded-3xl shadow-xl overflow-hidden text-slate-100">
                        <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-rose-400 italic">
                                <UserCheck className="w-4 h-4 text-rose-400" /> Primary Applicant & Property Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Property Owner Name</span>
                                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{rpt.ownerName || tx.user?.name || "N/A"}</h3>
                                </div>
                                <div className="text-left sm:text-right">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Total Amount Due</span>
                                    <div className="text-2xl font-black text-rose-500 font-mono tracking-tighter italic">
                                        ₱{(rpt.totalTaxDue || rpt.assessedValue || tx.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic block">Tax Declaration # (TDN)</span>
                                    <span className="font-mono font-bold text-slate-200">{rpt.tdn || "N/A"}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic block">Property Identification (PIN)</span>
                                    <span className="font-mono font-bold text-slate-200">{rpt.pin || "N/A"}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic block">Barangay Location</span>
                                    <span className="font-bold text-slate-200 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-rose-400" /> {rpt.barangay || "N/A"}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic block">Property Classification</span>
                                    <span className="font-bold text-slate-200 uppercase">{rpt.propertyType || "RESIDENTIAL"}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic block">Appointment Schedule</span>
                                    <span className="font-bold text-slate-200">
                                        {tx.appointmentDate ? format(new Date(tx.appointmentDate), "MMM dd, yyyy") : "N/A"}
                                    </span>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                                    <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest italic block">Appointment Slot</span>
                                    <span className="font-bold text-slate-200">{tx.appointmentSlot || "N/A"}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tax Computation Breakdown */}
                    <Card className="bg-[#0c1017] border-white/5 rounded-3xl shadow-xl overflow-hidden text-slate-100">
                        <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-rose-400 italic">
                                <DollarSign className="w-4 h-4 text-rose-400" /> Tax Assessment Computation Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-3 text-xs">
                            <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                <span className="text-slate-400 font-semibold italic">Basic Real Property Tax (1%)</span>
                                <span className="font-mono font-bold text-slate-200">₱{(rpt.basicTax || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                                <span className="text-slate-400 font-semibold italic">Special Education Fund / SEF Tax (1%)</span>
                                <span className="font-mono font-bold text-slate-200">₱{(rpt.sefTax || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center pt-4 text-sm font-black">
                                <span className="text-slate-300 uppercase italic">Total Tax Amount Due</span>
                                <span className="font-mono text-rose-500 text-xl italic tracking-tighter">₱{(rpt.totalTaxDue || tx.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Category Document Attachments */}
                    <Card className="bg-[#0c1017] border-white/5 rounded-3xl shadow-xl overflow-hidden text-slate-100">
                        <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-rose-400 italic">
                                <FileText className="w-4 h-4 text-rose-400" /> Submitted Category Attachments ({attachments.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            {attachments.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-xs italic">
                                    No document attachments submitted for this transaction.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {attachments.map((doc, idx) => (
                                        <a
                                            key={idx}
                                            href={doc.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-rose-500/40 transition-all flex items-center justify-between group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                                                    <FileText className="w-4 h-4 text-rose-400" />
                                                </div>
                                                <span className="text-xs font-bold text-slate-200 group-hover:text-rose-400 transition-colors">{doc.label}</span>
                                            </div>
                                            <Eye className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Status Timeline & Action Controls */}
                <div className="space-y-6">
                    {/* Status Tracking Card */}
                    <Card className="bg-[#0c1017] border-white/5 rounded-3xl shadow-xl overflow-hidden text-slate-100">
                        <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-rose-400 italic">
                                <Clock className="w-4 h-4 text-rose-400" /> Evaluation Workflow Timeline
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4 text-xs">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 uppercase italic">1. Application Submitted</div>
                                        <div className="text-[10px] text-slate-500">{format(new Date(tx.createdAt), "MMM dd, yyyy hh:mm a")}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                                        tx.status === "FOR_INSPECTION" ? "bg-amber-500/20 border-amber-500/40 text-amber-400" :
                                        tx.status === "FOR_REQUESTING" || rpt.assessorStatus === "APPROVED" || tx.status === "PAID" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                                        "bg-white/5 border-white/10 text-slate-500"
                                    }`}>
                                        <Building2 className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 uppercase italic">2. Assessor Field Inspection / Evaluation</div>
                                        <div className="text-[10px] text-slate-500 font-medium">
                                            {rpt.assessorStatus === "APPROVED" ? "Approved by Assessor" :
                                             (tx.additionalData as any)?.inspectionDate ? `Scheduled: ${format(new Date((tx.additionalData as any).inspectionDate), "MMM dd, yyyy")} @ ${(tx.additionalData as any).inspectionTime || ""}` :
                                             rpt.assessorStatus || "Pending Assessor Review"}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${
                                        rpt.assessorStatus === "APPROVED" || tx.status === "PAID" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                                        "bg-white/5 border-white/10 text-slate-500"
                                    }`}>
                                        <DollarSign className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-200 uppercase italic">3. Treasury Billing & Collection</div>
                                        <div className="text-[10px] text-slate-500">
                                            {tx.status === "PAID" ? "Paid & Cleared" : "Awaiting Treasury Billing"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Action Controls / Evaluation Panel */}
                    <Card className="bg-[#0c1017] border-white/5 rounded-3xl shadow-xl overflow-hidden text-slate-100">
                        <CardHeader className="border-b border-white/5 bg-white/[0.01] p-6">
                            <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-rose-400 italic">
                                <Building2 className="w-4 h-4 text-rose-400" /> Evaluation Action Panel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {isCategory1 ? (
                                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-2">
                                    <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider">
                                        <Info className="w-4 h-4 text-rose-400" /> FOR VIEWING ONLY (CATEGORY 1)
                                    </div>
                                    <p className="text-[11px] leading-relaxed font-medium">
                                        Category 1 (Routine Annual Tax Payment & Tax Clearance) is for viewing only under the Municipal Assessor Office. Billing and collection are processed directly by the Treasury Department.
                                    </p>
                                </div>
                            ) : tx.status === "REJECTED" || rpt.assessorStatus === "REJECTED" ? (
                                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 space-y-3">
                                    <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-red-400">
                                        <XCircle className="w-4 h-4 text-red-400" /> APPLICATION REJECTED
                                    </div>
                                    <p className="text-[11px] leading-relaxed font-medium">
                                        This application has been rejected by the Municipal Assessor Office. Further action buttons are disabled.
                                    </p>
                                    {tx.rejectionRemarks && (
                                        <div className="pt-2 border-t border-red-500/20 text-xs font-semibold italic text-red-200">
                                            Rejection Reason: &quot;{tx.rejectionRemarks}&quot;
                                        </div>
                                    )}
                                </div>
                            ) : rpt.assessorStatus === "APPROVED" || tx.status === "PAID" || tx.status === "RELEASED" ? (
                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                                    <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" /> APPROVED & SENT TO TREASURY
                                    </div>
                                    <p className="text-[11px] leading-relaxed font-medium">
                                        Tax declaration approved by Assessor. Application has been forwarded to Treasury for billing and official receipt issuance.
                                    </p>
                                </div>
                            ) : tx.status === "CANCELLED" ? (
                                <div className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700 text-slate-300 space-y-2">
                                    <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-slate-400">
                                        <ShieldAlert className="w-4 h-4 text-slate-400" /> APPLICATION CANCELLED
                                    </div>
                                    <p className="text-[11px] leading-relaxed font-medium">
                                        This transaction was cancelled by the user. Action buttons are disabled.
                                    </p>
                                </div>
                            ) : !isCheckedIn ? (
                                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                                    <div className="flex items-center gap-2 font-black uppercase text-xs italic tracking-wider text-amber-400">
                                        <Clock className="w-4 h-4 text-amber-400" /> AWAITING CITIZEN CHECK-IN
                                    </div>
                                    <p className="text-[11px] leading-relaxed font-medium">
                                        The applicant must check in at the Municipal Hall Lobby Kiosk on their scheduled appointment date before the Assessor can evaluate or schedule field inspection.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="font-bold text-xs text-slate-300 uppercase tracking-wider block italic">
                                            Rejection / Evaluation Remarks (Required for Rejection)
                                        </label>
                                        <Textarea
                                            placeholder="Enter evaluation notes or reason for rejection..."
                                            value={rejectionRemarks}
                                            onChange={(e) => setRejectionRemarks(e.target.value)}
                                            className="text-xs rounded-2xl bg-white/[0.02] border-white/10 text-slate-200 placeholder:text-slate-600 min-h-[100px]"
                                        />
                                    </div>

                                    <div className="space-y-2.5 pt-2">
                                        {tx.status === "FOR_INSPECTION" ? (
                                            <Button
                                                onClick={() => handleAction("APPROVE")}
                                                disabled={actionPending}
                                                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 text-xs font-black uppercase tracking-wider italic shadow-lg shadow-rose-600/20"
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" /> Approve & Send to Treasury
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => {
                                                    setInspectionError("");
                                                    setIsInspectionDialogOpen(true);
                                                }}
                                                disabled={actionPending}
                                                className="w-full bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-11 text-xs font-black uppercase tracking-wider italic shadow-lg shadow-rose-600/20"
                                            >
                                                <Calendar className="w-4 h-4 mr-2" /> Schedule Field Inspection
                                            </Button>
                                        )}

                                        <Button
                                            onClick={() => handleAction("REJECT")}
                                            disabled={actionPending}
                                            variant="destructive"
                                            className="w-full rounded-xl h-11 text-xs font-bold uppercase tracking-wider italic bg-red-950/60 hover:bg-red-900 border border-red-500/30 text-red-400"
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Reject Application
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Schedule Inspection Modal */}
            <Dialog open={isInspectionDialogOpen} onOpenChange={setIsInspectionDialogOpen}>
                <DialogContent className="max-w-md bg-[#0c1017] border border-white/10 text-white rounded-3xl p-6 shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase italic tracking-tight flex items-center gap-2 text-rose-400">
                            <Calendar className="w-5 h-5 text-rose-400" /> Schedule Field Inspection
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-400 italic">
                            Set the official date and time slot for the Municipal Assessor ocular field assessment.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleScheduleInspectionSubmit} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 italic block">
                                Inspection Date <span className="text-rose-400">*</span>
                            </label>
                            <Input
                                type="date"
                                min={todayStr}
                                value={inspectionDate}
                                onChange={(e) => {
                                    setInspectionDate(e.target.value);
                                    if (e.target.value < todayStr) {
                                        setInspectionError("Past dates are not allowed. Please choose today or a future date.");
                                    } else {
                                        setInspectionError("");
                                    }
                                }}
                                className={`h-11 rounded-xl bg-white/[0.03] border-white/10 text-xs font-bold text-slate-100 ${inspectionError && inspectionDate < todayStr ? "border-red-500 ring-1 ring-red-500" : ""}`}
                                required
                            />
                            {inspectionError && inspectionDate < todayStr && (
                                <p className="text-[10px] text-red-500 font-medium">Past dates are not allowed. Please choose today or a future date.</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-slate-300 italic block">
                                Time Slot <span className="text-rose-400">*</span>
                            </label>
                            <Input
                                type="time"
                                value={inspectionTime}
                                onChange={(e) => setInspectionTime(e.target.value)}
                                className="h-11 rounded-xl bg-white/[0.03] border-white/10 text-xs font-bold text-slate-100"
                                required
                            />
                        </div>

                        {inspectionError && inspectionDate >= todayStr && (
                            <p className="text-[10px] text-red-500 font-medium">{inspectionError}</p>
                        )}

                        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-white/5">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsInspectionDialogOpen(false)}
                                className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 text-xs font-bold uppercase"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={actionPending || (!!inspectionDate && inspectionDate < todayStr)}
                                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider italic"
                            >
                                {actionPending ? "Scheduling..." : "Confirm & Schedule Inspection"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
