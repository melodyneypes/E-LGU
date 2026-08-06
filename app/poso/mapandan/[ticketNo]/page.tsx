"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
    Shield, ArrowLeft, QrCode, AlertTriangle, CheckCircle2, MapPin,
    CreditCard, ShieldCheck, Car, FileText, RefreshCw, Copy, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { searchPublicTicket, getPosoPortalSettings, ensureTicketTransaction, verifyAndSyncTicketPayment } from "../actions";

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
    const [copiedRef, setCopiedRef] = useState(false);

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
        let isMounted = true;
        async function handleLoadAndSync() {
            if (isSuccessPayment && ticketNo) {
                await verifyAndSyncTicketPayment(ticketNo);
                if (isMounted) {
                    toast.success("Payment verified! Citation ticket fine successfully settled.", { id: "poso-pay-success", duration: 6000 });
                    // Clean up ?success=true from URL query string so refreshes don't re-trigger the toast
                    if (typeof window !== "undefined") {
                        const newUrl = window.location.pathname;
                        window.history.replaceState(null, "", newUrl);
                    }
                }
            }
            await fetchTicketDetails();
        }
        handleLoadAndSync();
        return () => { isMounted = false; };
    }, [fetchTicketDetails, isSuccessPayment, ticketNo]);

    // Handle PayMongo Online Payment Checkout Session creation (QRPh / GCash)
    const handlePayMongoQRPhCheckout = async () => {
        if (!ticket) return;

        setIsPaying(true);
        try {
            // 1. Ensure ticket is linked to a valid Transaction row in Prisma
            let txId = ticket.transactionId;
            if (!txId) {
                const txRes = await ensureTicketTransaction(ticket.id);
                if (txRes.success && txRes.transactionId) {
                    txId = txRes.transactionId;
                }
            }

            const totalPayable = penaltyBreakdown?.grandTotalPayable || Number(ticket.totalAmount || 0);
            const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";

            // 2. Trigger PayMongo Checkout Session
            const res = await fetch("/api/paymongo", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: totalPayable,
                    type: "gcash",
                    transactionId: txId || ticket.id,
                    reference: `POSO Citation #${ticket.ticketNo}`,
                    successUrl: `${currentOrigin}/poso/mapandan/${ticket.ticketNo}?success=true`,
                    cancelUrl: `${currentOrigin}/poso/mapandan/${ticket.ticketNo}?cancelled=true`,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                const err = data?.error || data?.errors || "Failed to initialize payment";
                toast.error(typeof err === "string" ? err : (err[0]?.detail || "Failed to initialize payment"));
                return;
            }

            const checkoutUrl = data?.data?.attributes?.checkout_url || data?.data?.attributes?.redirect?.checkout_url || data?.data?.attributes?.redirect?.url;

            if (checkoutUrl) {
                window.location.href = checkoutUrl;
            } else {
                toast.error("Failed to initiate QRPh online payment session.");
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
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.push("/poso/mapandan")}
                        className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
                        <span>Back to Ticket Search</span>
                    </button>

                    <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => router.push("/poso/mapandan")}>
                        {settings.siteLogo ? (
                            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shadow-md">
                                <Image
                                    src={settings.siteLogo}
                                    alt="Mapandan Seal"
                                    fill
                                    className="object-contain p-1"
                                    sizes="40px"
                                />
                            </div>
                        ) : (
                            <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white">
                                <Shield className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                            </div>
                        )}
                        <span className="text-xs sm:text-sm font-black tracking-tight text-white uppercase italic hidden sm:inline">
                            Mapandan POSO Portal
                        </span>
                    </div>
                </div>
            </header>

            {/* Main Ticket Details Content */}
            <main className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-10 flex-1 w-full space-y-5 sm:space-y-8">
                {/* Header Status Banner */}
                <div
                    className={`p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-2 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 ${
                        ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID"
                            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-100"
                            : penaltyBreakdown?.isOverdue
                            ? "bg-rose-950/40 border-rose-500/50 text-rose-100"
                            : "bg-amber-950/40 border-amber-500/50 text-amber-100"
                    }`}
                >
                    <div className="flex items-start space-x-3 sm:space-x-4">
                        <div
                            className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-lg shrink-0 mt-0.5 ${
                                ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID"
                                    ? "bg-emerald-500 text-white shadow-emerald-500/20"
                                    : penaltyBreakdown?.isOverdue
                                    ? "bg-rose-600 text-white shadow-rose-600/20"
                                    : "bg-amber-500 text-white shadow-amber-500/20"
                            }`}
                        >
                            {ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID" ? (
                                <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 stroke-[2.5]" />
                            ) : (
                                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
                            )}
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <h1 className="text-base sm:text-2xl font-black uppercase italic tracking-tight">
                                    Citation Ticket #{ticket.ticketNo}
                                </h1>
                                <Badge
                                    className={`font-black text-[10px] sm:text-xs px-2 py-0.5 sm:px-3 sm:py-1 uppercase rounded-lg sm:rounded-xl ${
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

                            <p className="text-[11px] sm:text-xs font-medium italic text-slate-300">
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
                    <div className="text-left md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-700/60 flex md:block items-baseline justify-between">
                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                            {ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID" ? "Amount Settled" : "Total Payable Amount"}
                        </span>
                        <span className="text-xl sm:text-3xl font-black italic text-white">
                            ₱ {(penaltyBreakdown?.grandTotalPayable || Number(ticket.totalAmount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                </div>

                {/* Main Particulars Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
                    {/* Left 2 Cols: Details & Violation Table */}
                    <div className="md:col-span-2 space-y-4 sm:space-y-6">
                        {/* Apprehended Driver Info */}
                        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 space-y-3 sm:space-y-4">
                            <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-2.5 sm:pb-3">
                                <Car className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Apprehension & Driver Details
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs">
                                <div>
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">Apprehended Driver</span>
                                    <p className="font-bold text-white text-xs sm:text-sm uppercase mt-0.5">{ticket.violatorName}</p>
                                </div>

                                <div>
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">Driver License No.</span>
                                    <p className="font-mono font-bold text-slate-200 text-xs sm:text-sm mt-0.5">{ticket.licenseNo || "N/A"}</p>
                                </div>

                                <div>
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">Vehicle / Plate No.</span>
                                    <p className="font-bold text-white uppercase italic text-xs sm:text-sm mt-0.5">
                                        {ticket.plateNo || "No Plate"} ({ticket.typeOfVehicle || "N/A"})
                                    </p>
                                </div>

                                <div>
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">POSO Enforcer</span>
                                    <p className="font-bold text-slate-200 text-xs sm:text-sm mt-0.5">
                                        {ticket.officerName || "POSO Enforcer"} {ticket.badgeNo ? `(#${ticket.badgeNo})` : ""}
                                    </p>
                                </div>

                                <div className="sm:col-span-2">
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500">Location of Offense</span>
                                    <p className="font-semibold text-slate-300 text-xs mt-0.5 flex items-start">
                                        <MapPin className="w-3.5 h-3.5 mr-1 text-rose-500 shrink-0 mt-0.5" />
                                        <span>{resolvedAddress || (ticket.location ? `${ticket.location}, Barangay ${ticket.barangay || "N/A"}` : "Mapandan, Pangasinan")}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Charged Violations Table */}
                        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 space-y-3 sm:space-y-4 overflow-hidden">
                            <h2 className="text-xs sm:text-sm font-black uppercase italic tracking-wider text-rose-400 flex items-center gap-2 border-b border-slate-800 pb-2.5 sm:pb-3">
                                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Charged Violations Breakdown
                            </h2>

                            {/* Mobile View: Clean Card Items */}
                            <div className="block sm:hidden space-y-2.5">
                                {(ticket.details || []).map((item: any) => (
                                    <div key={item.id} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-bold text-white text-xs leading-snug">{item.violationName}</p>
                                            <span className="font-mono font-black text-rose-400 text-xs shrink-0">
                                                ₱ {Number(item.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                                                {item.offenseLevel === 1 ? "1st Offense" : item.offenseLevel === 2 ? "2nd Offense" : "3rd Offense"}
                                            </span>
                                            <span className="text-slate-500 font-medium italic">Fine Amount</span>
                                        </div>
                                    </div>
                                ))}

                                {ticket.isImpounded && (
                                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-bold text-amber-200 text-xs leading-snug">
                                                Vehicle Impounding Fee ({ticket.vehicleClass === "CLASS_A" ? "Class A" : ticket.vehicleClass === "CLASS_B" ? "Class B" : ticket.vehicleClass === "CLASS_C" ? "Class C" : ticket.vehicleClass || "Impound"})
                                            </p>
                                            <span className="font-mono font-black text-amber-400 text-xs shrink-0">
                                                ₱ {Number(ticket.impoundFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-300 font-bold">
                                                Impounded
                                            </span>
                                            <span className="text-amber-400/80 font-medium italic">Impound Fee</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Desktop View: Full Table */}
                            <div className="hidden sm:block overflow-x-auto">
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
                                                <TableCell className="font-bold text-white py-3">{item.violationName}</TableCell>
                                                <TableCell className="text-center py-3">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-black text-[10px]">
                                                        {item.offenseLevel === 1 ? "1st Offense" : item.offenseLevel === 2 ? "2nd Offense" : "3rd Offense"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-rose-400 py-3">
                                                    ₱ {Number(item.amount || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        ))}

                                        {ticket.isImpounded && (
                                            <TableRow className="border-b border-amber-500/20 bg-amber-950/20 text-xs">
                                                <TableCell className="font-bold text-amber-200 py-3">
                                                    Vehicle Impounding Fee ({ticket.vehicleClass === "CLASS_A" ? "Class A: Motorcycles/Tricycles" : ticket.vehicleClass === "CLASS_B" ? "Class B: Light 4-Wheeled" : ticket.vehicleClass === "CLASS_C" ? "Class C: Heavy 4-Wheeled+" : ticket.vehicleClass || "Standard Impound"})
                                                </TableCell>
                                                <TableCell className="text-center py-3">
                                                    <span className="px-2.5 py-0.5 rounded-full bg-amber-900/40 text-amber-300 font-black text-[10px]">
                                                        Impounded
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-bold text-amber-400 py-3">
                                                    ₱ {Number(ticket.impoundFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Penalty Surcharge Summary if Overdue */}
                            {penaltyBreakdown?.isOverdue && (
                                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-950/40 border border-rose-500/30 space-y-1.5 sm:space-y-2 text-[11px] sm:text-xs font-semibold">
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
                                    <div className="pt-2 border-t border-rose-500/30 flex justify-between font-black text-rose-400 text-xs sm:text-sm">
                                        <span>Total Payable Fine:</span>
                                        <span className="font-mono">₱ {penaltyBreakdown.grandTotalPayable.toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 1 Col: Exclusive QRPh PayMongo Checkout Box */}
                    <div className="space-y-4 sm:space-y-6">
                        {ticket.isPaid || ticket.status === "SETTLED" || ticket.status === "PAID" ? (
                            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 sm:space-y-4">
                                <div className="flex items-center gap-2 text-emerald-400 font-black text-xs sm:text-sm uppercase">
                                    <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" /> Digital Receipt Verified
                                </div>

                                <p className="text-[11px] sm:text-xs text-emerald-200/80 leading-relaxed italic">
                                    This citation ticket has been officially settled. Fine payment is completed.
                                </p>

                                <div className="space-y-1.5 sm:space-y-2 pt-2.5 sm:pt-3 border-t border-emerald-500/20 text-[11px] sm:text-xs font-mono">
                                    <div className="flex justify-between items-center text-slate-300 gap-2">
                                        <span className="text-emerald-400 font-bold uppercase shrink-0">Payment Ref:</span>
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            {(() => {
                                                const mainRef = ticket.transaction?.paymentReference || ticket.transaction?.additionalData?.paymongo?.checkoutSessionId || ticket.transaction?.payment?.reference || "PAYMONGO-ONLINE";

                                                return (
                                                    <TooltipProvider delayDuration={0}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="font-mono text-white select-all truncate max-w-[130px] sm:max-w-[180px] underline decoration-dashed decoration-emerald-500/60 underline-offset-4 cursor-help hover:text-emerald-300 transition-colors">
                                                                    {mainRef}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top" className="bg-slate-900 border border-slate-700 text-slate-100 p-2.5 rounded-xl shadow-2xl text-xs max-w-xs z-[200]">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[9px] font-sans font-bold text-emerald-400 uppercase tracking-wider">Payment Reference Number:</span>
                                                                    <span className="text-white font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-emerald-500/30 select-all break-all text-[11px]">
                                                                        {mainRef}
                                                                    </span>
                                                                </div>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                );
                                            })()}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const refText = ticket.transaction?.paymentReference || ticket.transaction?.additionalData?.paymongo?.checkoutSessionId || ticket.transaction?.payment?.reference || "PAYMONGO-ONLINE";
                                                    navigator.clipboard.writeText(refText);
                                                    setCopiedRef(true);
                                                    toast.success("Payment reference copied!");
                                                    setTimeout(() => setCopiedRef(false), 2000);
                                                }}
                                                className="p-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors shrink-0"
                                                title="Copy Primary Reference Number"
                                            >
                                                {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-slate-300">
                                        <span className="text-emerald-400 font-bold uppercase">Status:</span>
                                        <span className="font-black text-emerald-400">PAID & VERIFIED</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-900 border-2 border-rose-500/40 shadow-2xl space-y-4 sm:space-y-6">
                                <div>
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest italic">
                                        <QrCode className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                        <span>Exclusive Payment Channel</span>
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-tight text-white mt-1.5 sm:mt-2">
                                        Pay Online
                                    </h3>
                                    <p className="text-[11px] sm:text-xs text-slate-400 font-medium italic mt-0.5 sm:mt-1">
                                        Scan & pay instantly using any QRPh compliant banking or e-wallet app (GCash, Maya, ShopeePay, Banks).
                                    </p>
                                </div>

                                {/* Pay Button */}
                                <Button
                                    type="button"
                                    onClick={handlePayMongoQRPhCheckout}
                                    disabled={isPaying}
                                    className="w-full h-11 sm:h-14 bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 hover:from-purple-500 hover:to-rose-500 text-white font-black italic uppercase tracking-widest text-[11px] sm:text-xs rounded-xl sm:rounded-2xl shadow-xl shadow-purple-600/20 flex items-center justify-center space-x-2 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {isPaying ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                    <span>Pay ₱ {(penaltyBreakdown?.grandTotalPayable || Number(ticket.totalAmount || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                                </Button>

                                <p className="text-[9px] sm:text-[10px] text-slate-500 text-center italic">
                                    Official BSP QRPh Merchant. Instant notification upon transaction approval.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="bg-slate-950 border-t border-slate-900/80 py-4 sm:py-8 px-4 text-center text-[9px] sm:text-xs text-slate-500 font-medium tracking-wide">
                <p>© 2026 EMapandan Municipal Portal • Public Order & Safety Office (POSO). All Rights Reserved.</p>
            </footer>
        </div>
    );
}
