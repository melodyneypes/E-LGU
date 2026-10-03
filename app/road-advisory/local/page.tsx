"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
    ShieldAlert,
    RotateCcw,
    Building2,
    Compass,
    ShieldCheck
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { getPublicRoadAdvisoriesAction, getPublicRoadAdvisorySettingsAction } from "./actions";
import { AdvisoryCard } from "./components/AdvisoryCard";
import { PublicAdvisorySkeleton } from "./components/AdvisorySkeleton";
import dynamic from "next/dynamic";
import lguConfig from "@/config/lgu.config.json";

const PublicRoadMap = dynamic(() => import("./components/PublicRoadMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-[580px] bg-slate-900 rounded-3xl flex flex-col items-center justify-center shadow-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Municipal Network...</p>
        </div>
    ),
});

export default function RoadAdvisoryPublicPage() {
    const [advisories, setAdvisories] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [selectedAdvisoryId, setSelectedAdvisoryId] = useState<string | null>(null);

    const [settings, setSettings] = useState<any>({
        siteLogo: lguConfig.assets.logo,
        location: lguConfig.poso.address,
        hotline: lguConfig.poso.hotline,
        policeHotline: lguConfig.contact.hotlines.police,
        email: lguConfig.poso.email,
    });

    const loadData = async () => {
        setLoadingData(true);
        try {
            const [advisoriesRes, settingsRes] = await Promise.all([
                getPublicRoadAdvisoriesAction(),
                getPublicRoadAdvisorySettingsAction(),
            ]);

            if (advisoriesRes.success && advisoriesRes.data) {
                setAdvisories(advisoriesRes.data);
            }
            if (settingsRes) {
                setSettings(settingsRes);
            }
        } catch (error) {
            console.error("Failed to fetch public road advisories:", error);
            toast.error("Failed to load traffic advisories. Please try again.");
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Stats calculations
    const stats = useMemo(() => {
        const closed = advisories.filter((a) => a.status === "CLOSED").length;
        const partial = advisories.filter((a) => a.status === "PARTIALLY_CLOSED").length;
        const detour = advisories.filter((a) => a.status === "DETOUR_ONLY").length;
        return { closed, partial, detour, total: advisories.length };
    }, [advisories]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
            {/* Top Municipal Navigation Header (Clean, responsive, no borders) */}
            <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer">
                        {loadingData ? (
                            <Skeleton className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-slate-800" />
                        ) : settings.siteLogo ? (
                            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-slate-800 shadow-md shrink-0">
                                <Image
                                    src={settings.siteLogo}
                                    alt="Official LGU Seal"
                                    fill
                                    className="object-contain p-1"
                                    sizes="(max-width: 640px) 36px, 44px"
                                />
                            </div>
                        ) : (
                            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-500/20 shrink-0">
                                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                            </div>
                        )}
                        <div className="min-w-0">
                            <span className="text-[9px] sm:text-xs font-black tracking-widest uppercase text-amber-500 italic block truncate">
                                LOCAL GOVERNMENT UNIT
                            </span>
                            <h1 className="text-sm sm:text-lg font-black tracking-tight text-white uppercase italic truncate">
                                Road Closures & Traffic Advisory
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Hero Section with Clean Modern Layout (Responsive) */}
            <section className="relative overflow-hidden pt-6 sm:pt-14 pb-6 sm:pb-12 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
                        <div className="space-y-2 max-w-2xl text-left">
                            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest italic">
                                <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span>Real-Time Municipal Traffic & Public Safety Monitor</span>
                            </div>
                            <h2 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white uppercase italic leading-tight">
                                Live Road Advisories & <br className="hidden sm:block" />
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-rose-400 to-orange-400">
                                    Alternative Detour Routes
                                </span>
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-400 font-medium italic leading-relaxed">
                                Stay informed on ongoing infrastructure projects, culvert repairs, and emergency road closures across all 15 barangays.
                            </p>
                        </div>

                        {/* Summary Badges Box (Responsive Grid on Mobile) */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-900/80 p-3 sm:p-4 rounded-2xl sm:rounded-3xl backdrop-blur-xl sm:min-w-[320px] shadow-lg">
                            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-rose-500/10 text-center">
                                <span className="text-lg sm:text-2xl font-black text-rose-400 block">{stats.closed}</span>
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Closed</span>
                            </div>
                            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 text-center">
                                <span className="text-lg sm:text-2xl font-black text-amber-400 block">{stats.partial}</span>
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Partial</span>
                            </div>
                            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-500/10 text-center">
                                <span className="text-lg sm:text-2xl font-black text-purple-400 block">{stats.detour}</span>
                                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Detour</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Area: Split Interactive Map & Advisory Cards (No borders) */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Interactive Map (Sticky ONLY on Desktop >= lg) */}
                    <div className="lg:col-span-7 lg:sticky lg:top-28 space-y-4">
                        <PublicRoadMap
                            advisories={advisories}
                            selectedId={selectedAdvisoryId}
                            onSelectAdvisory={(id) => {
                                setSelectedAdvisoryId(id);
                                const el = document.getElementById(`advisory-card-${id}`);
                                if (el) {
                                    el.scrollIntoView({ behavior: "smooth", block: "center" });
                                }
                            }}
                            onClearSelection={() => setSelectedAdvisoryId(null)}
                        />
                    </div>

                    {/* Right Column: Advisory List */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black uppercase tracking-wider text-white italic">
                                Active Traffic Notices ({advisories.length})
                            </h3>
                            {selectedAdvisoryId && (
                                <button
                                    onClick={() => setSelectedAdvisoryId(null)}
                                    className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
                                >
                                    Clear Selection
                                </button>
                            )}
                        </div>

                        {loadingData ? (
                            <PublicAdvisorySkeleton />
                        ) : advisories.length === 0 ? (
                            <div className="p-12 rounded-3xl bg-slate-900/60 text-center space-y-3 shadow-md">
                                <div className="p-3 bg-slate-800 rounded-2xl w-fit mx-auto text-emerald-400">
                                    <RotateCcw className="w-6 h-6" />
                                </div>
                                <h4 className="text-base font-black uppercase tracking-tight text-white italic">
                                    No Road Closures
                                </h4>
                                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                                    All major municipal roads and bridges are currently open and passable.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4 max-h-none lg:max-h-[850px] lg:overflow-y-auto lg:pr-2 lg:custom-scrollbar">
                                {advisories.map((advisory) => (
                                    <div key={advisory.id} id={`advisory-card-${advisory.id}`}>
                                        <AdvisoryCard
                                            advisory={advisory}
                                            isSelected={selectedAdvisoryId === advisory.id}
                                            onSelect={() => setSelectedAdvisoryId(advisory.id)}
                                        />
                                    </div>
                                ))}

                                {/* Public Safety Note & Tagline Below Last Card */}
                                <div className="p-4 rounded-2xl bg-slate-900/40 text-center space-y-2 pt-5 pb-4">
                                    <div className="flex items-center justify-center gap-1.5 text-amber-400">
                                        <ShieldCheck className="w-4 h-4" />
                                        <span className="text-[11px] font-black uppercase tracking-wider italic">
                                            Ingat sa Bawat Biyahe, Ka-Bayan!
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium italic max-w-sm mx-auto leading-relaxed">
                                        Traffic advisories are monitored in real-time by MDRRMO & POSO. Please follow on-site road signs and detour marshals.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Municipal Footer (Clean, no borders, no links) */}
            <footer className="mt-auto bg-slate-900/60 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                            <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-bold text-white uppercase italic tracking-wider">Local Government Unit</p>
                            <p className="text-[11px] text-slate-500">MDRRMO & Public Order and Safety Office</p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
