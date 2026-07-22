"use client";

import { useAnnouncements, Announcement } from "../providers/AnnouncementProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2, Calendar, Megaphone, Pin, PinOff, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";
import { deleteAnnouncement, toggleAnnouncementStatus, toggleAnnouncementPin, getAnnouncementById } from "../actions/announcements.actions";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function AnnouncementTable() {
    const {
        announcements,
        setEditingData,
        setIsAddModalOpen,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useAnnouncements();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const startRange = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
    const endRange = Math.min(page * pageSize, totalCount);

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

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        setDeletingId(id);
        try {
            const res = await deleteAnnouncement(id);
            if (res.success) {
                toast.success("Announcement deleted!");
            } else {
                toast.error(res.error || "Failed to delete.");
            }
        } catch {
            toast.error("Error deleting announcement.");
        } finally {
            setDeletingId(null);
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
            toast.error("Error updating status.");
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
                toast.error(res.error || "Failed to update pin.");
            }
        } catch {
            toast.error("Error updating pin status.");
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
        <>
            <div className="overflow-x-auto relative">
                {isPending && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-[#151b2b]/60 backdrop-blur-[2px] z-20 flex items-center justify-center transition-all duration-300">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 shadow-xl">
                            <span 
                                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: themeColor, borderTopColor: "transparent" }} 
                            />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 italic">
                                Refreshing notices...
                            </span>
                        </div>
                    </div>
                )}
                <Table className={cn("transition-opacity duration-300", isPending && "opacity-40")}>
                    <TableHeader>
                        <TableRow className="bg-slate-50/50 dark:bg-[#1a1f2e] hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                            <TableHead className="w-[320px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                Notice Details
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Scope / Barangay
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Category
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Priority
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">
                                Date Posted
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-center">
                                Active
                            </TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {announcements.map((item) => (
                            <TableRow key={item.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors border-b border-slate-200 dark:border-[#2a3040]">
                                <TableCell className="pl-8 py-5">
                                    <div className="flex flex-col space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            {item.isPinned && <Pin className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />}
                                            <span className="dark:text-white font-black uppercase italic tracking-tight leading-tight transition-colors">
                                                {item.title}
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-medium italic line-clamp-1 max-w-[280px]">
                                            {item.content}
                                        </span>
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
                                <TableCell>
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                        {item.category}
                                    </span>
                                </TableCell>
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
                                    <Switch
                                        checked={item.isActive}
                                        onCheckedChange={() => handleToggleStatus(item.id, item.isActive)}
                                        disabled={togglingId === item.id}
                                    />
                                </TableCell>
                                <TableCell className="text-right pr-8">
                                    <div className="flex justify-end gap-2">
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
                                                <TooltipContent>{item.isPinned ? "Unpin" : "Pin to Top"}</TooltipContent>
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
                                                <TooltipContent>Edit Announcement</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(item.id)}
                                                        disabled={deletingId === item.id}
                                                        className="h-9 w-9 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 border border-transparent hover:border-red-200"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Delete Announcement</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
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
        </>
    );
}
