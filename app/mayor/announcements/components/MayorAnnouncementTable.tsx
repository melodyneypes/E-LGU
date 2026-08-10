"use client";

import { useMayorAnnouncements } from "./MayorAnnouncementsProvider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Pin, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { MayorAnnouncementDetailModal, AnnouncementDetailItem } from "./MayorAnnouncementDetailModal";
import React, { useState, useEffect } from "react";

export function MayorAnnouncementTable() {
    const {
        announcements,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useMayorAnnouncements();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementDetailItem | null>(null);
    const announcementIdParam = searchParams.get("announcementId");

    // Auto-open modal when announcementId URL parameter is present
    useEffect(() => {
        if (!announcementIdParam) return;
        const found = announcements.find((a) => a.id === announcementIdParam);
        if (found) {
            setSelectedAnnouncement(found as any);
        } else {
            // Fetch if not present in initial page batch
            (async () => {
                try {
                    const res = await fetch(`/api/announcements/${announcementIdParam}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.announcement) {
                            setSelectedAnnouncement(data.announcement);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch announcement details:", err);
                }
            })();
        }
    }, [announcementIdParam, announcements]);

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

    return (
        <div className="relative">
            {isPending && (
                <div className="absolute inset-0 bg-white/50 dark:bg-[#151b2b]/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-3xl transition-all duration-300">
                    <div className="flex items-center gap-3 px-6 py-3.5 bg-white dark:bg-[#1e2433] rounded-2xl shadow-xl ring-1 ring-slate-100 dark:ring-white/5">
                        <span className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
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
                        <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 pr-8">
                            Date Posted
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {announcements.map((item) => (
                        <TableRow
                            key={item.id}
                            onClick={() => setSelectedAnnouncement(item as any)}
                            className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors border-b border-slate-200 dark:border-[#2a3040] cursor-pointer"
                            title="Click to view full notice details"
                        >
                            <TableCell className="pl-8 py-5">
                                <div className="flex flex-col space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        {item.isPinned && <Pin className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />}
                                        <span className="dark:text-white font-black uppercase italic tracking-tight leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {item.title}
                                        </span>
                                    </div>
                                    {item.content && (
                                        <span className="text-[11px] text-slate-500 font-medium italic line-clamp-1 max-w-[280px]">
                                            {item.content}
                                        </span>
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
                            <TableCell className="pr-8">
                                <div className="flex items-center text-slate-500 dark:text-slate-400 text-[11px] font-medium italic">
                                    <Calendar className="w-3.5 h-3.5 mr-2" style={{ color: themeColor }} />
                                    {format(new Date(item.createdAt), "MMM d, yyyy")}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Pagination controls footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-slate-50/50 dark:bg-[#121622]/50 border-t border-slate-200 dark:border-[#2a3040]">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                    Showing <span className="font-bold text-slate-800 dark:text-slate-200">{startRange}</span> to{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{endRange}</span> of{" "}
                    <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount}</span> entries
                </span>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">Show:</span>
                        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="h-8 w-[70px] bg-white dark:bg-[#1a1f2e] border-slate-200 dark:border-[#2a3040] rounded-lg text-xs font-bold shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                <SelectItem value="5">5</SelectItem>
                                <SelectItem value="10">10</SelectItem>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1 || isPending}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a1f2e] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 px-1">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages || isPending}
                                className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#1a1f2e] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Read-Only Mayor Detail Modal */}
            <MayorAnnouncementDetailModal
                announcement={selectedAnnouncement}
                onClose={() => {
                    setSelectedAnnouncement(null);
                    if (searchParams.get("announcementId")) {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("announcementId");
                        router.push(`${pathname}?${params.toString()}`);
                    }
                }}
                themeColor={themeColor}
            />
        </div>
    );
}
