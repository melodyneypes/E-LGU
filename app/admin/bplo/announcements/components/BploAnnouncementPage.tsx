"use client";

import React, { useState } from "react";
import { 
    Megaphone, 
    Search, 
    Clock, 
    CheckCircle2, 
    XCircle, 
    Pin, 
    Calendar, 
    Edit, 
    Trash2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BploAddAnnouncementModal } from "./BploAddAnnouncementModal";
import { deleteBploAnnouncement, toggleBploAnnouncementStatus } from "../actions";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

interface BploAnnouncementPageProps {
    initialData: any[];
    totalCount: number;
}

export function BploAnnouncementPage({ initialData = [], totalCount }: BploAnnouncementPageProps) {
    const router = useRouter();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const filtered = initialData.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
            item.content.toLowerCase().includes(search.toLowerCase());
        
        const itemStatus = item.approvalStatus || "PENDING_APPROVAL";
        const matchesStatus = statusFilter === "ALL" || itemStatus === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const pendingCount = initialData.filter(a => a.approvalStatus === "PENDING_APPROVAL" || !a.approvalStatus).length;
    const approvedCount = initialData.filter(a => a.approvalStatus === "APPROVED").length;
    const rejectedCount = initialData.filter(a => a.approvalStatus === "REJECTED").length;

    const handleDelete = async () => {
        if (!deleteId) return;
        setDeleting(true);
        try {
            const res = await deleteBploAnnouncement(deleteId);
            if (res.success) {
                toast.success("Announcement deleted successfully!");
                setDeleteId(null);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to delete announcement");
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to delete announcement");
        } finally {
            setDeleting(false);
        }
    };

    const handleToggleActive = async (id: string, current: boolean) => {
        try {
            const res = await toggleBploAnnouncementStatus(id, !current);
            if (res.success) {
                toast.success(`Announcement ${!current ? 'activated' : 'deactivated'}`);
                router.refresh();
            }
        } catch {
            toast.error("Failed to toggle status");
        }
    };

    return (
        <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-2 h-7 sm:h-8 bg-primary rounded-full" />
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">
                            BPLO <span className="text-primary italic tracking-normal">Announcements</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                        Post official business permit notices, renewal schedules, and tax guidelines with LGU Admin review workflow.
                    </p>
                </div>

                <BploAddAnnouncementModal onSuccess={() => router.refresh()} />
            </div>

            {/* Metric Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c101b] border border-slate-200/80 dark:border-white/5 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                            Total BPLO Notices
                        </span>
                        <Megaphone className="w-4 h-4 text-primary" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                        {totalCount}
                    </p>
                </div>

                <div 
                    onClick={() => setStatusFilter(statusFilter === "PENDING_APPROVAL" ? "ALL" : "PENDING_APPROVAL")}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                        statusFilter === "PENDING_APPROVAL"
                            ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/20"
                            : "bg-white dark:bg-[#0c101b] border-slate-200/80 dark:border-white/5 hover:border-amber-500/30"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-500">
                            Pending Approval
                        </span>
                        <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-amber-500 mt-2">
                        {pendingCount}
                    </p>
                </div>

                <div 
                    onClick={() => setStatusFilter(statusFilter === "APPROVED" ? "ALL" : "APPROVED")}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                        statusFilter === "APPROVED"
                            ? "bg-emerald-500/10 border-emerald-500/40 ring-2 ring-emerald-500/20"
                            : "bg-white dark:bg-[#0c101b] border-slate-200/80 dark:border-white/5 hover:border-emerald-500/30"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-500">
                            Approved & Live
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-500 mt-2">
                        {approvedCount}
                    </p>
                </div>

                <div 
                    onClick={() => setStatusFilter(statusFilter === "REJECTED" ? "ALL" : "REJECTED")}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
                        statusFilter === "REJECTED"
                            ? "bg-rose-500/10 border-rose-500/40 ring-2 ring-rose-500/20"
                            : "bg-white dark:bg-[#0c101b] border-slate-200/80 dark:border-white/5 hover:border-rose-500/30"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-500">
                            Rejected / Revision
                        </span>
                        <XCircle className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-2xl sm:text-3xl font-black text-rose-500 mt-2">
                        {rejectedCount}
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#0c101b] p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                        placeholder="Search announcements..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-10 rounded-xl border-slate-200 dark:border-white/10 dark:bg-white/[0.03] text-xs font-medium"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    {[
                        { label: "All Status", val: "ALL" },
                        { label: "Pending LGU Review", val: "PENDING_APPROVAL" },
                        { label: "Approved Live", val: "APPROVED" },
                        { label: "Rejected", val: "REJECTED" },
                    ].map(f => (
                        <button
                            key={f.val}
                            onClick={() => setStatusFilter(f.val)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                                statusFilter === f.val 
                                    ? "bg-primary text-white shadow-md" 
                                    : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Announcement Listings Grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(item => {
                        const isPending = item.approvalStatus === "PENDING_APPROVAL" || !item.approvalStatus;
                        const isApproved = item.approvalStatus === "APPROVED";
                        const isRejected = item.approvalStatus === "REJECTED";

                        return (
                            <div 
                                key={item.id}
                                className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#0c101b] border border-slate-200/80 dark:border-white/5 hover:border-primary/40 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                            >
                                <div className="space-y-3">
                                    {/* Image Preview if available */}
                                    {item.imageUrl && (
                                        <div className="rounded-xl overflow-hidden h-36 w-full border border-slate-100 dark:border-white/5 bg-slate-100 dark:bg-black/20">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}

                                    {/* Status & Priority Header */}
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        {/* Status Badge */}
                                        {isPending && (
                                            <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> Pending LGU Approval
                                            </Badge>
                                        )}
                                        {isApproved && (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Live & Approved
                                            </Badge>
                                        )}
                                        {isRejected && (
                                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                <XCircle className="w-3 h-3" /> Rejected
                                            </Badge>
                                        )}

                                        {/* Priority Pill */}
                                        {item.priority === "Critical" ? (
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-xs">
                                                Critical
                                            </span>
                                        ) : item.priority === "Important" ? (
                                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                                                Important
                                            </span>
                                        ) : null}
                                    </div>

                                    {/* Title & Body */}
                                    <div>
                                        <div className="flex items-start gap-2">
                                            {item.isPinned && (
                                                <Pin className="w-4 h-4 text-primary shrink-0 rotate-45 mt-1" />
                                            )}
                                            <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-2 leading-snug">
                                                {item.title}
                                            </h3>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3 leading-relaxed font-normal">
                                            {item.content}
                                        </p>
                                    </div>

                                    {/* Event / Expiry metadata */}
                                    <div className="pt-2 flex flex-wrap gap-2 text-[10px] text-slate-400 font-medium">
                                        {item.eventDate && (
                                            <span className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                                <Calendar className="w-3 h-3 text-primary" />
                                                Event: {format(new Date(item.eventDate), "MMM dd, yyyy")}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                            Posted: {format(new Date(item.createdAt), "MMM dd, yyyy")}
                                        </span>
                                    </div>
                                </div>

                                {/* Footer Action Controls */}
                                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <BploAddAnnouncementModal 
                                            announcement={item} 
                                            onSuccess={() => router.refresh()}
                                            trigger={
                                                <Button variant="ghost" size="sm" className="h-8 px-2.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary">
                                                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                                                </Button>
                                            }
                                        />
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteId(item.id)}
                                            className="h-8 px-2.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                                        </Button>
                                    </div>

                                    <button
                                        onClick={() => handleToggleActive(item.id, item.isActive)}
                                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-colors ${
                                            item.isActive 
                                                ? "text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20" 
                                                : "text-slate-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200"
                                        }`}
                                    >
                                        {item.isActive ? "Active" : "Disabled"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-16 text-center bg-white dark:bg-[#0c101b] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl p-8">
                    <Megaphone className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <h3 className="text-lg font-black text-slate-700 dark:text-slate-300 uppercase italic tracking-tight">
                        No BPLO Announcements Found
                    </h3>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto font-medium">
                        {search.trim() ? "No announcements match your search query." : "Draft your first BPLO advisory or permit notice to notify business applicants."}
                    </p>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent className="rounded-2xl dark:bg-[#0c101b] border-slate-200 dark:border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Delete BPLO Announcement?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-slate-500">
                            This action cannot be undone. The announcement will be permanently removed from public and administrative records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl text-xs font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="rounded-xl text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white"
                        >
                            {deleting ? "Deleting..." : "Confirm Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
