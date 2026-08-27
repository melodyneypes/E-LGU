"use client";

import { useEvents, Event } from "../providers/EventsProvider";
import Image from "next/image";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, EyeOff, MapPin, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deleteEvent, getEventById } from "../actions/events.actions";
import { toast } from "sonner";
import { formatDate } from "@/app/admin/content/Tourism/utils/date_and_time";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ConfirmDeleteModal } from "@/components/shared/ConfirmDeleteModal";

export function EventsTable() {
    const {
        events,
        setEvents,
        setEditingData,
        setIsAddModalOpen,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useEvents();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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
        setIsPending(true);
        router.push(`${pathname}?${params.toString()}`);
    };

    // Fast Instant Edit Opening: Sets current row data immediately, then fetches full details if needed
    const handleEdit = async (eventItem: Event) => {
        setEditingData(eventItem);
        setIsAddModalOpen(true);

        try {
            const res = (await getEventById(eventItem.id)) as { success: boolean; data?: Event; event?: Event; error?: string };
            if (res.success && (res.data || res.event)) {
                setEditingData((res.data || res.event) as Event);
            }
        } catch {
            // Keep editing with existing row data silently
        }
    };

    const handleConfirmDelete = async () => {
        if (!eventToDelete) return;
        const id = eventToDelete.id;
        const previousEvents = [...events];

        setIsDeleting(true);
        // Optimistic UI update
        setEvents(events.filter((item) => item.id !== id));

        try {
            const res = await deleteEvent(id);
            if (res.success) {
                toast.success("Event deleted successfully.");
                setEventToDelete(null);
                setIsPending(true);
                router.refresh();
            } else {
                setEvents(previousEvents);
                toast.error(res.error || "Failed to delete event.");
            }
        } catch {
            setEvents(previousEvents);
            toast.error("Failed to delete event. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="overflow-x-auto relative">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e]">
                        <TableRow className="border-b dark:border-[#2a3040]">
                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider h-14 pl-8">Event Details</TableHead>
                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider h-14">Schedule</TableHead>
                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider h-14">Venue / Location</TableHead>
                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider h-14">Scope / Location</TableHead>
                            <TableHead className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider h-14">Status</TableHead>
                            <TableHead className="text-right font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider h-14 pr-8">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            Array.from({ length: Math.min(pageSize, 5) }).map((_, idx) => (
                                <TableRow key={`events-skeleton-${idx}`} className="border-b border-slate-100 dark:border-[#2a3040]/50 animate-pulse">
                                    <TableCell className="py-4 pl-8">
                                        <div className="flex items-center space-x-4">
                                            <Skeleton className="w-14 h-14 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-44 bg-slate-200 dark:bg-[#1a2133]" />
                                                <Skeleton className="h-4 w-20 bg-slate-200/60 dark:bg-[#1a2133]/60" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="space-y-2">
                                            <Skeleton className="h-3.5 w-32 bg-slate-200 dark:bg-[#1a2133]" />
                                            <Skeleton className="h-3.5 w-32 bg-slate-200/60 dark:bg-[#1a2133]/60" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-36 bg-slate-200 dark:bg-[#1a2133]" />
                                            <Skeleton className="h-3 w-48 bg-slate-200/60 dark:bg-[#1a2133]/60" />
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Skeleton className="h-5 w-28 rounded-md bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <Skeleton className="h-5 w-20 rounded-md bg-slate-200 dark:bg-[#1a2133]" />
                                    </TableCell>
                                    <TableCell className="py-4 text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <Skeleton className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                            <Skeleton className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-[#1a2133]" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : events.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <Calendar className="w-12 h-12 mb-3 opacity-20" />
                                        <p className="text-lg font-bold">No events found.</p>
                                        <p className="text-sm italic">Try adjusting your filters or search criteria.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            events.map((event) => {
                                const isRowLoading = eventToDelete?.id === event.id && isDeleting;
                                if (isRowLoading) {
                                    return (
                                        <TableRow
                                            key={event.id}
                                            className="border-b dark:border-[#2a3040] bg-slate-50/40 dark:bg-slate-900/40"
                                        >
                                            <TableCell className="py-4 pl-8">
                                                <div className="flex items-center space-x-4">
                                                    <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                                                    <div className="space-y-2">
                                                         <Skeleton className="h-4 w-44 rounded-md" />
                                                         <Skeleton className="h-4 w-20 rounded-md" />
                                                     </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="space-y-2">
                                                    <Skeleton className="h-3.5 w-32 rounded-md" />
                                                    <Skeleton className="h-3.5 w-32 rounded-md" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <div className="space-y-2">
                                                    <Skeleton className="h-4 w-36 rounded-md" />
                                                    <Skeleton className="h-3 w-48 rounded-md" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Skeleton className="h-5 w-28 rounded-md" />
                                            </TableCell>
                                            <TableCell className="py-4">
                                                <Skeleton className="h-5 w-20 rounded-md" />
                                            </TableCell>
                                            <TableCell className="py-4 text-right pr-8">
                                                <div className="flex justify-end gap-2">
                                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                return (
                                    <TableRow
                                        key={event.id}
                                        className={cn(
                                            "group border-b dark:border-[#2a3040] hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors",
                                            !event.isPublished && "bg-slate-50/60 dark:bg-slate-900/40 opacity-75"
                                        )}
                                    >
                                    <TableCell className="py-4 pl-8">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                {event.imageUrl ? (
                                                    <Image src={event.imageUrl} alt={event.title} layout="fill" objectFit="cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <Calendar className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    {!event.isPublished && (
                                                        <EyeOff className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                    )}
                                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-tight line-clamp-1 max-w-[220px]">
                                                        {event.title}
                                                    </p>
                                                </div>
                                                <Badge variant="secondary" className="mt-1 font-bold text-[9px] uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-none rounded px-2 py-0.5">
                                                    {event.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <span className="w-12 text-slate-400 font-medium">Start:</span> {formatDate(event.startDate)}
                                            </div>
                                            <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <span className="w-12 text-slate-400 font-medium">End:</span> {formatDate(event.endDate)}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="flex items-start space-x-2">
                                            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{event.venueName}</p>
                                                <p className="text-[11px] text-slate-500 font-medium italic line-clamp-1">{event.address}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {!event.barangay || event.barangay === "" ? (
                                            <Badge className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-black text-[9px] uppercase tracking-wider">
                                                WHOLE MUNICIPALITY
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold text-[10px]">
                                                {event.barangay}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="py-4">
                                        {event.isPublished ? (
                                            <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                                Published
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-slate-500 border-slate-300 dark:border-slate-700 text-[10px] font-bold">
                                                Draft
                                            </Badge>
                                        )}
                                    </TableCell>
                                     <TableCell className="py-4 text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEdit(event)}
                                                            className="h-9 w-9 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/40 border border-transparent hover:border-blue-200 transition-all"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit Event</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>

                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setEventToDelete(event)}
                                                            disabled={isDeleting}
                                                            className="h-9 w-9 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 border border-transparent hover:border-red-200 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete Event</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                    </TableBody>
                </Table>
            </div>

            {/* Server-Driven Pagination Control Bar */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> events
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
                isOpen={!!eventToDelete}
                onClose={() => {
                    if (!isDeleting) setEventToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Municipal Event"
                description={`Are you sure you want to permanently delete "${eventToDelete?.title || "this event"}"? If it has an attached cover poster, it will also be deleted from cloud storage.`}
                isLoading={isDeleting}
            />
        </>
    );
}
