"use client";

import { useAnnouncements, Announcement } from "../providers/AnnouncementProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Calendar, Megaphone, Pin, PinOff, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { deleteAnnouncement, toggleAnnouncementStatus, toggleAnnouncementPin, getAnnouncementById, approveAnnouncement, rejectAnnouncement } from "../actions/announcements.actions";
import { Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";
import { Skeleton } from "@/components/ui/skeleton";

export function AnnouncementTable() {
    const {
        announcements,
        setEditingData,
        setIsAddModalOpen,
        hideCategory,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
        currentUser,
    } = useAnnouncements();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [approvingId, setApprovingId] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRange = Math.min(page * pageSize, totalCount);

    const userEmail = (currentUser?.email || "").toLowerCase();
    const userId = currentUser?.id;
    const userRole = currentUser?.role;
    const userCenterId = currentUser?.matchedCenterId;
    const isGlobalManager = (userRole === "ADMIN" || userRole === "RHU_ADMIN" || userRole === "CONTENT_ADMIN") && !userCenterId && !userEmail.includes("{{BARANGAY_NAME}}") && !userEmail.includes("main");

    const updateUrlParam = (paramName: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set(paramName, value);
        setIsPending(true);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            updateUrlParam("page", newPage.toString());
        }
    };

    const handlePageSizeChange = (newSize: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("pageSize", newSize);
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`);
    };

    const [fetchingId, setFetchingId] = useState<string | null>(null);

    const handleEdit = async (item: Announcement) => {
        setFetchingId(item.id);
        try {
            const res = await getAnnouncementById(item.id);
            if (res.success && (res.data || res.announcement)) {
                setEditingData((res.data || res.announcement) as Announcement);
                setIsAddModalOpen(true);
            } else {
                toast.error(res.error || "Failed to load announcement details.");
            }
        } catch {
            toast.error("Error fetching announcement details.");
        } finally {
            setFetchingId(null);
        }
    };

    const handleConfirmDelete = async () => {
        if (!announcementToDelete) return;
        const targetId = announcementToDelete.id;
        setIsDeleting(true);
        setIsPending(true);

        try {
            const res = await deleteAnnouncement(targetId);
            if (res.success) {
                toast.success("Announcement deleted successfully!");
                setAnnouncementToDelete(null);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to delete.");
                setIsPending(false);
            }
        } catch {
            toast.error("An unexpected error occurred while deleting.");
            setIsPending(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            const res = await toggleAnnouncementStatus(id, !currentStatus);
            if (res.success) {
                toast.success(`Announcement ${!currentStatus ? "activated" : "deactivated"}!`);
            } else {
                toast.error(res.error || "Failed to update status.");
            }
        } catch {
            toast.error("Error updating announcement status.");
        } finally {
            setTogglingId(null);
        }
    };

    const handleTogglePin = async (id: string, currentPin: boolean) => {
        try {
            const res = await toggleAnnouncementPin(id, !currentPin);
            if (res.success) {
                toast.success(`Announcement ${!currentPin ? "pinned to top" : "unpinned"}!`);
            } else {
                toast.error(res.error || "Failed to update pin status.");
            }
        } catch {
            toast.error("Error updating pin status.");
        }
    };

    const handleApprove = async (id: string) => {
        setApprovingId(id);
        try {
            const res = await approveAnnouncement(id);
            if (res.success) {
                toast.success("Announcement approved and published live!");
                router.refresh();
            } else {
                toast.error(res.error || "Failed to approve announcement.");
            }
        } catch {
            toast.error("Error approving announcement.");
        } finally {
            setApprovingId(null);
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt("Enter reason for rejection (optional):");
        if (reason === null) return;
        try {
            const res = await rejectAnnouncement(id, reason);
            if (res.success) {
                toast.success("Announcement marked as rejected.");
                router.refresh();
            } else {
                toast.error(res.error || "Failed to reject announcement.");
            }
        } catch {
            toast.error("Error rejecting announcement.");
        }
    };

    if (announcements.length === 0) {
        return (
            <div className="p-16 text-center flex flex-col items-center justify-center">
                <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-200 dark:ring-white/5">
                    <Megaphone className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">No Matches Found</h3>
                <p className="text-slate-500 font-medium italic max-w-sm mt-2">
                    No announcements match your current criteria. Try adjusting your filters or post a new one!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto relative">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-[#2a3040]">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[380px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pl-8 py-4">
                                Notice Details
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Scope / Barangay
                            </TableHead>
                            {!hideCategory && (
                                <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                    Category
                                </TableHead>
                            )}
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Priority
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Date Posted
                            </TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Active
                            </TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                                <TableRow key={`skeleton-${idx}`} className="border-b border-slate-100 dark:border-[#2a3040]/50 animate-pulse">
                                    <TableCell className="pl-8 py-5">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-48 bg-slate-200 dark:bg-[#1a2133]" />
                                            <Skeleton className="h-3 w-64 bg-slate-200/60 dark:bg-[#1a2133]/60" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-5 w-24 rounded-lg bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    {!hideCategory && (
                                        <TableCell>
                                            <Skeleton className="h-5 w-20 rounded-lg bg-slate-200 dark:bg-[#1a2133]" />
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <Skeleton className="h-5 w-16 rounded-lg bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell>
                                        <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Skeleton className="h-5 w-9 mx-auto rounded-full bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex items-center justify-end gap-1">
                                            <Skeleton className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                            <Skeleton className="h-8 w-8 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : announcements.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={hideCategory ? 6 : 7} className="p-12 text-center text-slate-400">
                                    No announcements found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            announcements.map((item) => {
                            const itemAuthorEmail = (item.authorEmail || "").toLowerCase();
                            const isStaff = userRole === "RHU_STAFF";
                            const canEdit =
                                !isStaff && (
                                    isGlobalManager ||
                                    userRole === "RHU_ADMIN" ||
                                    userRole === "CONTENT_ADMIN" ||
                                    (item.authorId && userId && String(item.authorId) === String(userId)) ||
                                    (itemAuthorEmail && userEmail && itemAuthorEmail === userEmail) ||
                                    (userCenterId && item.healthCenterId && String(item.healthCenterId) === String(userCenterId))
                                );

                            return (
                                <TableRow key={item.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors border-b border-slate-200 dark:border-[#2a3040]">
                                    <TableCell className="pl-8 py-5">
                                        <div className="flex flex-col space-y-1.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {item.isPinned && <Pin className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />}
                                                <span className="dark:text-white font-black uppercase italic tracking-tight leading-tight transition-colors">
                                                    {item.title}
                                                </span>
                                                {item.approvalStatus === "PENDING_APPROVAL" && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                                        <Clock className="w-2.5 h-2.5" /> Pending Approval {item.department ? `(${item.department})` : ""}
                                                    </span>
                                                )}
                                                {item.approvalStatus === "REJECTED" && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                        <X className="w-2.5 h-2.5" /> Rejected
                                                    </span>
                                                )}
                                            </div>
                                            {item.content && (
                                                <span className="text-[11px] text-slate-500 font-medium italic line-clamp-1 max-w-[280px]">
                                                    {item.content}
                                                </span>
                                            )}
                                            {(item.eventDate || item.eventSchedule) && (
                                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                                                    <Calendar className="w-3 h-3 shrink-0 text-emerald-500" />
                                                    <span>
                                                        {item.eventDate ? format(new Date(item.eventDate), "MMM d, yyyy") : ""}
                                                        {item.eventDate && item.eventSchedule ? " • " : ""}
                                                        {item.eventSchedule || ""}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.barangay ? (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                                                {item.barangay}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50">
                                                Whole Municipality
                                            </span>
                                        )}
                                    </TableCell>
                                    {!hideCategory && (
                                        <TableCell>
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                {item.category}
                                            </span>
                                        </TableCell>
                                    )}
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={cn(
                                                    "w-2 h-2 rounded-full shadow-sm",
                                                    item.priority === "Critical"
                                                        ? "bg-red-500 animate-pulse"
                                                        : item.priority === "High"
                                                            ? "bg-orange-500"
                                                            : item.priority === "Low"
                                                                ? "bg-slate-400"
                                                                : ""
                                                )}
                                                style={item.priority === "Normal" ? { backgroundColor: themeColor } : {}}
                                            />
                                            <span
                                                className={cn(
                                                    "text-[10px] font-black uppercase tracking-widest italic",
                                                    item.priority === "Critical" ? "text-red-500" : "text-slate-600 dark:text-slate-400"
                                                )}
                                            >
                                                {item.priority}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-slate-500 dark:text-slate-400 text-[11px] font-medium italic">
                                            <Calendar className="w-3.5 h-3.5 mr-2" style={{ color: themeColor }} />
                                            {format(new Date(item.createdAt), "MMM d, yyyy")}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {canEdit ? (
                                            <Switch
                                                checked={item.isActive}
                                                onCheckedChange={() => handleToggleStatus(item.id, item.isActive)}
                                                disabled={togglingId === item.id}
                                            />
                                        ) : (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                                                    item.isActive
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700"
                                                )}
                                            >
                                                {item.isActive ? "Active" : "Inactive"}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex justify-end items-center gap-2">
                                            {/* LGU Admin Approval Controls */}
                                            {item.approvalStatus === "PENDING_APPROVAL" && (
                                                <div className="flex items-center gap-1.5 mr-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleApprove(item.id)}
                                                        disabled={approvingId === item.id}
                                                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1"
                                                    >
                                                        {approvingId === item.id ? (
                                                            <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5" />
                                                        )}
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleReject(item.id)}
                                                        className="h-8 px-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[10px] font-bold"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            )}

                                            {canEdit ? (
                                                <>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleTogglePin(item.id, item.isPinned)}
                                                                    className={cn(
                                                                        "h-9 w-9 rounded-xl transition-all",
                                                                        item.isPinned
                                                                            ? "text-orange-500 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100"
                                                                            : "text-slate-400 hover:text-orange-500 hover:bg-orange-50"
                                                                    )}
                                                                >
                                                                    {item.isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                {item.isPinned ? "Unpin" : "Pin to Top"}
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEdit(item)}
                                                                    disabled={fetchingId === item.id}
                                                                    className="h-9 w-9 rounded-xl transition-all border border-transparent"
                                                                    style={{ color: themeColor }}
                                                                >
                                                                    {fetchingId === item.id ? (
                                                                        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                                                    ) : (
                                                                        <Edit2 className="w-4 h-4" />
                                                                    )}
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Edit Announcement
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>

                                                    {/* Hide delete action temporarily */}
                                                    {/* <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => setAnnouncementToDelete(item)}
                                                                    disabled={isDeleting}
                                                                    className="h-9 w-9 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 border border-transparent hover:border-red-200"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Delete Announcement
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider> */}
                                                </>
                                            ) : (
                                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
                                                    Read-Only
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                    </TableBody>
                </Table>
            </div>

            {/* Server-Driven Pagination Bar */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> notices
                    </span>

                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Rows per page:</span>
                        <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold">
                                <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b]">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => handlePageChange(page - 1)}
                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                    </Button>

                    <span className="text-xs font-black px-3 py-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200">
                        {page} / {totalPages}
                    </span>

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => handlePageChange(page + 1)}
                        className="h-9 px-3 rounded-xl border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center gap-1"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Modern Confirm Delete Modal */}
            <ConfirmDeleteModal
                isOpen={!!announcementToDelete}
                onClose={() => {
                    if (!isDeleting) setAnnouncementToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Announcement"
                description={`Are you sure you want to permanently delete "${announcementToDelete?.title || "this announcement"}"? If it has an attached image banner, it will also be deleted from storage.`}
                isLoading={isDeleting}
            />
        </div>
    );
}
