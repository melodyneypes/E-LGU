"use client";

import { useState, useEffect } from "react";
import { useMayorEvents, MayorEvent } from "./MayorEventsProvider";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Calendar, MapPin, ChevronLeft,
    Phone, Clock, Building2, Tag, X, Map as MapIcon, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

function formatDate(date: Date) {
    return new Date(date).toLocaleDateString("en-US", {
        timeZone: "Asia/Manila",
        month: "long",
        day: "numeric",
        year: "numeric",
    });
}

function getEventStatus(event: MayorEvent) {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    if (start <= now && end >= now) return "live";
    if (end < now) return "ended";
    return "upcoming";
}

/* ─── View Details Modal ─── */
function EventDetailsModal({
    event,
    open,
    onClose,
    themeColor,
}: {
    event: MayorEvent | null;
    open: boolean;
    onClose: () => void;
    themeColor: string;
}) {
    if (!event) return null;

    const status = getEventStatus(event);

    const mapEmbedUrl = event.latitude && event.longitude
        ? `https://maps.google.com/maps?q=${event.latitude},${event.longitude}&z=15&output=embed`
        : "https://maps.google.com";

    // Google Maps Redirect Link fallback to search query using venue name and address
    const googleMapsRedirectUrl = event.googleMapsUrl || 
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName}, ${event.address}, Municipality of E-LGU`)}`;

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="sm:max-w-2xl p-0 overflow-hidden bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] shadow-2xl rounded-3xl"
            >
                <div className="relative flex flex-col max-h-[90vh]">
                    {/* Header Banner (Only shown if imageUrl exists) */}
                    {event.imageUrl ? (
                        <div className="relative h-48 sm:h-56 w-full bg-slate-100 dark:bg-[#1e2330] shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={event.imageUrl}
                                alt={event.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                            {/* Explicit X close button on top right of banner */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="absolute top-4 right-4 z-20 h-8 w-8 rounded-full bg-slate-950/50 backdrop-blur-md text-white hover:bg-slate-900 border border-white/20 shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>

                            {/* Banner Badges & Title */}
                            <div className="absolute bottom-4 left-6 right-6 z-10">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                    <span className="px-3 py-1 rounded-full bg-violet-600/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                        {event.category}
                                    </span>
                                    {status === "live" ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                            🔴 Live Now
                                        </span>
                                    ) : status === "ended" ? (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800/90 backdrop-blur-md text-slate-300 text-[10px] font-black uppercase italic tracking-widest shadow">
                                            Ended
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase italic tracking-widest shadow">
                                            Upcoming
                                        </span>
                                    )}
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DialogTitle className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight drop-shadow-md line-clamp-1 cursor-pointer block" title={event.title}>
                                                <span className="cursor-pointer truncate block">{event.title}</span>
                                            </DialogTitle>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[99999]">
                                            {event.title}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    ) : (
                        /* Collapsed Text Header when no image is present */
                        <DialogHeader
                            className="p-6 pb-4 sticky top-0 z-50 border-b border-slate-200 dark:border-[#2a3040] flex flex-row items-start justify-between gap-4 shrink-0 bg-slate-50/50 dark:bg-[#1a202c]/50"
                        >
                            <div className="flex items-start gap-3 min-w-0">
                                <div
                                    className="p-2.5 rounded-xl shadow-lg shrink-0"
                                    style={{ backgroundColor: themeColor, boxShadow: `0 12px 30px -12px ${themeColor}` }}
                                >
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DialogTitle className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight cursor-pointer line-clamp-1" title={event.title}>
                                                <span className="cursor-pointer truncate block">{event.title}</span>
                                            </DialogTitle>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold uppercase italic text-xs p-3 rounded-xl shadow-2xl z-[99999]">
                                            {event.title}
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                    <DialogDescription className="text-slate-500 dark:text-slate-400 font-medium mt-1 flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1">
                                            <Tag className="w-3 h-3" />
                                            {event.category}
                                        </span>
                                        <span>·</span>
                                        {status === "live" ? (
                                            <span className="text-emerald-500 font-black uppercase text-[10px] tracking-wider animate-pulse">🔴 Live Now</span>
                                        ) : status === "ended" ? (
                                            <span className="text-slate-400 font-black uppercase text-[10px] tracking-wider">Ended</span>
                                        ) : (
                                            <span className="text-amber-500 font-black uppercase text-[10px] tracking-wider">Upcoming</span>
                                        )}
                                    </DialogDescription>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </DialogHeader>
                    )}

                    {/* ── Scrollable Body with custom-scrollbar ── */}
                    <div className="overflow-y-auto custom-scrollbar p-6 pb-8 space-y-5 flex-1">

                        {/* Description */}
                        {event.description && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed border-l-4 pl-4 italic cursor-pointer line-clamp-3"
                                            style={{ borderColor: themeColor }}>
                                            {event.description}
                                        </p>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-md bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-medium italic text-xs p-3.5 rounded-xl shadow-2xl z-[110] whitespace-pre-wrap">
                                        {event.description}
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Schedule */}
                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 shrink-0">
                                    <Clock className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Schedule</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {formatDate(event.startDate)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">to {formatDate(event.endDate)}</p>
                                </div>
                            </div>

                            {/* Venue */}
                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                                    <Building2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Venue</p>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate cursor-pointer">{event.venueName}</p>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="max-w-xs bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs p-2.5 rounded-xl shadow-xl z-[110]">
                                                {event.venueName}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <p className="text-[10px] text-slate-500 font-medium italic truncate">{event.address}</p>
                                </div>
                            </div>

                            {/* Location / Scope */}
                            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30 shrink-0">
                                    <MapPin className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Scope</p>
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        {!event.barangay || event.barangay === ""
                                            ? "Whole Municipality"
                                            : event.barangay}
                                    </p>
                                </div>
                            </div>

                            {/* Contact */}
                            {event.contactNumber && (
                                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1a1f2e] border border-slate-100 dark:border-[#2a3040]">
                                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 shrink-0">
                                        <Phone className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Contact</p>
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            {event.contactNumber}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reminders Section */}
                        {event.reminders && event.reminders.length > 0 && (
                            <div className="p-4 rounded-2xl border border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#1a1f2e]/40 space-y-2">
                                <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider text-[10px]">
                                    <Info className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Event Reminders</span>
                                </div>
                                <ul className="space-y-1.5 pl-5 list-disc text-xs text-slate-600 dark:text-slate-400 font-medium italic">
                                    {event.reminders.map((reminder: string, idx: number) => (
                                        <li key={idx} className="marker:text-blue-500">
                                            {reminder}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Interactive Google Map Embed (Always shown with fallback) */}
                        <div className="space-y-2">
                            <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider text-[10px]">
                                <MapIcon className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Event Map Location</span>
                            </div>
                            <div className="w-full h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-[#2a3040] bg-slate-100 dark:bg-slate-800 shadow-inner">
                                <iframe
                                    title={`Map Location for ${event.title}`}
                                    src={mapEmbedUrl}
                                    className="w-full h-full border-none"
                                    allowFullScreen
                                    loading="lazy"
                                    referrerPolicy="no-referrer-when-downgrade"
                                />
                            </div>
                        </div>

                        {/* Google Maps External Redirect Button (Always shown with fallback) */}
                        <div className="flex justify-start">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.open(googleMapsRedirectUrl, "_blank")}
                                className="h-11 rounded-xl border border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-slate-800/50 text-xs font-bold flex items-center gap-2 px-4 shadow-sm"
                            >
                                <MapPin className="w-4 h-4 text-red-500" />
                                <span>View on Google Maps</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/* ─── Main Table ─── */
export function MayorEventsTable() {
    const {
        events,
        themeColor,
        page,
        pageSize,
        totalCount,
        isPending,
        setIsPending,
    } = useMayorEvents();

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [selectedEvent, setSelectedEvent] = useState<MayorEvent | null>(null);
    const eventIdParam = searchParams.get("eventId");

    // Auto-open modal when eventId URL parameter is present
    useEffect(() => {
        if (!eventIdParam) return;
        const found = events.find((e) => e.id === eventIdParam);
        if (found) {
            setSelectedEvent(found);
        } else {
            // Fetch directly from API if event is not in current initial page
            (async () => {
                try {
                    const res = await fetch(`/api/events/${eventIdParam}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.event) {
                            setSelectedEvent(data.event);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch event details:", err);
                }
            })();
        }
    }, [eventIdParam, events]);

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

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center border-t border-slate-200 dark:border-[#2a3040]">
                <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-slate-200 dark:ring-white/5"
                    style={{ backgroundColor: "color-mix(in srgb, var(--primary-theme, #2563eb) 10%, transparent)" }}
                >
                    <Calendar className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                    No Events Found
                </h3>
                <p className="text-slate-500 font-medium italic max-w-sm mt-2">
                    No events match your current search criteria. Try adjusting your filters.
                </p>
            </div>
        );
    }

    return (
        <>
            {/* Details Modal */}
            <EventDetailsModal
                event={selectedEvent}
                open={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                themeColor={themeColor}
            />

            <div className="overflow-x-auto relative">
                {isPending && (
                    <div className="absolute inset-0 bg-white/60 dark:bg-[#151b2b]/60 backdrop-blur-[2px] z-20 flex items-center justify-center transition-all duration-300">
                        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-slate-800 shadow-xl">
                            <span
                                className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
                                style={{ borderColor: themeColor, borderTopColor: "transparent" }}
                            />
                            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 italic">
                                Refreshing events...
                            </span>
                        </div>
                    </div>
                )}

                <Table className={cn("transition-opacity duration-300", isPending && "opacity-40")}>
                    <TableHeader className="bg-slate-50 dark:bg-[#1a1f2e]">
                        <TableRow className="border-b dark:border-[#2a3040]">
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pl-8">
                                Event Details
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14">
                                Schedule
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14">
                                Venue / Location
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14">
                                Scope
                            </TableHead>
                            <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-slate-100 h-14 pr-8">
                                Status
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {events.map((event: MayorEvent) => {
                            const status = getEventStatus(event);

                            return (
                                <TableRow
                                    key={event.id}
                                    onClick={() => setSelectedEvent(event)}
                                    className={cn(
                                        "group border-b dark:border-[#2a3040] hover:bg-[color-mix(in_srgb,var(--primary-theme)_8%,transparent)] transition-colors cursor-pointer",
                                        !event.isPublished && "opacity-60"
                                    )}
                                >
                                    {/* Event Details */}
                                    <TableCell className="py-4 pl-8">
                                        <div className="flex items-center space-x-4">
                                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                                                {event.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={event.imageUrl}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                        <Calendar className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                {/* Title with Tooltip */}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic tracking-tight cursor-default m-0">
                                                                {event.title.length > 45
                                                                    ? event.title.slice(0, 45) + "..."
                                                                    : event.title}
                                                            </p>
                                                        </TooltipTrigger>
                                                        <TooltipContent
                                                            side="top"
                                                            className="max-w-[380px] text-xs font-bold italic uppercase bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-3 rounded-xl shadow-xl"
                                                        >
                                                            {event.title}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                                <Badge
                                                    variant="secondary"
                                                    className="mt-1 font-bold text-[9px] uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border-none rounded px-2 py-0.5"
                                                >
                                                    {event.category}
                                                </Badge>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Schedule */}
                                    <TableCell className="py-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <span className="w-12 text-slate-400 font-medium">Start:</span>
                                                {new Date(event.startDate).toLocaleDateString("en-US", {
                                                    month: "short", day: "numeric", year: "numeric",
                                                })}
                                            </div>
                                            <div className="flex items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                                                <span className="w-12 text-slate-400 font-medium">End:</span>
                                                {new Date(event.endDate).toLocaleDateString("en-US", {
                                                    month: "short", day: "numeric", year: "numeric",
                                                })}
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Venue */}
                                    <TableCell className="py-4">
                                        <div className="flex items-start space-x-2">
                                            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {event.venueName}
                                                </p>
                                                <p className="text-[11px] text-slate-500 font-medium italic">
                                                    {event.address.length > 40
                                                        ? event.address.slice(0, 40) + "..."
                                                        : event.address}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>

                                    {/* Scope */}
                                    <TableCell className="py-4">
                                        {!event.barangay || event.barangay === "" ? (
                                            <Badge className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-black text-[9px] uppercase tracking-wider">
                                                Whole Municipality
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold text-[10px]">
                                                {event.barangay}
                                            </Badge>
                                        )}
                                    </TableCell>

                                    {/* Status */}
                                    <TableCell className="py-4 pr-8">
                                        {status === "live" ? (
                                            <Badge className="bg-emerald-500 text-white border-none font-black uppercase tracking-wider text-[9px] py-1 px-2.5 shadow-sm animate-pulse">
                                                🔴 Live Now
                                            </Badge>
                                        ) : status === "ended" ? (
                                            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-black uppercase tracking-wider text-[9px] py-1 px-2.5">
                                                Ended
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-black uppercase tracking-wider text-[9px] py-1 px-2.5">
                                                Upcoming
                                            </Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="px-8 py-5 border-t border-slate-200 dark:border-[#2a3040] bg-slate-50/50 dark:bg-slate-900/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 italic">
                    <span>
                        Showing <strong className="text-slate-900 dark:text-white font-black">{startRange}</strong> to{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{endRange}</strong> of{" "}
                        <strong className="text-slate-900 dark:text-white font-black">{totalCount}</strong> events
                    </span>
                    <div className="flex items-center gap-2 ml-4">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                            Rows per page:
                        </span>
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
                </div>
            </div>

            {/* Read-Only Event Details Modal */}
            <EventDetailsModal
                event={selectedEvent}
                open={!!selectedEvent}
                onClose={() => {
                    setSelectedEvent(null);
                    if (searchParams.get("eventId")) {
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete("eventId");
                        router.push(`${pathname}?${params.toString()}`);
                    }
                }}
                themeColor={themeColor}
            />
        </>
    );
}
