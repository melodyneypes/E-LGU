"use client";

import { useAnnouncements, Announcement } from "../providers/AnnouncementProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Edit2, Trash2, Calendar, Megaphone, Bell, Pin, PinOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState, useEffect } from "react";
import { deleteAnnouncement, toggleAnnouncementStatus, toggleAnnouncementPin } from "../actions/announcements.actions";

export function AnnouncementTable() {
    const { 
        announcements, 
        searchTerm, 
        setEditingData, 
        setIsAddModalOpen, 
        selectedCategory, 
        selectedPriority, 
        themeColor,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage
    } = useAnnouncements();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const filteredData = announcements.filter((item: Announcement) => {
        const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             item.content.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
        const matchesPriority = selectedPriority === "All" || item.priority === selectedPriority;
        return matchesSearch && matchesCategory && matchesPriority;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset to page 1 when searching or filtering
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedCategory, selectedPriority, setCurrentPage]);

    const handleEdit = (item: Announcement) => {
        setEditingData(item);
        setIsAddModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this announcement?")) return;
        setDeletingId(id);
        try {
            const res = await deleteAnnouncement(id);
            if (res.success) {
                toast.success("Announcement deleted successfully!");
            } else {
                toast.error(res.error || "Failed to delete.");
            }
        } catch {
            toast.error("Failed to delete announcement.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean) => {
        setTogglingId(id);
        try {
            const res = await toggleAnnouncementStatus(id, !currentStatus);
            if (res.success) {
                toast.success(`Announcement ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
            }
        } catch {
            toast.error("Failed to update status.");
        } finally {
            setTogglingId(null);
        }
    };

    const handleTogglePin = async (id: string, currentPin: boolean) => {
        try {
            const res = await toggleAnnouncementPin(id, !currentPin);
            if (res.success) {
                toast.success(`Announcement ${!currentPin ? 'pinned' : 'unpinned'} successfully!`);
            }
        } catch {
            toast.error("Failed to update pin status.");
        }
    };

    if (filteredData.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center border-t border-slate-200 dark:border-[#2a3040]">
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
            <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-[#1a1f2e] hover:bg-slate-50/50 dark:hover:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                        <TableHead className="w-[320px] font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">Notice Details</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">Scope / Barangay</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">Category</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">Priority</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100">Date Posted</TableHead>
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 text-center">Active</TableHead>
                        <TableHead className="text-right font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {paginatedData.map((item) => (
                        <TableRow key={item.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors border-b border-slate-200 dark:border-[#2a3040]">
                            <TableCell className="pl-8 py-5">
                                <div className="flex flex-col space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        {item.isPinned && <Pin className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />}
                                        <span 
                                            className="dark:text-white font-black uppercase italic tracking-tight leading-tight transition-colors"
                                            style={{ color: 'inherit' }}
                                        >
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
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shadow-sm",
                                        item.priority === "Critical" ? "bg-red-500 animate-pulse" :
                                        item.priority === "High" ? "bg-orange-500" :
                                        item.priority === "Low" ? "bg-slate-400" : ""
                                    )} 
                                    style={item.priority === "Normal" ? { backgroundColor: themeColor } : {}}
                                    />
                                    <span className={cn(
                                        "text-[10px] font-black uppercase tracking-widest italic",
                                        item.priority === "Critical" ? "text-red-500" : "text-slate-600 dark:text-slate-400"
                                    )}>
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
                                    style={{ '--tw-switch-checked-bg': themeColor } as any}
                                    className="data-[state=checked]:bg-[var(--tw-switch-checked-bg)]"
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
                                                    className="h-9 w-9 rounded-xl transition-all border border-transparent"
                                                    style={{ color: themeColor }}
                                                >
                                                    <Edit2 className="w-4 h-4" />
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

            {/* Pagination UI */}
            {totalPages > 1 && (
                <div className="px-8 py-6 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/30 dark:bg-transparent flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                            Showing <span className="text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> of <span className="text-slate-900 dark:text-white">{filteredData.length}</span> results
                        </div>

                        <div className="flex items-center gap-2 border-l border-slate-200 dark:border-[#2a3040] pl-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rows:</span>
                            <Select 
                                value={itemsPerPage.toString()} 
                                onValueChange={(val) => {
                                    setItemsPerPage(parseInt(val));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-lg text-[10px] font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                    <SelectItem value="5">5</SelectItem>
                                    <SelectItem value="8">8</SelectItem>
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
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-white/10 font-bold text-[11px] uppercase tracking-widest transition-all hover:bg-white dark:hover:bg-white/5 active:scale-95 disabled:opacity-30"
                        >
                            Prev
                        </Button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                <Button
                                    key={page}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                        "h-10 w-10 rounded-xl font-black text-xs transition-all",
                                        currentPage === page 
                                            ? "text-white shadow-lg shadow-blue-500/20" 
                                            : "text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5"
                                    )}
                                    style={currentPage === page ? { backgroundColor: themeColor } : {}}
                                >
                                    {page}
                                </Button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-white/10 font-bold text-[11px] uppercase tracking-widest transition-all hover:bg-white dark:hover:bg-white/5 active:scale-95 disabled:opacity-30"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
}

 
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(" ");
}
