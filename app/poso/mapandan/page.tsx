"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Shield, Search, QrCode, ShieldCheck, Phone, Building2, X, RefreshCw,
    Clock, Mail, Globe, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getPosoPortalSettings, getAllTrafficViolations } from "./actions";

export default function PosoMapandanPublicPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialTicketQuery = searchParams.get("ticketNo") || searchParams.get("q") || "";
    const isSuccessPayment = searchParams.get("success") === "true";

    const [searchQuery, setSearchQuery] = useState(initialTicketQuery);
    const [loading, setLoading] = useState(false);

    // Data Loading & Skeleton States
    const [loadingPortalData, setLoadingPortalData] = useState(true);
    const [settings, setSettings] = useState<any>({
        siteLogo: "",
        posoLocation: "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines",
        posoHotline: "(075) 529-XXXX / +63 917 123 4567",
        posoEmail: "poso@mapandan.gov.ph",
        posoHours: "Monday - Friday: 8:00 AM - 5:00 PM",
        posoFacebook: "https://facebook.com/MapandanPOSO",
    });
    const [trafficViolations, setTrafficViolations] = useState<any[]>([]);

    // QR Code Modal state
    const [showQrModal, setShowQrModal] = useState(false);
    const [qrScannerInput, setQrScannerInput] = useState("");

    const performSearch = useCallback((queryToSearch: string) => {
        const clean = queryToSearch.trim();
        if (!clean) {
            toast.error("Please enter a ticket number, license no, or plate no.");
            return;
        }

        setLoading(true);
        // Navigate to dedicated Ticket Details page (/poso/mapandan/[ticketNo])
        router.push(`/poso/mapandan/${encodeURIComponent(clean)}`);
    }, [router]);

    useEffect(() => {
        let isMounted = true;
        async function loadPortalData() {
            setLoadingPortalData(true);
            try {
                const [portalSettings, violationsRes] = await Promise.all([
                    getPosoPortalSettings(),
                    getAllTrafficViolations(),
                ]);
                if (isMounted) {
                    if (portalSettings) setSettings(portalSettings);
                    if (violationsRes.success && violationsRes.violations) {
                        setTrafficViolations(violationsRes.violations);
                    }
                }
            } catch {
                /* silent fallback */
            } finally {
                if (isMounted) setLoadingPortalData(false);
            }
        }
        loadPortalData();
        return () => { isMounted = false; };
    }, []);

    useEffect(() => {
        if (initialTicketQuery) {
            performSearch(initialTicketQuery);
        }
        if (isSuccessPayment) {
            toast.success("Payment verified! Citation ticket fine successfully settled.", { duration: 6000 });
        }
    }, [initialTicketQuery, isSuccessPayment, performSearch]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
            {/* Top Municipal Navigation Header */}
            <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push("/poso/mapandan")}>
                        {loadingPortalData ? (
                            <Skeleton className="w-11 h-11 rounded-xl bg-slate-800" />
                        ) : settings.siteLogo ? (
                            <div className="relative w-11 h-11 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shadow-md">
                                <Image
                                    src={settings.siteLogo}
                                    alt="Mapandan Seal"
                                    fill
                                    className="object-contain p-1"
                                    sizes="44px"
                                />
                            </div>
                        ) : (
                            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20">
                                <Shield className="w-6 h-6 stroke-[2.5]" />
                            </div>
                        )}
                        <div>
                            <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-rose-500 italic block">
                                MUNICIPALITY OF MAPANDAN
                            </span>
                            <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase italic">
                                POSO Citation Portal
                            </h1>
                        </div>
                    </div>

                    <div className="hidden lg:flex items-center space-x-8 text-xs font-bold uppercase tracking-wider text-slate-300">
                        <a href="#search-section" className="hover:text-rose-400 transition-colors">Ticket Search</a>
                        <a href="#ordinance-section" className="hover:text-rose-400 transition-colors">Traffic Ordinances</a>
                        <a href="#contact-section" className="hover:text-rose-400 transition-colors">POSO Info & Hotlines</a>
                    </div>
                </div>
            </header>

            {/* Hero Banner Section */}
            <section className="relative overflow-hidden pt-12 sm:pt-16 pb-20 sm:pb-24 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800/60">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent pointer-events-none"></div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest italic animate-pulse">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Public Order & Safety Office • E-Services</span>
                    </div>

                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase italic leading-tight">
                        Check & Settle Traffic Violations <br className="hidden sm:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-rose-400 to-amber-400">
                            Online in Mapandan
                        </span>
                    </h2>

                    <p className="text-xs sm:text-sm md:text-base text-slate-400 max-w-2xl mx-auto font-medium italic leading-relaxed">
                        Verify your POSO Traffic Citation Ticket, check overdue penalty surcharges, and securely pay fines online.
                    </p>

                    {/* Quick Search Box Card */}
                    <div id="search-section" className="pt-4 sm:pt-6 w-full max-w-xl mx-auto px-1">
                        <div className="p-1.5 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-slate-900/95 border border-slate-700/90 shadow-2xl backdrop-blur-xl flex flex-row items-center gap-2 w-full">
                            {/* Input Box with search button embedded inside right edge */}
                            <div className="relative flex-1 min-w-0 flex items-center">
                                <Input
                                    id="ticket-search-input"
                                    type="text"
                                    placeholder="Enter Ticket No. or Plate No."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && performSearch(searchQuery)}
                                    className="pl-4 pr-14 h-12 sm:h-14 bg-slate-950/90 border-slate-800 text-white font-mono text-xs sm:text-sm uppercase rounded-xl sm:rounded-2xl focus:border-rose-500 focus:ring-rose-500/20 w-full"
                                />

                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                    >
                                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                )}

                                {/* Search Button Embedded INSIDE Input Bar */}
                                <button
                                    type="button"
                                    onClick={() => performSearch(searchQuery)}
                                    disabled={loading}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-11 sm:w-11 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white rounded-lg sm:rounded-xl shadow-md flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
                                    title="Verify Ticket"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 sm:w-5 sm:h-5" />}
                                </button>
                            </div>

                            {/* Scan QR Icon Button */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowQrModal(true)}
                                className="h-12 w-12 sm:h-14 sm:w-14 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 font-bold rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 p-0"
                                title="Scan Ticket QR Code"
                            >
                                <QrCode className="w-5 h-5 text-rose-400" />
                            </Button>
                        </div>

                        {/* Single Sample Ticket Pill */}
                        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400 font-medium">
                            <span className="text-[11px] text-slate-500 italic">Sample ticket:</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("T-2026-001");
                                    performSearch("T-2026-001");
                                }}
                                className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-rose-500 text-slate-300 font-mono text-[11px] hover:text-white transition-all shadow-sm"
                            >
                                T-2026-001
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Hub */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 flex-1 w-full space-y-16">
                {/* Municipal Traffic Code Guide (Compact Cards Grid Layout with Skeleton Loading) */}
                <section id="ordinance-section" className="space-y-6">
                    <div className="text-center space-y-2 max-w-2xl mx-auto">
                        <span className="text-xs font-black tracking-widest uppercase text-rose-500 italic">
                            Municipal Traffic Code Guide
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase italic">
                            Traffic Violations & Penalties Schedule
                        </h3>
                        <p className="text-xs text-slate-400 italic">
                            Official municipal traffic fines schedule per offense tier.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loadingPortalData ? (
                            // Render 3 Skeleton Cards while loading
                            [1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800/90 space-y-4 shadow-xl"
                                >
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Skeleton className="h-5 w-20 bg-slate-800 rounded-lg" />
                                            <Skeleton className="h-3 w-24 bg-slate-800 rounded-md" />
                                        </div>
                                        <Skeleton className="h-5 w-3/4 bg-slate-800 rounded-md" />
                                        <Skeleton className="h-3 w-full bg-slate-800/60 rounded-md" />
                                    </div>
                                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                                        <Skeleton className="h-4 w-32 bg-slate-800 rounded-md" />
                                        <Skeleton className="h-4 w-6 bg-slate-800 rounded-md" />
                                    </div>
                                </div>
                            ))
                        ) : trafficViolations.length === 0 ? (
                            <div className="col-span-full p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-xs text-slate-400 italic">
                                No traffic violation schedules found.
                            </div>
                        ) : (
                            trafficViolations.slice(0, 3).map((v: any) => (
                                <div
                                    key={v.id}
                                    onClick={() => router.push(`/poso/mapandan/violations/${v.id}`)}
                                    className="p-5 rounded-2xl bg-slate-900 border border-slate-800/90 hover:border-rose-500/50 hover:bg-slate-900/80 shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-3"
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 font-mono text-[10px] font-bold border border-rose-500/20">
                                                {v.violationCode || "TV-CODE"}
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-white leading-snug group-hover:text-rose-300 transition-colors">
                                            {v.violationName}
                                        </h4>
                                        {v.remarks && (
                                            <p className="text-[11px] text-slate-400 italic line-clamp-2">{v.remarks}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* View All Violations Page Button */}
                    <div className="flex justify-center pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push("/poso/mapandan/violations")}
                            className="h-12 px-8 bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-rose-500/50 text-slate-200 hover:text-white text-xs font-black uppercase italic tracking-wider rounded-2xl shadow-xl transition-all"
                        >
                            <span>View All Municipal Traffic Violations Directory</span>
                        </Button>
                    </div>
                </section>

                {/* Contact & POSO Portal Settings Section (with Skeletons for Loading) */}
                <section id="contact-section" className="p-6 sm:p-10 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 space-y-8 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
                        <div className="space-y-2">
                            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase italic flex items-center gap-2.5">
                                <Building2 className="w-6 h-6 text-rose-500 shrink-0" />
                                <span>Public Order & Safety Office (POSO)</span>
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-400 font-medium italic">
                                Official Municipal Traffic Enforcement & Public Safety Center
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
                        {loadingPortalData ? (
                            [1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                                    <Skeleton className="h-3 w-28 bg-slate-800 rounded-md" />
                                    <Skeleton className="h-5 w-full bg-slate-800/60 rounded-md" />
                                </div>
                            ))
                        ) : (
                            <>
                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-rose-400" /> Municipal Office Location
                                    </span>
                                    <p className="font-semibold text-slate-200 leading-relaxed">
                                        {settings.posoLocation}
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-rose-400" /> POSO Emergency Hotline
                                    </span>
                                    <p className="font-bold font-mono text-rose-400 text-sm">
                                        {settings.posoHotline}
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-rose-400" /> Operating Office Hours
                                    </span>
                                    <p className="font-semibold text-slate-200">
                                        {settings.posoHours}
                                    </p>
                                </div>

                                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                                    <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5 text-rose-400" /> Official Email & Social
                                    </span>
                                    <p className="font-semibold text-slate-200 break-all">
                                        {settings.posoEmail}
                                    </p>
                                    {settings.posoFacebook && (
                                        <a
                                            href={settings.posoFacebook}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:underline mt-1"
                                        >
                                            <Globe className="w-3 h-3" /> Facebook Page
                                        </a>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </main>

            {/* QR Scanner Camera Modal */}
            {showQrModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h3 className="text-base font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                                <QrCode className="w-5 h-5 text-rose-500" /> Scan Ticket QR Code
                            </h3>
                            <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-400 italic">
                            Align the QR Code printed on your POSO Citation Ticket in front of your camera, or paste the scanned string below:
                        </p>

                        <div className="space-y-3">
                            <Input
                                type="text"
                                placeholder="Paste or type scanned QR string (e.g. T-2026-001)"
                                value={qrScannerInput}
                                onChange={(e) => setQrScannerInput(e.target.value)}
                                className="bg-slate-950 border-slate-800 text-white font-mono text-sm uppercase"
                            />

                            <Button
                                type="button"
                                onClick={() => {
                                    if (qrScannerInput.trim()) {
                                        setShowQrModal(false);
                                        performSearch(qrScannerInput.trim());
                                    }
                                }}
                                className="w-full h-12 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-xs rounded-xl"
                            >
                                Verify Scanned Ticket
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500">
                <p>© 2026 EMapandan Municipal Portal • Public Order & Safety Office (POSO). All Rights Reserved.</p>
            </footer>
        </div>
    );
}
