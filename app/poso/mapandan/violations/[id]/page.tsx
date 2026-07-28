"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import {
    Shield, ArrowLeft, AlertTriangle, FileText, RefreshCw,
    ShieldCheck, CheckCircle2, ChevronRight, Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getTrafficViolationById, getPosoPortalSettings } from "../../actions";

export default function ViolationDetailsPublicPage() {
    const router = useRouter();
    const params = useParams();

    const id = (params?.id as string) || "";

    const [loading, setLoading] = useState(true);
    const [violation, setViolation] = useState<any>(null);
    const [settings, setSettings] = useState<any>({
        siteLogo: "",
        posoLocation: "Municipal Hall Complex, Poblacion, Mapandan, Pangasinan, 2429 Philippines",
        posoHotline: "(075) 529-XXXX / +63 917 123 4567",
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

    const fetchViolationDetails = useCallback(async () => {
        if (!id) return;

        setLoading(true);
        try {
            const res = await getTrafficViolationById(id);
            if (res.success && res.violation) {
                setViolation(res.violation);
            } else {
                toast.error(res.error || "Traffic violation record not found.");
            }
        } catch {
            toast.error("Failed to load traffic violation details.");
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchViolationDetails();
    }, [fetchViolationDetails]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">
                    Loading Traffic Ordinance Details...
                </p>
            </div>
        );
    }

    if (!violation) {
        return (
            <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-12 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <AlertTriangle className="w-12 h-12" />
                </div>
                <div className="space-y-2 max-w-md">
                    <h2 className="text-2xl font-black uppercase italic tracking-tight text-white">Record Not Found</h2>
                    <p className="text-xs text-slate-400">
                        No traffic violation ordinance record was found matching ID.
                    </p>
                </div>
                <Button
                    onClick={() => router.push("/poso/mapandan#ordinance-section")}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-6 h-12 rounded-2xl"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Return to Ordinance Guide
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
                        onClick={() => router.push("/poso/mapandan#ordinance-section")}
                        className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-rose-500" />
                        <span>Back to Traffic Code Guide</span>
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
            <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
                {/* Hero Header Card */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-2 border-rose-500/40 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 font-mono text-xs font-bold">
                            {violation.violationCode || "ORDINANCE CODE"}
                        </span>

                        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold italic">
                            <Scale className="w-4 h-4 text-rose-500" />
                            <span>Municipal Traffic Code</span>
                        </div>
                    </div>

                    <h1 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tight text-white leading-tight">
                        {violation.violationName}
                    </h1>

                    {violation.remarks && (
                        <p className="text-xs sm:text-sm text-slate-300 italic bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 leading-relaxed">
                            &quot;{violation.remarks}&quot;
                        </p>
                    )}
                </div>

                {/* Offense Fines Tier Schedule Cards */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <h2 className="text-lg font-black uppercase italic tracking-tight text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-rose-500" />
                            <span>Official Offense Fines Schedule</span>
                        </h2>
                        <span className="text-xs text-slate-500 italic">Per Municipal Fine Rates</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {/* 1st Offense */}
                        <div className="p-6 rounded-3xl bg-emerald-950/20 border-2 border-emerald-500/30 shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-black text-xs uppercase">
                                    1st Offense
                                </span>
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-3xl font-black italic text-emerald-400 font-mono block">
                                ₱ {Number(violation.firstOffenseFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                            <p className="text-[11px] text-emerald-200/80 italic">
                                Initial violation fine rate. Payable within standard grace period.
                            </p>
                        </div>

                        {/* 2nd Offense */}
                        <div className="p-6 rounded-3xl bg-amber-950/20 border-2 border-amber-500/30 shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 font-black text-xs uppercase">
                                    2nd Offense
                                </span>
                                <AlertTriangle className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="text-3xl font-black italic text-amber-400 font-mono block">
                                ₱ {Number(violation.secondOffenseFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                            <p className="text-[11px] text-amber-200/80 italic">
                                Second repeat offense fine rate under Municipal Traffic Code.
                            </p>
                        </div>

                        {/* 3rd Offense */}
                        <div className="p-6 rounded-3xl bg-rose-950/20 border-2 border-rose-500/30 shadow-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="px-3 py-1 rounded-xl bg-rose-500/20 text-rose-300 font-black text-xs uppercase">
                                    3rd Offense +
                                </span>
                                <ShieldCheck className="w-5 h-5 text-rose-400" />
                            </div>
                            <span className="text-3xl font-black italic text-rose-400 font-mono block">
                                ₱ {Number(violation.thirdOffenseFee || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                            </span>
                            <p className="text-[11px] text-rose-200/80 italic">
                                Third or subsequent offense fine rate. May involve license endorsement.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Important Driver Guidelines */}
                <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                    <h3 className="text-base font-black uppercase italic tracking-wider text-rose-400 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> Important Guidelines for Drivers
                    </h3>

                    <ul className="space-y-2.5 text-xs text-slate-300 italic font-medium leading-relaxed">
                        <li className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>Always carry your original Driver&apos;s License and valid vehicle Official Receipt (O.R.) & Certificate of Registration (C.R.).</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>Unsettled citation tickets exceeding standard 7-day grace period accrue a 25% late payment surcharge plus 2% monthly interest under RA 7160.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <ChevronRight className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            <span>You can pay your POSO Citation Ticket online at <strong className="text-white">/poso/mapandan</strong> using instant QRPh online payment.</span>
                        </li>
                    </ul>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-slate-950 border-t border-slate-900 py-8 text-center text-xs text-slate-500">
                <p>© 2026 EMapandan Municipal Portal • Public Order & Safety Office (POSO). All Rights Reserved.</p>
            </footer>
        </div>
    );
}
