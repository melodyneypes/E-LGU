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

const CARD_LABELS: Record<string, { label: string; desc: string; category: string }> = {
    residents: { label: "Total Residents", desc: "Registered municipal resident count", category: "Demographics" },
    jobs: { label: "Jobs Posted", desc: "Active LGU career & job opportunities", category: "Employment" },
    reports: { label: "Pending Reports", desc: "Citizen incidents needing response", category: "Public Safety" },
    projects: { label: "LGU Projects", desc: "Ongoing infrastructure projects", category: "Development" },
};

export function DashboardSettingsSidebar({
    cardVisibility,
    onToggleVisibility,
    onResetAll,
}: DashboardSettingsSidebarProps) {
    const cardKeys = Object.keys(CARD_LABELS);
    const hiddenCount = cardKeys.filter((k) => cardVisibility[k] === false).length;

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="relative flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-all border border-slate-700/60 bg-slate-900/60 shadow-md group"
                    title="Customize Dashboard Layout & Visibility"
                >
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    {hiddenCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center border-2 border-slate-950">
                            {hiddenCount}
                        </span>
                    )}
                </button>
            </SheetTrigger>
            <SheetContent className="w-80 sm:w-96 bg-slate-950 border-l border-slate-800 text-slate-100 p-6 flex flex-col justify-between font-sans">
                <div className="space-y-6">
                    {/* Header */}
                    <SheetHeader className="space-y-2 text-left pb-4 border-b border-slate-800/80">
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400 italic">
                            <LayoutGrid className="w-4 h-4" />
                            <span>Workspace Customization</span>
                        </div>
                        <SheetTitle className="text-xl font-black italic uppercase text-white tracking-tight">
                            Dashboard Card Visibility
                        </SheetTitle>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Toggle visibility for individual metric cards. Hidden cards will be removed from your main executive grid view.
                        </p>
                    </SheetHeader>

                    {/* Card Visibility Controls List */}
                    <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                            Metric Cards ({cardKeys.length - hiddenCount}/{cardKeys.length} Visible)
                        </div>

                        {cardKeys.map((key) => {
                            const info = CARD_LABELS[key];
                            const isVisible = cardVisibility[key] !== false;

                            return (
                                <div
                                    key={key}
                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
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

                {/* Footer Controls */}
                <div className="pt-4 border-t border-slate-800/80 space-y-2">
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
