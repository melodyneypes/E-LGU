"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
    Shield, ArrowLeft, QrCode, AlertTriangle, CheckCircle2, MapPin,
    CreditCard, ShieldCheck, Car, FileText, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { searchPublicTicket, getPosoPortalSettings } from "../actions";

export default function TicketDetailsPublicPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const ticketNo = (params?.ticketNo as string) || "";
    const isSuccessPayment = searchParams.get("success") === "true";

    const [loading, setLoading] = useState(true);
    const [ticket, setTicket] = useState<any>(null);
    const [penaltyBreakdown, setPenaltyBreakdown] = useState<any>(null);
    const [isPaying, setIsPaying] = useState(false);
    const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

    // Settings state
    const [settings, setSettings] = useState<any>({
        siteLogo: "",
        posoLocation: "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines",
        posoHotline: "(075) 529-XXXX / +63 917 123 4567",
        posoEmail: "poso@mapandan.gov.ph",
        posoHours: "Monday - Friday: 8:00 AM - 5:00 PM",
        posoFacebook: "https://facebook.com/MapandanPOSO",
    });

    useEffect(() => {
        let isMounted = true;
        async function loadSettings() {
            try {
                const s = await getPosoPortalSettings();
                if (isMounted && s) setSettings(s);
            } catch { /* silent fallback */ }
        }
        loadSettings();
        return () => { isMounted = false; };
    }, []);

    const fetchTicketDetails = useCallback(async () => {
        if (!ticketNo) return;

        setLoading(true);
        try {
            const res = await searchPublicTicket(ticketNo);
            if (res.success && res.ticket) {
                setTicket(res.ticket);
                setPenaltyBreakdown(res.penaltyBreakdown);

                // Auto Reverse Geocode if lat/lng present
                if (res.ticket.latitude && res.ticket.longitude) {
                    try {
                        const geoRes = await fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${res.ticket.latitude}&lon=${res.ticket.longitude}`
                        );
                        if (geoRes.ok) {
                            const geoData = await geoRes.json();
                            if (geoData.display_name) {
                                setResolvedAddress(geoData.display_name);
                            }
                        }
                    } catch { /* silent fallback */ }
                }
            } else {
                toast.error(res.error || `Ticket "${ticketNo}" not found in POSO database. Please re-scan or verify your citation receipt.`, { duration: 6000 });
            }
        } catch {
            toast.error("Failed to load citation ticket details. Please try re-scanning.");
        } finally {
            setLoading(false);
        }
    }, [ticketNo]);

    useEffect(() => {
        fetchTicketDetails();
        if (isSuccessPayment) {
            toast.success("Payment verified! Citation ticket fine successfully settled.", { duration: 6000 });
        }
    }, [fetchTicketDetails, isSuccessPayment]);

    // Handle PayMongo Online Payment Checkout Session creation (QRPh exclusively)
    const handlePayMongoQRPhCheckout = async () => {
        if (!ticket) return;

        const totalPayable = penaltyBreakdown?.grandTotalPayable || Number(ticket.totalAmount || 0);
        const transactionId = ticket.transactionId || ticket.id;

        setIsPaying(true);
        try {
            const res = await fetch("/api/webhooks/paymongo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ticketId: ticket.id,
                    transactionId,
                    amount: totalPayable,
                    description: `POSO Citation Ticket Fine Settlement - ${ticket.ticketNo}`,
                }),
            });

            const data = await res.json();
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                toast.error(data.error || "Failed to initiate online payment session.");
            }
        } catch {
            toast.error("Payment connection error. Please try again.");
        } finally {
            setIsPaying(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
                <header className="sticky top-0 z-40 bg-slate-900/90 border-b border-slate-800/80">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                        <Skeleton className="h-6 w-36 bg-slate-800 rounded-md" />
                        <Skeleton className="h-10 w-10 bg-slate-800 rounded-xl" />
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
                    {/* Ticket Header Skeleton */}
                    <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                        <div className="flex items-center justify-between">
                            <Skeleton className="h-7 w-28 bg-slate-800 rounded-full" />
                            <Skeleton className="h-6 w-36 bg-slate-800 rounded-md" />
                        </div>
                        <div className="space-y-3">
                            <Skeleton className="h-10 w-64 bg-slate-800 rounded-xl" />
                            <Skeleton className="h-5 w-48 bg-slate-800/60 rounded-md" />
                        </div>
                    </div>

                    {/* Violations Table Skeleton */}
                    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                        <Skeleton className="h-6 w-48 bg-slate-800 rounded-md" />
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full bg-slate-800/60 rounded-xl" />
                            <Skeleton className="h-12 w-full bg-slate-800/60 rounded-xl" />
                        </div>
                    </div>

                    {/* Fine Calculation Breakdown Skeleton */}
                    <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                        <Skeleton className="h-6 w-56 bg-slate-800 rounded-md" />
                        <Skeleton className="h-20 w-full bg-slate-800/60 rounded-2xl" />
                    </div>
                </main>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <AlertTriangle className="w-12 h-12" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">Ticket Not Found</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                        No POSO Citation Record was found matching <strong className="text-rose-400 font-mono">{ticketNo}</strong>. Please check your citation receipt or re-scan your ticket.
                    </p>
                </div>
                <Button
                    onClick={() => router.push("/poso/mapandan")}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black text-xs px-6 h-12 rounded-2xl uppercase tracking-wider shadow-lg"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Re-scan / Search Another Ticket
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
            {/* Top Navigation Header */}
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.push("/poso/mapandan")}
                        className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-rose-500" />
                        <span>Back to Ticket Search</span>
                    </button>

                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push("/poso/mapandan")}>
                        {settings.siteLogo ? (
                            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shadow-md">
                                <Image
                                    src={settings.siteLogo}
                                    alt="Mapandan Seal"
                                    fill
                                    className="object-contain p-1"
                                    sizes="40px"
                                />
                            </div>
                        ) : (
                            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white">
                                <Shield className="w-5 h-5 stroke-[2.5]" />
                            </div>
                        )}
                        <span className="text-sm font-black tracking-tight text-white uppercase italic hidden sm:inline">
                            Mapandan POSO Portal
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Ticket Details Content */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex-1 w-full space-y-8">
                {/* Header Status Banner */}
                <div
                    className={`p-6 sm:p-8 rounded-3xl border-2 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                        ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID"
                            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100"
                            : penaltyBreakdown?.isOverdue
                            ? "bg-rose-950/40 border-rose-500/50 text-rose-100"
                            : "bg-amber-950/40 border-amber-500/50 text-amber-100"
                    }`}
                >
                    <div className="flex items-start space-x-4">
                        <div
                            className={`p-3.5 rounded-2xl shadow-lg shrink-0 mt-0.5 ${
                                ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID"
                                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                    : penaltyBreakdown?.isOverdue
                                    ? "bg-rose-600 text-white shadow-rose-600/20"
                                    : "bg-amber-500 text-white shadow-amber-500/20"
                            }`}
                        >
                            {ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID" ? (
                                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
                            ) : (
                                <AlertTriangle className="w-8 h-8 animate-pulse" />
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-black uppercase italic tracking-tight">
                                    Citation Ticket #{ticket.ticketNo}
                                </h1>
                                <Badge
                                    className={`font-black text-xs px-3 py-1 uppercase rounded-xl ${
                                        ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID"
                                            ? "bg-emerald-500 text-white"
                                            : penaltyBreakdown?.isOverdue
                                            ? "bg-rose-600 text-white animate-bounce"
                                            : "bg-amber-500 text-white"
                                    }`}
                                >
                                    {ticket.status === "SETTLED"
                                        ? "SETTLED & RELEASED"
                                        : ticket.isPaid || ticket.status === "PAID"
                                        ? "FINE PAID"
                                        : penaltyBreakdown?.isOverdue
                                        ? `OVERDUE (${penaltyBreakdown.daysOverdue} DAYS)`
                                        : "UNPAID CITATION"}
                                </Badge>
                            </div>

                            <p className="text-xs font-medium italic text-slate-300">
                                Apprehended on{" "}
                                {new Date(ticket.dateTime).toLocaleString("en-PH", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Total Fine Display */}
                    <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-700/60">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            {ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID" ? "Amount Settled" : "Total Payable Amount"}
                        </span>
                        <span className="text-3xl font-black italic text-white">
                            ₱ {(penaltyBreakdown?.grandTotalPayable || Number(ticket.totalAmount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Main Particulars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left 2 Cols: Details & Violation Table */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Apprehended Driver Info */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                            <h2 className="text-sm font-black uppercase italic tracking-wider text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-3">
                                <Car className="w-4 h-4" /> Apprehension & Driver Details
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-500">Apprehended Driver</span>
                                    <p className="font-bold text-white text-sm uppercase mt-0.5">{ticket.violatorName}</p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-500">Driver License No.</span>
                                    <p className="font-mono font-bold text-slate-200 text-sm mt-0.5">{ticket.licenseNo || "N/A"}</p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-500">Vehicle / Plate No.</span>
                                    <p className="font-bold text-white uppercase italic text-sm mt-0.5">
                                        {ticket.plateNo || "No Plate"} ({ticket.typeOfVehicle || "N/A"})
                                    </p>
                                </div>

                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-500">POSO Enforcer</span>
                                    <p className="font-bold text-slate-200 text-sm mt-0.5">
                                        {ticket.officerName || "POSO Enforcer"} {ticket.badgeNo ? `(#${ticket.badgeNo})` : ""}
                                    </p>
                                </div>

                                <div className="sm:col-span-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500">Location of Offense</span>
                                    <p className="font-semibold text-slate-300 mt-0.5 flex items-start">
                                        <MapPin className="w-4 h-4 mr-1 text-rose-500 shrink-0 mt-0.5" />
                                        <span>{resolvedAddress || (ticket.location ? `${ticket.location}, Barangay ${ticket.barangay || "N/A"}` : "Mapandan, Pangasinan")}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Charged Violations Table */}
                        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                            <h2 className="text-sm font-black uppercase italic tracking-wider text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-3">
                                <FileText className="w-4 h-4" /> Charged Violations Breakdown
                            </h2>

                            <Table>
                                <TableHeader>
                                    <TableRow className="border-b border-slate-800 text-[11px] uppercase">
                                        <TableHead className="text-slate-400 font-black">Violation Description</TableHead>
                                        <TableHead className="text-center text-slate-400 font-black">Offense Tier</TableHead>
                                        <TableHead className="text-right text-slate-400 font-black">Fine</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(ticket.details || []).map((item: any) => (
                                        <TableRow key={item.id} className="border-b border-slate-800/60 text-xs">
                                            <TableCell className="font-bold text-white">{item.violationName}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-black text-[10px]">
                                                    {item.offenseLevel === 1 ? "1st Offense" : item.offenseLevel === 2 ? "2nd Offense" : "3rd Offense"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-rose-400">
                                                ₱ {Number(item.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            {/* Penalty Surcharge Summary if Overdue */}
                            {penaltyBreakdown?.isOverdue && (
                                <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-2 text-xs font-semibold">
                                    <div className="flex justify-between text-slate-300">
                                        <span>Base Fines Subtotal:</span>
                                        <span className="font-mono">₱ {penaltyBreakdown.subtotal.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-amber-400">
                                        <span>+ 25% Late Payment Surcharge (RA 7160):</span>
                                        <span className="font-mono">+ ₱ {penaltyBreakdown.surchargeAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-purple-400">
                                        <span>+ Accrued Interest ({penaltyBreakdown.monthsOverdue} mo @ {penaltyBreakdown.monthlyInterestRate}%):</span>
                                        <span className="font-mono">+ ₱ {penaltyBreakdown.interestAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="pt-2 border-t border-rose-500/30 flex justify-between font-black text-rose-400 text-sm">
                                        <span>Total Payable Fine:</span>
                                        <span className="font-mono">₱ {penaltyBreakdown.grandTotalPayable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 1 Col: Exclusive QRPh PayMongo Checkout Box */}
                    <div className="space-y-6">
                        {ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID" ? (
                            <div className="p-6 rounded-3xl bg-emerald-950/30 border border-emerald-500/30 space-y-4">
                                <div className="flex items-center gap-2 text-emerald-400 font-black text-sm uppercase">
                                    <ShieldCheck className="w-5 h-5" /> Digital Receipt Verified
                                </div>

                                <p className="text-xs text-emerald-200/80 leading-relaxed italic">
                                    This citation ticket has been officially settled. Fine payment is completed.
                                </p>

                                <div className="space-y-2 pt-3 border-t border-emerald-500/20 text-xs font-mono">
                                    <div className="flex justify-between text-slate-300">
                                        <span className="text-emerald-400 font-bold uppercase">Payment Ref:</span>
                                        <span>{ticket.transaction?.paymentReference || "QRPH-ONLINE"}</span>
                                    </div>
                                    <div className="flex justify-between text-slate-300">
                                        <span className="text-emerald-400 font-bold uppercase">Status:</span>
                                        <span className="font-black text-emerald-400">PAID & VERIFIED</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 rounded-3xl bg-slate-900 border-2 border-rose-500/40 shadow-2xl space-y-6">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-widest italic">
                                        <QrCode className="w-3.5 h-3.5" />
                                        <span>Exclusive Payment Channel</span>
                                    </div>
                                    <h3 className="text-xl font-black uppercase italic tracking-tight text-white mt-2">
                                        Pay Online
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium italic mt-1">
                                        Scan & pay instantly using any QRPh compliant banking or e-wallet app (GCash, Maya, ShopeePay, Banks).
                                    </p>
                                </div>

                                {/* QRPh Official Badge Box */}
                                <div className="p-4 rounded-2xl bg-purple-950/30 border border-purple-500/30 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/20">
                                            <QrCode className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-wider text-white block">
                                                QRPh National Standard
                                            </span>
                                            <span className="text-[10px] text-purple-300 font-semibold italic block">
                                                Powered by PayMongo Gateway
                                            </span>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                        QRPh
                                    </span>
                                </div>

                                {/* Pay Button */}
                                <Button
                                    type="button"
                                    onClick={handlePayMongoQRPhCheckout}
                                    disabled={isPaying}
                                    className="w-full h-14 bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 hover:from-purple-500 hover:to-rose-500 text-white font-black italic uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-purple-600/20 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isPaying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                    <span>Pay ₱ {(penaltyBreakdown?.grandTotalPayable || Number(ticket.totalAmount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                </Button>

                                <p className="text-[10px] text-slate-500 text-center italic">
                                    Official BSP QRPh Merchant. Instant notification upon transaction approval.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500">
                <p>© 2026 EMapandan Municipal Portal • Public Order & Safety Office (POSO). All Rights Reserved.</p>
            </footer>
        </div>
    );
}
