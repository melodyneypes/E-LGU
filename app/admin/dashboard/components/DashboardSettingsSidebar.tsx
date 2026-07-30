"use client";

import React from "react";
import { SlidersHorizontal, Eye, EyeOff, LayoutGrid, RotateCcw } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface DashboardSettingsSidebarProps {
    cardVisibility: Record<string, boolean>; // key -> visible (true = shown, false = hidden)
    onToggleVisibility: (key: string) => void;
    onResetAll: () => void;
}

const TOP_CARDS: Record<string, { label: string; desc: string; category: string }> = {
    residents: { label: "Total Residents", desc: "Registered municipal resident count", category: "Demographics" },
    jobs: { label: "Jobs Posted", desc: "Active LGU career & job opportunities", category: "Employment" },
    reports: { label: "Pending Reports", desc: "Citizen incidents needing response", category: "Public Safety" },
    projects: { label: "LGU Projects", desc: "Ongoing infrastructure projects", category: "Development" },
};

const STRATEGIC_CARDS: Record<string, { label: string; desc: string; category: string }> = {
    admin_services: { label: "Administrative Services", desc: "Quick access hub to dining, stay, gallery & hotlines", category: "Executive Hub" },
    resident_activity: { label: "Resident Activity Logs", desc: "Real-time resident transaction activity feed", category: "Analytics" },
    staff_audit: { label: "Staff Audit Logs", desc: "Employee operational audit trail & logs", category: "Audit Trail" },
};

const ANALYTICS_CARDS: Record<string, { label: string; desc: string; category: string }> = {
    daily_requests: { label: "Daily Request Analytics", desc: "Document & service request volume trend", category: "Analytics" },
    collections_ledger: { label: "Collections Ledger", desc: "Municipal revenue collection breakdown", category: "Treasury" },
    resident_analytics: { label: "Resident Analytics", desc: "Resident demographics & onboarding chart", category: "Demographics" },
    citizen_reports: { label: "Citizen Reports Overview", desc: "Live community report feed & resolution status", category: "Public Safety" },
};

export function DashboardSettingsSidebar({
    cardVisibility,
    onToggleVisibility,
    onResetAll,
}: DashboardSettingsSidebarProps) {
    const topKeys = Object.keys(TOP_CARDS);
    const strategicKeys = Object.keys(STRATEGIC_CARDS);
    const analyticsKeys = Object.keys(ANALYTICS_CARDS);
    const allKeys = [...topKeys, ...strategicKeys, ...analyticsKeys];

    const hiddenCount = allKeys.filter((k) => cardVisibility[k] === false).length;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="relative flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all border border-slate-700/60 bg-slate-900/60 shadow-md group"
                    title="Customize Dashboard Layout & Card Visibility"
                >
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    {hiddenCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center border-2 border-slate-950">
                            {hiddenCount}
                        </span>
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-80 sm:w-96 bg-slate-950 border-l border-slate-800 text-slate-100 p-0 font-sans flex flex-col h-full">
                {/* Sticky Header Section */}
                <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md p-6 border-b border-slate-800/80 space-y-2">
                    <SheetHeader className="space-y-2 text-left">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400 italic">
                            <LayoutGrid className="w-4 h-4" />
                            <span>Workspace Customization</span>
                        </div>
                        <SheetTitle className="text-xl font-black italic uppercase text-white tracking-tight">
                            Dashboard Card Visibility
                        </SheetTitle>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Toggle visibility for any card section. Hidden cards will be removed from your executive grid view and remaining cards will auto-reflow.
                        </p>
                    </SheetHeader>
                </div>

                {/* Scrollable Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Top Metric Cards Category */}
                    <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                            Core Stat Cards ({topKeys.filter(k => cardVisibility[k] !== false).length}/{topKeys.length} Visible)
                        </div>

                        {topKeys.map((key) => {
                            const info = TOP_CARDS[key];
                            const isVisible = cardVisibility[key] !== false;

                            return (
                                <div
                                    key={key}
                                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                        isVisible
                                            ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                                            : "bg-slate-900/30 border-slate-800/40 opacity-50"
                                    }`}
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase italic tracking-tight text-white truncate">
                                                {info.label}
                                            </span>
                                            <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md">
                                                {info.category}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 truncate italic">
                                            {info.desc}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onToggleVisibility(key)}
                                        className={`p-2 rounded-xl transition-all border ${
                                            isVisible
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                        }`}
                                        title={isVisible ? "Hide Card" : "Show Card"}
                                    >
                                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Strategic Operations Category */}
                    <div className="space-y-3 pt-2 border-t border-slate-800/60">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                            Strategic Operations ({strategicKeys.filter(k => cardVisibility[k] !== false).length}/{strategicKeys.length} Visible)
                        </div>

                        {strategicKeys.map((key) => {
                            const info = STRATEGIC_CARDS[key];
                            const isVisible = cardVisibility[key] !== false;

                            return (
                                <div
                                    key={key}
                                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                        isVisible
                                            ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                                            : "bg-slate-900/30 border-slate-800/40 opacity-50"
                                    }`}
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase italic tracking-tight text-white truncate">
                                                {info.label}
                                            </span>
                                            <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md">
                                                {info.category}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 truncate italic">
                                            {info.desc}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onToggleVisibility(key)}
                                        className={`p-2 rounded-xl transition-all border ${
                                            isVisible
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                        }`}
                                        title={isVisible ? "Hide Card" : "Show Card"}
                                    >
                                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Analytics Section Category */}
                    <div className="space-y-3 pt-2 border-t border-slate-800/60">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                            Analytics & Intelligence ({analyticsKeys.filter(k => cardVisibility[k] !== false).length}/{analyticsKeys.length} Visible)
                        </div>

                        {analyticsKeys.map((key) => {
                            const info = ANALYTICS_CARDS[key];
                            const isVisible = cardVisibility[key] !== false;

                            return (
                                <div
                                    key={key}
                                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                        isVisible
                                            ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                                            : "bg-slate-900/30 border-slate-800/40 opacity-50"
                                    }`}
                                >
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black uppercase italic tracking-tight text-white truncate">
                                                {info.label}
                                            </span>
                                            <span className="text-[9px] font-mono uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md">
                                                {info.category}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 truncate italic">
                                            {info.desc}
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => onToggleVisibility(key)}
                                        className={`p-2 rounded-xl transition-all border ${
                                            isVisible
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30"
                                                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                                        }`}
                                        title={isVisible ? "Hide Card" : "Show Card"}
                                    >
                                        {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sticky Footer Section */}
                <div className="sticky bottom-0 z-30 bg-slate-950/95 backdrop-blur-md p-6 border-t border-slate-800/80 space-y-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onResetAll}
                        className="w-full h-10 text-xs font-black uppercase italic tracking-wider bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800 rounded-xl gap-2"
                    >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" /> Reset Card Visibility & Layout
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
