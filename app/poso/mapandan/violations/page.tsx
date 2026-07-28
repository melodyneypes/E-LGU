"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Shield, ArrowLeft, Search, Scale, FileText, RefreshCw, X, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getAllTrafficViolations, getPosoPortalSettings } from "../actions";

export default function AllTrafficViolationsPublicPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [trafficViolations, setTrafficViolations] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");

    const [settings, setSettings] = useState<any>({
        siteLogo: "",
        posoLocation: "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines",
        posoHotline: "(075) 529-XXXX / +63 917 123 4567",
    });

    useEffect(() => {
        let isMounted = true;
        async function loadData() {
            setLoading(true);
            try {
                const [portalSettings, violationsRes] = await Promise.all([
                    getPosoPortalSettings(),
                    getAllTrafficViolations(),
                ]);
                if (isMounted) {
                    if (portalSettings) setSettings(portalSettings);
                    if (violationsRes.success && violationsRes.violations) {
                        setTrafficViolations(violationsRes.violations);
                    } else {
                        toast.error("Failed to load traffic violations directory.");
                    }
                }
            } catch {
                toast.error("An error occurred while loading traffic ordinances.");
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadData();
        return () => { isMounted = false; };
    }, []);

    const filteredViolations = trafficViolations.filter((v: any) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        return (
            (v.violationCode && v.violationCode.toLowerCase().includes(query)) ||
            (v.violationName && v.violationName.toLowerCase().includes(query)) ||
            (v.remarks && v.remarks.toLowerCase().includes(query))
        );
    });

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
                        <span>Back to POSO Portal</span>
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

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">
                {/* Hero Banner Section */}
                <div className="text-center space-y-4 max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest italic">
                        <Scale className="w-4 h-4" />
                        <span>Municipal Ordinance Directory</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase italic leading-tight">
                        All Municipal Traffic Violations & Fines
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-400 font-medium italic">
                        Complete reference schedule of official traffic codes, fines per offense tier, and driver compliance guidelines.
                    </p>

                    {/* Filter Search Input */}
                    <div className="pt-4 max-w-xl mx-auto">
                        <div className="relative w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
                            <Input
                                type="text"
                                placeholder="Search violation by title or code (e.g. Helmet, License)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-10 h-13 bg-slate-900 border-slate-800 text-white text-xs sm:text-sm rounded-2xl focus:border-rose-500 focus:ring-rose-500/20"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Violations Cards Grid */}
                {loading ? (
                    <div className="py-16 text-center space-y-3">
                        <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mx-auto" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Loading Municipal Traffic Ordinances...
                        </p>
                    </div>
                ) : filteredViolations.length === 0 ? (
                    <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
                        <FileText className="w-10 h-10 text-slate-600 mx-auto" />
                        <h3 className="text-base font-bold text-white uppercase italic">No Violations Found</h3>
                        <p className="text-xs text-slate-400">
                            No traffic ordinance matched your search query &quot;<strong className="text-rose-400">{searchQuery}</strong>&quot;.
                        </p>
                        <Button
                            onClick={() => setSearchQuery("")}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 h-10 rounded-xl"
                        >
                            Reset Search Filter
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {filteredViolations.map((v: any) => (
                            <div
                                key={v.id}
                                onClick={() => router.push(`/poso/mapandan/violations/${v.id}`)}
                                className="p-6 rounded-3xl bg-slate-900 border border-slate-800/90 hover:border-rose-500/50 hover:bg-slate-900/80 shadow-xl transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-400 font-mono text-xs font-bold border border-rose-500/20">
                                            {v.violationCode || "TV-CODE"}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-rose-400 transition-colors">
                                            View Schedule →
                                        </span>
                                    </div>

                                    <h3 className="text-base font-bold text-white leading-snug group-hover:text-rose-300 transition-colors">
                                        {v.violationName}
                                    </h3>

                                    {v.remarks && (
                                        <p className="text-xs text-slate-400 italic line-clamp-2 leading-relaxed">
                                            {v.remarks}
                                        </p>
                                    )}
                                </div>

                                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-semibold group-hover:text-rose-400 transition-colors">
                                    <span>Offense Rates & Guidelines</span>
                                    <span className="text-rose-500 font-bold">→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Bottom POSO Note Card */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                            <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-white uppercase italic">Official Ordinance Schedule</h4>
                            <p className="text-slate-400 italic">
                                Fines prescribed by Municipal Traffic Code. Unsettled tickets accrue statutory surcharges under RA 7160.
                            </p>
                        </div>
                    </div>

                    <Button
                        onClick={() => router.push("/poso/mapandan")}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-6 h-11 rounded-2xl shrink-0 uppercase italic tracking-wider"
                    >
                        Check Citation Ticket
                    </Button>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500">
                <p>© 2026 EMapandan Municipal Portal • Public Order & Safety Office (POSO). All Rights Reserved.</p>
            </footer>
        </div>
    );
}
