"use client";

import Image from "next/image";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    ArrowLeft, MapPin, UserCheck, Shield, Award,
    FileText, Camera, RefreshCw, Car, ShieldAlert, Clock, Truck, Building2, CheckCircle2,
    AlertTriangle, ExternalLink, History, Eye
} from "lucide-react";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { getTicketById, markTicketAsSettled, getPosoPenaltySettings, calculatePosoTicketPenalty, POSOPenaltyBreakdown } from "@/app/admin/poso/actions";

export default function TicketDetailsPage() {
    const routeParams = useParams();
    const id = (routeParams?.id as string) || "";
    const router = useRouter();

    const { data: session } = useSession();
    const userRole = (session?.user as any)?.role;
    const userDept = (session?.user as any)?.department;
    const isPosoStaff = (userRole === "ADMIN" && userDept !== "LGU") || userRole === "POSO_OFFICER" || userDept === "POSO";

    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState<any>(null);
    const [otherUnpaidTickets, setOtherUnpaidTickets] = useState<any[]>([]);
    const [otherPaidTickets, setOtherPaidTickets] = useState<any[]>([]);
    const [otherUnpaidTotal, setOtherUnpaidTotal] = useState(0);
    const [themeColor, setThemeColor] = useState<string | null>(null);
    const [settling, setSettling] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
    const [penaltySettings, setPenaltySettings] = useState<{ dueDays: number; surchargeRate: number; monthlyInterestRate: number }>({ dueDays: 7, surchargeRate: 25, monthlyInterestRate: 2 });
    const [penaltyBreakdown, setPenaltyBreakdown] = useState<POSOPenaltyBreakdown | null>(null);
    const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);

    useEffect(() => {
        if (!ticket?.latitude || !ticket?.longitude) return;
        let isMounted = true;
        async function reverseGeocode() {
            setIsGeocoding(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${ticket.latitude}&lon=${ticket.longitude}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.display_name && isMounted) {
                        setResolvedAddress(data.display_name);
                    }
                }
            } catch {
                // Silently fallback if offline
            } finally {
                if (isMounted) setIsGeocoding(false);
            }
        }
        reverseGeocode();
        return () => { isMounted = false; };
    }, [ticket?.latitude, ticket?.longitude]);

    useEffect(() => {
        if (!id) return;
        let isMounted = true;
        async function fetchTicket() {
            setLoading(true);
            try {
                const [res, settingsRes] = await Promise.all([
                    getTicketById(id),
                    getPosoPenaltySettings(),
                ]);

                if (res.success && isMounted) {
                    setTicket(res.ticket);
                    if (res.otherUnpaidTickets) setOtherUnpaidTickets(res.otherUnpaidTickets);
                    if (res.otherPaidTickets) setOtherPaidTickets(res.otherPaidTickets);
                    if (res.otherUnpaidTotal) setOtherUnpaidTotal(res.otherUnpaidTotal);
                    if (res.themeColor) setThemeColor(res.themeColor);
                    
                    const settings = settingsRes.settings || { dueDays: 7, surchargeRate: 25, monthlyInterestRate: 2 };
                    setPenaltySettings(settings);

                    if (res.ticket) {
                        const breakdown = await calculatePosoTicketPenalty(res.ticket, settings);
                        setPenaltyBreakdown(breakdown);
                    }
                } else if (!res.success) {
                    toast.error(res.error || "Citation Ticket not found");
                }
            } catch {
                toast.error("Failed to load citation ticket details");
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        fetchTicket();
        return () => { isMounted = false; };
    }, [id]);

    const apprehensionDate = ticket ? new Date(ticket.dateTime) : null;
    const dueDate = apprehensionDate ? new Date(apprehensionDate.getTime() + penaltySettings.dueDays * 24 * 60 * 60 * 1000) : null;
    const isOverdue = penaltyBreakdown?.isOverdue || false;
    const daysOverdue = penaltyBreakdown?.daysOverdue || 0;

    const handleMarkAsSettled = async () => {
        if (!ticket) return;
        setSettling(true);
        try {
            const res = await markTicketAsSettled(ticket.id);
            if (res.success) {
                toast.success("Citation Ticket successfully marked as SETTLED!");
                router.push("/admin/poso/tickets");
            } else {
                toast.error(res.error || "Failed to mark ticket as settled");
            }
        } catch {
            toast.error("An unexpected error occurred while settling ticket");
        } finally {
            setSettling(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-[#0b0f19] space-y-8 pb-20 animate-pulse">
                {/* Top Navigation & Title Skeleton */}
                <div className="space-y-4">
                    <div className="h-9 w-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                            <div className="h-8 w-52 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                            <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
                        </div>
                        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Cards Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-44 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] p-6 space-y-3 shadow-sm">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        <div className="h-6 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                    </div>
                    <div className="h-44 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] p-6 space-y-3 shadow-sm">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                    </div>
                    <div className="h-44 bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] p-6 space-y-3 shadow-sm">
                        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                    </div>
                </div>

                {/* Main Table Skeleton */}
                <div className="bg-white dark:bg-[#151b2b] rounded-3xl border border-slate-200 dark:border-[#2a3040] p-6 space-y-4 shadow-xl">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="h-12 w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen p-8 bg-slate-50 dark:bg-[#0b0f19] flex flex-col items-center justify-center space-y-4 text-center">
                <ShieldAlert className="w-16 h-16 text-rose-500 stroke-[1.5]" />
                <h1 className="text-2xl font-black uppercase text-slate-800 dark:text-white italic">Ticket Not Found</h1>
                <p className="text-slate-500 text-sm max-w-md">The apprehension citation ticket record you are looking for does not exist or may have been archived.</p>
                <Button
                    onClick={() => router.push("/admin/poso/tickets")}
                    style={{ backgroundColor: themeColor || undefined }}
                    className="bg-rose-600 hover:opacity-90 text-white font-bold rounded-xl"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to POSO Tickets
                </Button>
            </div>
        );
    }

    const violationsList = ticket.details || ticket.ticketDetails || [];
    const photosList = ticket.ticketPhotos || [];

    return (
        <div className="min-h-screen p-4 md:p-8 bg-slate-50 dark:bg-[#0b0f19] space-y-8 pb-20">
            {/* Top Bar Navigation & Ticket Title */}
            <div className="space-y-4">
                <Button
                    variant="outline"
                    onClick={() => router.push("/admin/poso/tickets")}
                    style={
                        themeColor
                            ? {
                                  color: themeColor,
                                  borderColor: `${themeColor}40`,
                              }
                            : undefined
                    }
                    className="rounded-2xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-bold text-xs"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Return to Tickets List
                </Button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                        <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                            Ticket #{ticket.ticketNo}
                        </h1>
                        <Badge
                            className={
                                ticket.status === "SETTLED"
                                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 px-3 py-1 font-black"
                                    : ticket.isPaid || ticket.status === "PAID"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-3 py-1 font-black"
                                    : ticket.transactionId
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-3 py-1 font-black"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 px-3 py-1 font-black"
                            }
                        >
                            {ticket.status === "SETTLED" ? "SETTLED" : ticket.isPaid || ticket.status === "PAID" ? "PAID" : ticket.transactionId ? "PENDING TREASURY PAYMENT" : "UNPAID CITATION"}
                        </Badge>
                        {isOverdue && (
                            <Badge className="bg-rose-600 text-white font-black text-[10px] px-2.5 py-1 rounded-lg uppercase animate-pulse">
                                OVERDUE ({daysOverdue} {daysOverdue === 1 ? "DAY" : "DAYS"})
                            </Badge>
                        )}
                    </div>
                    <div className="text-left sm:text-right">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
                            Apprehended: {apprehensionDate?.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                        {dueDate && (
                            <p className={`text-xs font-bold font-mono ${isOverdue ? "text-rose-600 dark:text-rose-400 font-black" : "text-slate-700 dark:text-slate-300"}`}>
                                Payment Due: {dueDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} ({penaltySettings.dueDays}-day grace period)
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Paid Citation Records Notice Banner */}
            {otherPaidTickets.length > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl p-6 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-md space-y-4 animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start space-x-3.5">
                            <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 shrink-0 mt-0.5">
                                <CheckCircle2 className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black uppercase tracking-tight text-emerald-950 dark:text-emerald-100">
                                        Paid Citation Records Awaiting POSO Settlement ({otherPaidTickets.length})
                                    </h3>
                                    <Badge className="bg-emerald-600 text-white font-black text-[10px] px-2 py-0.5 rounded-lg uppercase">
                                        Paid Notice
                                    </Badge>
                                </div>
                                <p className="text-xs font-semibold text-emerald-900/80 dark:text-emerald-200/90 mt-1 italic">
                                    This violator ({ticket.violatorName}) has <strong>{otherPaidTickets.length} paid citation ticket(s)</strong> registered in records. Click any ticket below to open it and complete settlement.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* List of Paid Ticket Badges */}
                    <div className="pt-3 border-t border-emerald-200/80 dark:border-emerald-500/20 flex flex-wrap gap-2.5 items-center">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                            Paid Tickets:
                        </span>
                        {otherPaidTickets.map((pt: any) => {
                            const total = Number(pt.totalAmount || 0);
                            return (
                                <button
                                    key={pt.id}
                                    type="button"
                                    onClick={() => router.push(`/admin/poso/tickets/${pt.id}`)}
                                    className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#151b2b] border border-emerald-300 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 font-bold text-xs flex items-center gap-2 transition-all shadow-sm group hover:scale-[1.02]"
                                >
                                    <span className="font-mono">#{pt.ticketNo}</span>
                                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                                        ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                    </span>
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-0 text-[9px] font-black uppercase px-1.5 py-0.2">
                                        PAID
                                    </Badge>
                                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Outstanding Unpaid Citation Records Warning Banner */}
            {otherUnpaidTickets.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-6 border-2 border-amber-300 dark:border-amber-500/40 shadow-md space-y-4 animate-in fade-in duration-300">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-start space-x-3.5">
                            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/20 shrink-0 mt-0.5">
                                <AlertTriangle className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black uppercase tracking-tight text-amber-950 dark:text-amber-100">
                                        Outstanding Unpaid Citation Records ({otherUnpaidTickets.length})
                                    </h3>
                                    <Badge className="bg-amber-600 text-white font-black text-[10px] px-2 py-0.5 rounded-lg uppercase">
                                        Pending Fine Notice
                                    </Badge>
                                </div>
                                <p className="text-xs font-semibold text-amber-900/80 dark:text-amber-200/90 mt-1 italic">
                                    This violator ({ticket.violatorName}) has <strong>{otherUnpaidTickets.length} other unpaid citation ticket(s)</strong> registered in POSO records with an accumulated pending fine of <strong>₱{otherUnpaidTotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>.
                                </p>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/admin/poso/tickets")}
                            className="bg-white dark:bg-[#151b2b] border-amber-300 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40 font-bold text-xs rounded-xl shrink-0"
                        >
                            <History className="w-4 h-4 mr-1.5 text-amber-600" /> View All Tickets
                        </Button>
                    </div>

                    {/* List of Other Pending Unpaid Tickets */}
                    <div className="pt-3 border-t border-amber-200/80 dark:border-amber-500/20 flex flex-wrap gap-2.5 items-center">
                        <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                            Other Unpaid Tickets:
                        </span>
                        {otherUnpaidTickets.map((ot: any) => {
                            const total = Number(ot.totalAmount || 0);
                            return (
                                <button
                                    key={ot.id}
                                    type="button"
                                    onClick={() => router.push(`/admin/poso/tickets/${ot.id}`)}
                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#151b2b] border border-amber-300 dark:border-amber-500/30 hover:border-amber-500 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02]"
                                >
                                    <span className="font-black text-rose-600 dark:text-rose-400">{ot.ticketNo}</span>
                                    <span className="text-[11px] text-slate-500">
                                        (₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })})
                                    </span>
                                    {ot.isImpounded && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-black uppercase">
                                            Impounded
                                        </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 text-amber-600" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Main Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Violator & Apprehension Details (2 Cols) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Violator Information Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-6">
                        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-600">
                                <UserCheck className="w-6 h-6 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Apprehended Citizen Info
                                </h2>
                                <p className="text-xs text-slate-500 font-medium italic">Violator personal & contact snapshot</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Violator Name</span>
                                <p className="text-xl font-black text-slate-900 dark:text-white uppercase italic mt-0.5">
                                    {ticket.violatorName}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Driver&apos;s License No.</span>
                                <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5 font-mono">
                                    {ticket.licenseNo || "N/A (Unlicensed)"}
                                </p>
                                {ticket.licenseImage && (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPhoto(ticket.licenseImage)}
                                        className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all border border-blue-500/20"
                                    >
                                        <Camera className="w-3.5 h-3.5" />
                                        <span>View License Card</span>
                                    </button>
                                )}
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Home Address</span>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                    {ticket.violatorAddress || "N/A"}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Birth Date</span>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                                    {ticket.birthDate || "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Apprehension Location & Vehicle Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-6">
                        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-600">
                                <Car className="w-6 h-6 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Vehicle & Location Particulars
                                </h2>
                                <p className="text-xs text-slate-500 font-medium italic">Apprehension site & vehicle specs</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Type & Classification</span>
                                <p className="text-base font-black text-slate-900 dark:text-white uppercase italic mt-0.5">
                                    {ticket.plateNo || "No Plate"} ({ticket.typeOfVehicle || "N/A"})
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Registered Vehicle Owner</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 uppercase italic">
                                    {ticket.ownerName || ticket.violatorName || "Same as Violator / Unregistered"}
                                </p>
                            </div>

                            {ticket.puvBodyName && (
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">PUV / TODA Association</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                        {ticket.puvBodyName} {ticket.puvBodyNo ? `#${ticket.puvBodyNo}` : ""}
                                    </p>
                                </div>
                            )}

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apprehension Location</span>
                                <div className="mt-0.5">
                                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-start">
                                        <MapPin className="w-4 h-4 mr-1.5 text-rose-500 shrink-0 mt-0.5" />
                                        <span>
                                            {resolvedAddress || (ticket.location ? `${ticket.location}${ticket.barangay ? `, Barangay ${ticket.barangay}` : ""}` : "Mapandan, Pangasinan")}
                                            {isGeocoding && <span className="text-xs text-slate-400 italic ml-2">(Converting coordinates...)</span>}
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Apprehending POSO Officer</span>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center flex-wrap gap-2">
                                    <span className="flex items-center">
                                        <Shield className="w-4 h-4 mr-1 text-slate-400" />
                                        {ticket.officerName || "POSO Enforcer"}
                                    </span>
                                    {ticket.badgeNo && (
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase">
                                            Badge #{ticket.badgeNo}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Vehicle Impounding Custody & Yard Location Card */}
                    {ticket.isImpounded && (
                        <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-3xl p-6 md:p-8 border border-amber-200 dark:border-amber-500/30 shadow-sm space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-amber-200/60 dark:border-amber-500/20">
                                <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                                        <Truck className="w-6 h-6 stroke-[2]" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black uppercase italic tracking-tight text-amber-950 dark:text-amber-100">
                                            Vehicle Impoundment Custody Record
                                        </h2>
                                        <p className="text-xs text-amber-700/80 dark:text-amber-300/80 font-medium italic">
                                            Official LGU Municipal Impounding Facility Tracking
                                        </p>
                                    </div>
                                </div>

                                <Badge
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xl ${
                                        ticket.isReleased
                                            ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                            : "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-200"
                                    }`}
                                >
                                    {ticket.isReleased ? "Released from Yard" : "Held at Impound Yard"}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Impounding Facility Location</span>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 flex items-center">
                                        <Building2 className="w-4 h-4 mr-1.5 text-amber-600" />
                                        {ticket.impoundYard || "Mapandan POSO Impounding Facility"}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time Impounded</span>
                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center">
                                        <Clock className="w-4 h-4 mr-1.5 text-amber-600" />
                                        {new Date(ticket.impoundedAt || ticket.dateTime).toLocaleString("en-PH", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle Classification</span>
                                    <div className="mt-0.5">
                                        <span className="inline-block px-3 py-1 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-xs font-black uppercase italic">
                                            {ticket.vehicleClass === "CLASS_A" ? "Class A: Motorcycles/Tricycles" : ticket.vehicleClass === "CLASS_B" ? "Class B: Light 4-Wheeled" : ticket.vehicleClass === "CLASS_C" ? "Class C: Heavy 4-Wheeled+" : ticket.vehicleClass || "Standard Impound"}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Standard Impound Fee</span>
                                    <p className="text-base font-black text-amber-600 dark:text-amber-400 italic mt-0.5">
                                        ₱ {Number(ticket.impoundFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Violations & Fines Table Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="flex items-center space-x-3">
                                <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-600">
                                    <FileText className="w-6 h-6 stroke-[2]" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                        Charged Violations & Fine Breakdown
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium italic">Municipal Traffic Ordinances violated</p>
                                </div>
                            </div>
                        </div>

                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100/70 dark:bg-[#1a1f2e] border-y border-slate-200 dark:border-[#2a3040]">
                                    <TableHead className="font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">Violation Description</TableHead>
                                    <TableHead className="text-center font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100">Offense Tier</TableHead>
                                    <TableHead className="text-right font-black text-xs uppercase tracking-wider text-slate-900 dark:text-slate-100 pr-6">Fine Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {violationsList.length === 0 && !ticket.isImpounded ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-6 text-xs text-slate-400 font-medium">
                                            No violation breakdown items recorded.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {violationsList.map((item: any) => (
                                            <TableRow key={item.id} className="border-b border-slate-100 dark:border-[#2a3040]">
                                                <TableCell className="font-bold text-sm text-slate-900 dark:text-white">{item.violationName}</TableCell>
                                                <TableCell className="text-center font-bold text-xs">
                                                    <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-black">
                                                        {item.offenseLevel === 1 ? "1st Offense" : item.offenseLevel === 2 ? "2nd Offense" : "3rd Offense"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-sm text-rose-600 dark:text-rose-400 pr-6">
                                                    ₱ {Number(item.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {ticket.isImpounded && (
                                            <TableRow className="border-b border-amber-200/50 bg-amber-50/40 dark:bg-amber-950/20">
                                                <TableCell className="font-bold text-sm text-amber-900 dark:text-amber-200">
                                                    Vehicle Impounding Fee ({ticket.vehicleClass === "CLASS_A" ? "Class A: Motorcycles/Tricycles" : ticket.vehicleClass === "CLASS_B" ? "Class B: Light 4-Wheeled" : ticket.vehicleClass === "CLASS_C" ? "Class C: Heavy 4-Wheeled+" : ticket.vehicleClass || "Standard Impound"})
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-xs">
                                                    <span className="px-3 py-1 rounded-full bg-amber-200/60 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-black">
                                                        Impounded
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-black text-sm text-amber-600 dark:text-amber-400 pr-6">
                                                    ₱ {Number(ticket.impoundFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>

                        {/* Itemized Penalty Breakdown for Overdue Citations */}
                        {penaltyBreakdown?.isOverdue && (
                            <div className="p-5 bg-rose-50/70 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-500/30 space-y-3">
                                <div className="flex items-center justify-between pb-2 border-b border-rose-200/60 dark:border-rose-500/20">
                                    <span className="font-black text-xs uppercase tracking-wider text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                                        <AlertTriangle className="w-4 h-4 text-rose-600" /> Overdue Fine & Surcharge Breakdown (RA 7160)
                                    </span>
                                    <Badge className="bg-rose-600 text-white font-black text-[9px] uppercase px-2 py-0.5">
                                        {penaltyBreakdown.monthsOverdue} {penaltyBreakdown.monthsOverdue === 1 ? "Month" : "Months"} Overdue
                                    </Badge>
                                </div>

                                <div className="space-y-1.5 text-xs font-semibold">
                                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                                        <span>Base Citation Subtotal:</span>
                                        <span className="font-mono">₱ {penaltyBreakdown.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-amber-700 dark:text-amber-300">
                                        <span>+ Late Payment Fee ({penaltyBreakdown.surchargeRate}%):</span>
                                        <span className="font-mono font-bold">₱ {penaltyBreakdown.surchargeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-purple-700 dark:text-purple-300">
                                        <span>+ Monthly Accrued Interest ({penaltyBreakdown.monthsOverdue} mo @ {penaltyBreakdown.monthlyInterestRate}%):</span>
                                        <span className="font-mono font-bold">₱ {penaltyBreakdown.interestAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="pt-2 border-t border-rose-200/60 dark:border-rose-500/20 flex justify-between font-black text-rose-600 dark:text-rose-400 text-sm">
                                        <span>Total Penalty Surcharge:</span>
                                        <span className="font-mono">₱ {penaltyBreakdown.totalPenalty.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-between items-center border-t border-slate-200 dark:border-[#2a3040]">
                            <div>
                                <span className="font-black uppercase text-xs text-slate-700 dark:text-slate-300">Total Payable Fine</span>
                                <p className="text-[10px] text-slate-500 font-semibold italic">
                                    {penaltyBreakdown?.isOverdue ? "Includes 25% Surcharge & 2% Interest" : "Payable at LGU Treasury Department"}
                                </p>
                            </div>
                            <span className="font-black text-2xl text-rose-600 dark:text-rose-400 italic">
                                ₱ {(penaltyBreakdown?.grandTotalPayable || Number(ticket.totalAmount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Evidence Photos, Signature, & Quick Summary (1 Col) */}
                <div className="space-y-8">
                    {/* Ticket Evidence Gallery Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                                <Camera className="w-5 h-5 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Photographic Evidence ({photosList.length})
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium italic">Photos captured by enforcer at scene</p>
                            </div>
                        </div>

                        {photosList.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                                <Camera className="w-8 h-8 mx-auto mb-2 opacity-50 stroke-[1.5]" />
                                <p className="text-xs font-bold">No Photos Captured</p>
                                <p className="text-[10px] mt-0.5 text-slate-400">No photographic evidence attached to this ticket.</p>
                            </div>
                        ) : (
                            <div className={
                                photosList.length === 1
                                    ? "grid grid-cols-1 gap-3"
                                    : photosList.length === 2
                                    ? "grid grid-cols-2 gap-3"
                                    : photosList.length === 3
                                    ? "grid grid-cols-3 gap-2"
                                    : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5"
                            }>
                                {photosList.map((photo: any, pIdx: number) => (
                                    <div
                                        key={photo.id || pIdx}
                                        onClick={() => {
                                            setSelectedPhoto(photo.photoUrl);
                                            setSelectedPhotoIndex(pIdx);
                                        }}
                                        className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 cursor-pointer shadow-sm hover:scale-[1.02] transition-transform"
                                    >
                                        <Image src={photo.photoUrl} alt={`Evidence photo ${pIdx + 1}`} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider gap-1">
                                            <Eye className="w-3.5 h-3.5" /> View Photo #{pIdx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Driver Signature Card */}
                    <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                        <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-[#2a3040]">
                            <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-600">
                                <Award className="w-5 h-5 stroke-[2]" />
                            </div>
                            <div>
                                <h2 className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                                    Driver&apos;s Acknowledgment
                                </h2>
                                <p className="text-[10px] text-slate-500 font-medium italic">Digital signature captured at scene</p>
                            </div>
                        </div>

                        {ticket.driverSignature ? (
                            <div className="p-4 bg-slate-950 dark:bg-black/90 rounded-2xl border border-slate-800 dark:border-white/10 flex flex-col items-center justify-center shadow-inner relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:12px_12px] opacity-40 pointer-events-none" />
                                <Image
                                    src={ticket.driverSignature}
                                    alt="Driver Signature"
                                    width={220}
                                    height={100}
                                    className="max-h-28 object-contain filter drop-shadow-[0_0_8px_rgba(255,255,255,0.4)] brightness-125 relative z-10"
                                />
                                <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-2 italic flex items-center gap-1.5 relative z-10">
                                    <Award className="w-3.5 h-3.5 text-emerald-400" /> Verified Digital Signature
                                </span>
                            </div>
                        ) : (
                            <div className="p-6 text-center bg-slate-50 dark:bg-[#0c111d] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
                                <p className="text-xs font-bold italic">Signature Unattended / Refused</p>
                                <p className="text-[10px] mt-0.5 text-slate-400">Driver did not sign or refused digital acknowledgment.</p>
                            </div>
                        )}
                    </div>

                    {/* Settlement Action or Pending Treasury Payment Notice */}
                    {ticket.status === "SETTLED" || ticket.isReleased ? (
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl p-6 border border-emerald-200 dark:border-emerald-500/20 shadow-sm space-y-3">
                            <div className="flex items-center space-x-2.5 text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                                <span className="font-black text-xs uppercase tracking-wider">Ticket Settled & Released</span>
                            </div>
                            <p className="text-xs font-semibold text-emerald-900/80 dark:text-emerald-200/90 leading-relaxed italic">
                                This citation ticket has been officially settled and any confiscated driver&apos;s license or impounded vehicle has been released.
                            </p>

                            <div className="space-y-2 py-2 border-t border-emerald-200/60 dark:border-emerald-500/20">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Official Receipt (O.R.) No:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {ticket.transaction?.payment?.orNumber || (ticket.transaction?.additionalData as any)?.orNumber || (ticket.transaction?.additionalData as any)?.orSeriesNumber || "OR-ISSUED"}
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Payment Reference:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {ticket.transaction?.payment?.reference || ticket.transaction?.paymentReference || (ticket.transaction?.additionalData as any)?.paymentReference || (ticket.transaction?.additionalData as any)?.gcashReferenceNo || (ticket.transaction?.additionalData as any)?.referenceNo || "N/A (Cash)"}
                                    </span>
                                </div>
                                {ticket.transaction?.payment?.method && (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Payment Method:</span>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white uppercase">
                                            {ticket.transaction.payment.method.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {ticket.releasedAt && (
                                <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-500/20 flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                                    <span className="uppercase tracking-wider text-[10px] text-emerald-600 dark:text-emerald-400">Released Timestamp</span>
                                    <span className="font-mono bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700/40">
                                        {new Date(ticket.releasedAt).toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" })}
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : ticket.isPaid ? (
                        <div className="space-y-4">
                            <div className="space-y-2 py-2">
                                <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                                    <span className="font-black text-xs uppercase tracking-wider">Treasury Fine Paid</span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Official Receipt (O.R.) No:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {ticket.transaction?.payment?.orNumber || (ticket.transaction?.additionalData as any)?.orNumber || "OR-ISSUED"}
                                    </span>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Payment Reference:</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {ticket.transaction?.payment?.reference || ticket.transaction?.paymentReference || (ticket.transaction?.additionalData as any)?.paymentReference || "N/A (Cash)"}
                                    </span>
                                </div>
                            </div>

                            {isPosoStaff && (
                                <Button
                                    onClick={handleMarkAsSettled}
                                    disabled={settling}
                                    style={{ backgroundColor: themeColor || undefined }}
                                    className="w-full h-14 bg-emerald-600 hover:opacity-95 text-white font-black italic uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {settling ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4" />
                                    )}
                                    <span>
                                        {ticket.isImpounded
                                            ? "Mark as Settled & Release Vehicle"
                                            : "Mark as Settled"}
                                    </span>
                                </Button>
                            )}
                        </div>
                    ) : ticket.transactionId && !ticket.isPaid ? (
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl p-6 border border-amber-200 dark:border-amber-500/20 shadow-sm space-y-3">
                            <div className="flex items-center space-x-2.5 text-amber-700 dark:text-amber-400">
                                <Clock className="w-5 h-5 stroke-[2.5]" />
                                <span className="font-black text-xs uppercase tracking-wider">Pending Treasury Settlement</span>
                            </div>
                            <p className="text-xs font-semibold text-amber-900/80 dark:text-amber-200/90 leading-relaxed italic">
                                This citation ticket has been processed into an active <strong>UNPAID Treasury Transaction</strong>. The violator must settle the fine at the Municipal Treasury Department.
                            </p>
                            <div className="pt-3 border-t border-amber-200/60 dark:border-amber-500/20 space-y-1.5 text-[11px] font-bold text-amber-900 dark:text-amber-200">
                                <div className="flex items-center justify-between">
                                    <span className="uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">Treasury Queue Number</span>
                                    <span className="font-mono font-black text-rose-600 dark:text-rose-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/40">
                                        {ticket.transaction?.queueNumber || ticket.ticketNo}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="uppercase tracking-wider text-[10px] text-amber-600 dark:text-amber-400">Transaction Reference</span>
                                    <span className="font-mono bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/40 text-[10px]">{ticket.transactionId}</span>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Enforcer Remarks Card */}
                    {ticket.remarks && (
                        <div className="bg-white dark:bg-[#151b2b] rounded-3xl p-6 border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enforcer Officer Remarks</span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 italic bg-slate-50 dark:bg-[#0c111d] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
                                &quot;{ticket.remarks}&quot;
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Photo Viewer Modal using DocumentViewerModal */}
            <DocumentViewerModal
                isOpen={Boolean(selectedPhoto)}
                onClose={() => setSelectedPhoto(null)}
                file={null}
                fileUrl={selectedPhoto}
                title={`Ticket #${ticket.ticketNo} - Photographic Evidence`}
                themeColor={themeColor || "#f43f5e"}
                documents={photosList.map((p: any, idx: number) => ({
                    url: p.photoUrl,
                    label: `Evidence Photo #${idx + 1}`
                }))}
                initialIndex={selectedPhotoIndex}
            />
        </div>
    );
}
