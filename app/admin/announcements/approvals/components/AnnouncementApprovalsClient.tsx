"use client";

import React, { useState } from "react";
import { 
    CheckCircle2, XCircle, Clock, Search,
    Calendar, User, Check, X,
    RefreshCw, Eye, Megaphone, Image as ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { approveAnnouncement, rejectAnnouncement } from "@/app/admin/content/Announcements/actions/announcements.actions";

export interface ApprovalAnnouncementItem {
    id: string;
    title: string;
    content: string;
    priority: string;
    category: string;
    department?: string | null;
    approvalStatus?: string | null;
    submittedBy?: string | null;
    approvedBy?: string | null;
    rejectionReason?: string | null;
    imageUrl?: string | null;
    isPinned: boolean;
    isActive: boolean;
    barangay?: string | null;
    expiryDate?: Date | string | null;
    eventDate?: Date | string | null;
    eventSchedule?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

interface Props {
    initialData: ApprovalAnnouncementItem[];
    stats: {
        pending: number;
        approved: number;
        rejected: number;
        total: number;
    };
    currentUserRole?: string;
}

export function AnnouncementApprovalsClient({ initialData, stats }: Props) {
    const router = useRouter();
    const [items, setItems] = useState<ApprovalAnnouncementItem[]>(initialData);
    const [search, setSearch] = useState("");
    const [selectedTab, setSelectedTab] = useState<"PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "ALL">("PENDING_APPROVAL");
    const [selectedDept, setSelectedDept] = useState<string>("ALL");

    const [selectedItem, setSelectedItem] = useState<ApprovalAnnouncementItem | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectingItem, setRejectingItem] = useState<ApprovalAnnouncementItem | null>(null);
    const [rejectionReason, setRejectionReason] = useState("");

    const [processingId, setProcessingId] = useState<string | null>(null);

    // Filter items
    const filteredItems = items.filter((item) => {
        const itemStatus = item.approvalStatus || "PENDING_APPROVAL";
        if (selectedTab !== "ALL" && itemStatus !== selectedTab) return false;

        const itemDept = item.department || (item.category === "Business" ? "BPLO" : "GENERAL");
        if (selectedDept !== "ALL" && itemDept !== selectedDept) return false;

        if (search.trim()) {
            const q = search.toLowerCase();
            const titleMatch = item.title.toLowerCase().includes(q);
            const contentMatch = item.content?.toLowerCase().includes(q);
            const submitterMatch = item.submittedBy?.toLowerCase().includes(q);
            if (!titleMatch && !contentMatch && !submitterMatch) return false;
        }

        return true;
    });

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            const res = await approveAnnouncement(id);
            if (res.success) {
                toast.success("Announcement approved successfully and published live!");
                setItems((prev) =>
                    prev.map((i) =>
                        i.id === id
                            ? { ...i, approvalStatus: "APPROVED", isActive: true, approvedBy: "LGU Admin" }
                            : i
                    )
                );
                router.refresh();
            } else {
                toast.error(res.error || "Failed to approve announcement");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to approve announcement");
        } finally {
            setProcessingId(null);
            if (viewModalOpen) setViewModalOpen(false);
        }
    };

    const handleOpenReject = (item: ApprovalAnnouncementItem) => {
        setRejectingItem(item);
        setRejectionReason("");
        setRejectModalOpen(true);
    };

    const handleConfirmReject = async () => {
        if (!rejectingItem) return;
        setProcessingId(rejectingItem.id);
        try {
            const res = await rejectAnnouncement(rejectingItem.id, rejectionReason.trim());
            if (res.success) {
                toast.error("Announcement request was rejected.");
                setItems((prev) =>
                    prev.map((i) =>
                        i.id === rejectingItem.id
                            ? { ...i, approvalStatus: "REJECTED", rejectionReason: rejectionReason.trim() }
                            : i
                    )
                );
                setRejectModalOpen(false);
                if (viewModalOpen) setViewModalOpen(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to reject announcement");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to reject announcement");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white italic">
                            Announcement Approvals
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                        Review, approve, or reject municipal and departmental advisories before they go live on public portals.
                    </p>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.refresh()}
                    className="gap-2 rounded-xl text-xs font-bold self-start md:self-auto border-slate-200 dark:border-white/10"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh Queue
                </Button>
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                    onClick={() => setSelectedTab("PENDING_APPROVAL")}
                    className={`border-none shadow-sm cursor-pointer rounded-2xl transition-all duration-300 ring-1 ${
                        selectedTab === "PENDING_APPROVAL" 
                            ? "bg-amber-500/10 dark:bg-amber-500/15 ring-amber-500/50 shadow-amber-500/10" 
                            : "bg-white dark:bg-[#151b2b] ring-slate-200 dark:ring-white/5 hover:ring-amber-500/30"
                    }`}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Pending Review
                            </p>
                            <h3 className="text-3xl font-black italic tracking-tighter text-amber-600 dark:text-amber-400 mt-1">
                                {stats.pending}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-500">
                            <Clock className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => setSelectedTab("APPROVED")}
                    className={`border-none shadow-sm cursor-pointer rounded-2xl transition-all duration-300 ring-1 ${
                        selectedTab === "APPROVED" 
                            ? "bg-emerald-500/10 dark:bg-emerald-500/15 ring-emerald-500/50 shadow-emerald-500/10" 
                            : "bg-white dark:bg-[#151b2b] ring-slate-200 dark:ring-white/5 hover:ring-emerald-500/30"
                    }`}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Approved & Live
                            </p>
                            <h3 className="text-3xl font-black italic tracking-tighter text-emerald-600 dark:text-emerald-400 mt-1">
                                {stats.approved}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-500">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => setSelectedTab("REJECTED")}
                    className={`border-none shadow-sm cursor-pointer rounded-2xl transition-all duration-300 ring-1 ${
                        selectedTab === "REJECTED" 
                            ? "bg-rose-500/10 dark:bg-rose-500/15 ring-rose-500/50 shadow-rose-500/10" 
                            : "bg-white dark:bg-[#151b2b] ring-slate-200 dark:ring-white/5 hover:ring-rose-500/30"
                    }`}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Rejected
                            </p>
                            <h3 className="text-3xl font-black italic tracking-tighter text-rose-600 dark:text-rose-400 mt-1">
                                {stats.rejected}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-500">
                            <XCircle className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card 
                    onClick={() => setSelectedTab("ALL")}
                    className={`border-none shadow-sm cursor-pointer rounded-2xl transition-all duration-300 ring-1 ${
                        selectedTab === "ALL" 
                            ? "bg-blue-500/10 dark:bg-blue-500/15 ring-blue-500/50 shadow-blue-500/10" 
                            : "bg-white dark:bg-[#151b2b] ring-slate-200 dark:ring-white/5 hover:ring-blue-500/30"
                    }`}
                >
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Total In Queue
                            </p>
                            <h3 className="text-3xl font-black italic tracking-tighter text-blue-600 dark:text-blue-400 mt-1">
                                {stats.total}
                            </h3>
                        </div>
                        <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-500">
                            <Megaphone className="w-5 h-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-[#151b2b] p-4 rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title, content, submitter..."
                        className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-[#1e2433] border-none text-xs font-medium focus-visible:ring-1"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {/* Status Tabs */}
                    <div className="flex items-center bg-slate-100 dark:bg-[#1e2433] p-1 rounded-xl">
                        <button
                            onClick={() => setSelectedTab("PENDING_APPROVAL")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                selectedTab === "PENDING_APPROVAL"
                                    ? "bg-white dark:bg-[#2a3246] text-amber-600 dark:text-amber-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                        >
                            Pending ({stats.pending})
                        </button>
                        <button
                            onClick={() => setSelectedTab("APPROVED")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                selectedTab === "APPROVED"
                                    ? "bg-white dark:bg-[#2a3246] text-emerald-600 dark:text-emerald-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                        >
                            Approved
                        </button>
                        <button
                            onClick={() => setSelectedTab("REJECTED")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                selectedTab === "REJECTED"
                                    ? "bg-white dark:bg-[#2a3246] text-rose-600 dark:text-rose-400 shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                        >
                            Rejected
                        </button>
                        <button
                            onClick={() => setSelectedTab("ALL")}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                selectedTab === "ALL"
                                    ? "bg-white dark:bg-[#2a3246] text-slate-900 dark:text-white shadow-sm"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            }`}
                        >
                            All
                        </button>
                    </div>

                    {/* Department Selector */}
                    <select
                        value={selectedDept}
                        onChange={(e) => setSelectedDept(e.target.value)}
                        className="h-9 px-3 rounded-xl bg-slate-100 dark:bg-[#1e2433] text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 border-none outline-none focus:ring-1 focus:ring-slate-300"
                    >
                        <option value="ALL">All Departments</option>
                        <option value="BPLO">BPLO</option>
                        <option value="RHU">RHU (Health)</option>
                        <option value="GENERAL">General / LGU</option>
                    </select>
                </div>
            </div>

            {/* List / Cards */}
            {filteredItems.length === 0 ? (
                <div className="bg-white dark:bg-[#151b2b] rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 italic">
                        {selectedTab === "PENDING_APPROVAL" ? "No Pending Approvals" : "No Announcements Found"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        {selectedTab === "PENDING_APPROVAL"
                            ? "All departmental announcements have been reviewed. New draft submissions will automatically appear here."
                            : "No announcement items matched your active search or filter parameters."}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredItems.map((item) => {
                        const isPending = item.approvalStatus === "PENDING_APPROVAL" || !item.approvalStatus;
                        const isApproved = item.approvalStatus === "APPROVED";
                        const isRejected = item.approvalStatus === "REJECTED";
                        const dept = item.department || (item.category === "Business" ? "BPLO" : "GENERAL");

                        return (
                            <div
                                key={item.id}
                                className="bg-white dark:bg-[#151b2b] rounded-2xl ring-1 ring-slate-200 dark:ring-white/5 p-5 md:p-6 transition-all duration-300 hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6"
                            >
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                    {/* Thumbnail preview */}
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                                        {item.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={item.imageUrl}
                                                alt={item.title}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <ImageIcon className="w-6 h-6 text-slate-400" />
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                                {dept}
                                            </span>

                                            {isPending && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                    <Clock className="w-3 h-3" /> Needs Review
                                                </span>
                                            )}

                                            {isApproved && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                    <Check className="w-3 h-3" /> Approved
                                                </span>
                                            )}

                                            {isRejected && (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                    <X className="w-3 h-3" /> Rejected
                                                </span>
                                            )}

                                            <span className="text-[10px] font-bold text-slate-400">
                                                • {item.priority} Priority
                                            </span>
                                        </div>

                                        <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight uppercase italic leading-snug truncate">
                                            {item.title}
                                        </h3>

                                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                            {item.content}
                                        </p>

                                        {/* Submitter & date meta */}
                                        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-400 pt-1 flex-wrap">
                                            {item.submittedBy && (
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3 text-slate-500" />
                                                    <span>By: {item.submittedBy}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-slate-500" />
                                                <span>Submitted: {format(new Date(item.createdAt), "MMM d, yyyy")}</span>
                                            </div>

                                            {item.eventDate && (
                                                <div className="flex items-center gap-1 text-emerald-500 font-bold">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>Event: {format(new Date(item.eventDate), "MMM d, yyyy")}</span>
                                                </div>
                                            )}

                                            {isRejected && item.rejectionReason && (
                                                <div className="w-full text-rose-500 text-[11px] font-bold bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20 mt-1">
                                                    Reason for rejection: {item.rejectionReason}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedItem(item);
                                            setViewModalOpen(true);
                                        }}
                                        className="rounded-xl text-xs font-bold h-9 px-3 gap-1.5 border-slate-200 dark:border-white/10"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        Preview
                                    </Button>

                                    {isPending && (
                                        <>
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenReject(item)}
                                                disabled={processingId === item.id}
                                                className="rounded-xl text-xs font-black uppercase tracking-wider h-9 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 gap-1.5 shadow-none"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Reject
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(item.id)}
                                                disabled={processingId === item.id}
                                                className="rounded-xl text-xs font-black uppercase tracking-wider h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-md"
                                            >
                                                {processingId === item.id ? (
                                                    <span className="w-3.5 h-3.5 rounded-full border border-white border-t-transparent animate-spin" />
                                                ) : (
                                                    <Check className="w-3.5 h-3.5" />
                                                )}
                                                Approve Notice
                                            </Button>
                                        </>
                                    )}

                                    {isApproved && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenReject(item)}
                                            disabled={processingId === item.id}
                                            className="rounded-xl text-xs font-bold text-slate-400 hover:text-rose-500"
                                        >
                                            Revoke / Reject
                                        </Button>
                                    )}

                                    {isRejected && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleApprove(item.id)}
                                            disabled={processingId === item.id}
                                            className="rounded-xl text-xs font-bold text-slate-400 hover:text-emerald-500"
                                        >
                                            Re-Approve
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Preview Modal */}
            <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
                    {selectedItem && (
                        <div className="space-y-6">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                        {selectedItem.department || "BPLO"}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        Priority: {selectedItem.priority}
                                    </span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white italic">
                                    {selectedItem.title}
                                </h2>
                            </div>

                            {selectedItem.imageUrl && (
                                <div className="w-full h-56 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={selectedItem.imageUrl}
                                        alt={selectedItem.title}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            <div className="bg-slate-50 dark:bg-[#1a2030] p-4 rounded-2xl space-y-2 border border-slate-100 dark:border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Announcement Details</h4>
                                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {selectedItem.content}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                <div className="p-3 bg-slate-50 dark:bg-[#1a2030] rounded-xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Submitted By</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.submittedBy || "Staff"}</span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-[#1a2030] rounded-xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Event Date</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {selectedItem.eventDate ? format(new Date(selectedItem.eventDate), "MMM d, yyyy") : "N/A"}
                                    </span>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-[#1a2030] rounded-xl">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Schedule</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.eventSchedule || "N/A"}</span>
                                </div>
                            </div>

                            <DialogFooter className="flex flex-row justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                                <Button
                                    variant="outline"
                                    onClick={() => setViewModalOpen(false)}
                                    className="rounded-xl text-xs font-bold"
                                >
                                    Close
                                </Button>
                                {selectedItem.approvalStatus === "PENDING_APPROVAL" && (
                                    <>
                                        <Button
                                            variant="destructive"
                                            onClick={() => {
                                                setViewModalOpen(false);
                                                handleOpenReject(selectedItem);
                                            }}
                                            className="rounded-xl text-xs font-bold"
                                        >
                                            Reject
                                        </Button>
                                        <Button
                                            onClick={() => handleApprove(selectedItem.id)}
                                            disabled={processingId === selectedItem.id}
                                            className="rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white"
                                        >
                                            Approve Notice
                                        </Button>
                                    </>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rejection Note Modal */}
            <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
                <DialogContent className="max-w-md rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black uppercase tracking-tight text-rose-600 flex items-center gap-2">
                            <XCircle className="w-5 h-5" /> Reject Announcement
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Please provide a reason or note for rejecting this announcement submission. This will be visible to the submitting department.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2">
                        <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="E.g., Incomplete schedule information or outdated banner graphic..."
                            className="min-h-[100px] text-xs rounded-xl"
                        />
                    </div>

                    <DialogFooter className="flex flex-row justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setRejectModalOpen(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleConfirmReject}
                            disabled={processingId !== null}
                            className="rounded-xl text-xs font-bold"
                        >
                            Confirm Rejection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
