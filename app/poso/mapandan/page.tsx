"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Shield, Search, QrCode, ShieldCheck, Phone, Building2, X, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PosoMapandanPublicPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialTicketQuery = searchParams.get("ticketNo") || searchParams.get("q") || "";
    const isSuccessPayment = searchParams.get("success") === "true";

    const [searchQuery, setSearchQuery] = useState(initialTicketQuery);
    const [loading, setLoading] = useState(false);

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
            <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-3 cursor-pointer" onClick={() => router.push("/poso/mapandan")}>
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-lg shadow-rose-500/20">
                            <Shield className="w-6 h-6 stroke-[2.5]" />
                        </div>
                        <div>
                            <span className="text-xs font-black tracking-widest uppercase text-rose-500 italic block">
                                MUNICIPALITY OF MAPANDAN
                            </span>
                            <h1 className="text-lg font-black tracking-tight text-white uppercase italic flex items-center gap-1.5">
                                <span>POSO Citation Portal</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-sans not-italic font-bold">
                                    Official
                                </span>
                            </h1>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-6 text-xs font-bold uppercase tracking-wider text-slate-300">
                        <a href="#search-section" className="hover:text-rose-400 transition-colors">Ticket Search</a>
                        <a href="#ordinance-section" className="hover:text-rose-400 transition-colors">Fines & Ordinances</a>
                        <a href="#contact-section" className="hover:text-rose-400 transition-colors">POSO Office Info</a>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/admin/poso/tickets")}
                        className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs font-bold rounded-xl"
                    >
                        Official Portal
                    </Button>
                </div>
            </header>

            {/* Hero Banner Section */}
            <section className="relative overflow-hidden pt-16 pb-24 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-b border-slate-800/60">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent pointer-events-none"></div>

                <div className="max-w-4xl mx-auto px-4 text-center space-y-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest italic animate-pulse">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Public Order & Safety Office • E-Services</span>
                    </div>

                    <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase italic leading-tight">
                        Check & Settle Traffic Violations <br className="hidden sm:block" />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-rose-400 to-amber-400">
                            Online via QRPh in Mapandan
                        </span>
                    </h2>

                    <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto font-medium italic">
                        Verify your POSO Traffic Citation Ticket, check overdue penalty surcharges, and securely pay fines online using QRPh (GCash, Maya, ShopeePay, or Banks).
                    </p>

                    {/* Quick Search Box Card */}
                    <div id="search-section" className="pt-6 max-w-2xl mx-auto">
                        <div className="p-3 sm:p-4 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative w-full flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <Input
                                    id="ticket-search-input"
                                    type="text"
                                    placeholder="Enter Ticket No. (e.g. T-2026-001) or Plate No."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && performSearch(searchQuery)}
                                    className="pl-12 pr-10 h-14 bg-slate-950/80 border-slate-800 text-white font-mono text-sm uppercase rounded-2xl focus:border-rose-500 focus:ring-rose-500/20"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery("")}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setShowQrModal(true)}
                                    className="h-14 px-4 bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-2 shrink-0"
                                    title="Scan QR Code on Ticket"
                                >
                                    <QrCode className="w-5 h-5 text-rose-400" />
                                    <span className="sm:hidden lg:inline text-xs">Scan QR</span>
                                </Button>

                                <Button
                                    type="button"
                                    onClick={() => performSearch(searchQuery)}
                                    disabled={loading}
                                    className="h-14 px-8 w-full sm:w-auto bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-600 text-white font-black italic uppercase text-xs tracking-widest rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2"
                                >
                                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                    <span>Verify Ticket</span>
                                </Button>
                            </div>
                        </div>

                        {/* Sample Ticket Pills */}
                        <div className="mt-4 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400 font-medium">
                            <span className="text-[11px] text-slate-500 italic">Try searching sample tickets:</span>
                            {["T-2026-001", "T-2026-006", "T-2026-007"].map((sampleNo) => (
                                <button
                                    key={sampleNo}
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery(sampleNo);
                                        performSearch(sampleNo);
                                    }}
                                    className="px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700/60 hover:border-rose-500 text-slate-300 font-mono text-[11px] hover:text-white transition-all shadow-sm"
                                >
                                    {sampleNo}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Hub */}
            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-1 w-full space-y-16">
                {/* POSO Fines Reference & Ordinance Section */}
                <section id="ordinance-section" className="space-y-6">
                    <div className="text-center space-y-2">
                        <span className="text-xs font-black tracking-widest uppercase text-rose-500 italic">
                            Municipal Traffic Code Guide
                        </span>
                        <h3 className="text-2xl font-black tracking-tight text-white uppercase italic">
                            Common Traffic Violations & Standard Fines
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                title: "No Helmet / Safety Gear",
                                desc: "Riding motorcycle or tricycle without prescribed helmet.",
                                fine: "₱ 500.00",
                                class: "Class A",
                            },
                            {
                                title: "Driving Without License",
                                desc: "Operating a motor vehicle without a valid DTO/LTO driver license.",
                                fine: "₱ 1,000.00",
                                class: "Class A / B",
                            },
                            {
                                title: "Illegal Parking / Obstruction",
                                desc: "Parking on national highway, sidewalk, or designated clear zones.",
                                fine: "₱ 1,500.00",
                                class: "Class B / C",
                            },
                        ].map((item, idx) => (
                            <div key={idx} className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg">
                                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-mono font-bold uppercase">
                                    {item.class}
                                </span>
                                <h4 className="text-base font-bold text-white">{item.title}</h4>
                                <p className="text-xs text-slate-400">{item.desc}</p>
                                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                                    <span className="text-slate-500 uppercase font-black text-[10px]">Standard Fine</span>
                                    <span className="font-mono font-black text-rose-400">{item.fine}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contact & POSO Office Location Section */}
                <section id="contact-section" className="p-8 rounded-3xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 space-y-6 shadow-2xl">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-black tracking-tight text-white uppercase italic flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-rose-500" />
                                <span>Public Order & Safety Office (POSO) - Mapandan</span>
                            </h3>
                            <p className="text-xs text-slate-400 font-medium italic">
                                Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines
                            </p>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold">
                            <div className="flex items-center gap-2 text-rose-400">
                                <Phone className="w-4 h-4" />
                                <span>POSO Hotline: (075) 529-XXXX</span>
                            </div>
                        </div>
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
