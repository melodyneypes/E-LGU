"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { SlidersHorizontal, Eye, EyeOff, LayoutGrid, RotateCcw, GripVertical } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface DashboardSettingsSidebarProps {
    cardVisibility: Record<string, boolean>; // key -> visible (true = shown, false = hidden)
    onToggleVisibility: (key: string) => void;
    onResetAll: () => void;
    sectionOrder?: string[];
    onReorderSections?: (newOrder: string[]) => void;
}

const TOP_CARDS: Record<string, { label: string; desc: string; category: string }> = {
    residents: { label: "Registered Population", desc: "Total municipal residents enrolled in the civil registry", category: "Civil Registry" },
    jobs: { label: "Employment Listings", desc: "Active government and LGU career opportunities", category: "Labor & Employment" },
    reports: { label: "Incident Reports", desc: "Citizen-filed incidents pending administrative action", category: "Public Order" },
    projects: { label: "Infrastructure Programs", desc: "Active municipal development and capital projects", category: "Capital Projects" },
};

const STRATEGIC_CARDS: Record<string, { label: string; desc: string; category: string }> = {
    admin_services: { label: "Administrative Services Hub", desc: "Centralized access to municipal services, directories, and hotlines", category: "Executive Office" },
    resident_activity: { label: "Constituent Activity Monitor", desc: "Real-time citizen transaction and service utilization feed", category: "Operations" },
    staff_audit: { label: "Personnel Audit Trail", desc: "Employee activity logs and operational compliance records", category: "Governance" },
};

const ANALYTICS_CARDS: Record<string, { label: string; desc: string; category: string }> = {
    daily_requests: { label: "Service Demand Analytics", desc: "Document processing and service request volume trends", category: "Performance" },
    collections_ledger: { label: "Revenue & Collections", desc: "Municipal fiscal collection breakdown and treasury report", category: "Treasury" },
    resident_analytics: { label: "Demographic Intelligence", desc: "Population composition, growth trends, and registration data", category: "Civil Registry" },
    citizen_reports: { label: "Public Safety Monitor", desc: "Live incident reporting feed and resolution status tracker", category: "Public Order" },
};

const COMMUNITY_CARDS: Record<string, { label: string; desc: string; category: string }> = {
    recent_announcements: { label: "Official Announcements", desc: "Published municipal advisories and executive directives", category: "Official Notice" },
    latest_news: { label: "Press & Media Releases", desc: "Official LGU publications and press communications", category: "Public Information" },
    upcoming_events: { label: "Civic Events Calendar", desc: "Scheduled town halls, ceremonies, and municipal events", category: "Civic Affairs" },
    lgu_projects: { label: "Development Program Tracker", desc: "Infrastructure progress, milestones, and capital expenditures", category: "Capital Projects" },
};

export function DashboardSettingsSidebar({
    cardVisibility,
    onToggleVisibility,
    onResetAll,
    sectionOrder,
    onReorderSections,
}: DashboardSettingsSidebarProps) {
    const [draggedSectionKey, setDraggedSectionKey] = useState<string | null>(null);
    const [dragOverSectionKey, setDragOverSectionKey] = useState<string | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const autoScrollRAF = useRef<number | null>(null);

    const topKeys = Object.keys(TOP_CARDS);
    const strategicKeys = Object.keys(STRATEGIC_CARDS);
    const analyticsKeys = Object.keys(ANALYTICS_CARDS);
    const communityKeys = Object.keys(COMMUNITY_CARDS);
    const allKeys = [...topKeys, ...strategicKeys, ...analyticsKeys, ...communityKeys];

    const hiddenCount = allKeys.filter((k) => cardVisibility[k] === false).length;

    const activeSectionOrder = sectionOrder || ["top_metrics", "strategic_ops", "analytics", "community"];

    const sectionMeta: Record<string, { title: string; keys: string[]; cardDict: Record<string, any> }> = {
        top_metrics: { title: "Executive Summary", keys: topKeys, cardDict: TOP_CARDS },
        strategic_ops: { title: "Operations Command", keys: strategicKeys, cardDict: STRATEGIC_CARDS },
        analytics: { title: "Intelligence & Fiscal Reports", keys: analyticsKeys, cardDict: ANALYTICS_CARDS },
        community: { title: "Public Affairs & Engagement", keys: communityKeys, cardDict: COMMUNITY_CARDS },
    };

    const handleSectionDragStart = (e: React.DragEvent, sectionKey: string) => {
        e.dataTransfer.setData("text/section-key", sectionKey);
        e.dataTransfer.effectAllowed = "move";
        setDraggedSectionKey(sectionKey);
    };

    const handleSectionDragOver = (e: React.DragEvent, sectionKey: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverSectionKey !== sectionKey) {
            setDragOverSectionKey(sectionKey);
        }
    };

    const handleSectionDrop = (e: React.DragEvent, targetSectionKey: string) => {
        e.preventDefault();
        const sourceKey = e.dataTransfer.getData("text/section-key") || draggedSectionKey;
        setDraggedSectionKey(null);
        setDragOverSectionKey(null);

        if (!sourceKey || sourceKey === targetSectionKey) return;

        const currentOrder = [...activeSectionOrder];
        const fromIndex = currentOrder.indexOf(sourceKey);
        const toIndex = currentOrder.indexOf(targetSectionKey);

        if (fromIndex !== -1 && toIndex !== -1 && onReorderSections) {
            currentOrder.splice(fromIndex, 1);
            currentOrder.splice(toIndex, 0, sourceKey);
            onReorderSections(currentOrder);
        }
    };

    // Auto-scroll the sidebar when dragging near top/bottom edges
    const handleAutoScroll = useCallback((e: DragEvent) => {
        const container = scrollContainerRef.current;
        if (!container || !draggedSectionKey) return;

        const rect = container.getBoundingClientRect();
        const EDGE_ZONE = 60; // px from edge to trigger scroll
        const MAX_SPEED = 12; // px per frame

        const distFromTop = e.clientY - rect.top;
        const distFromBottom = rect.bottom - e.clientY;

        let scrollDelta = 0;

        if (distFromTop < EDGE_ZONE && distFromTop > 0) {
            // Near top edge — scroll up
            const intensity = 1 - distFromTop / EDGE_ZONE;
            scrollDelta = -(MAX_SPEED * intensity);
        } else if (distFromBottom < EDGE_ZONE && distFromBottom > 0) {
            // Near bottom edge — scroll down
            const intensity = 1 - distFromBottom / EDGE_ZONE;
            scrollDelta = MAX_SPEED * intensity;
        }

        if (scrollDelta !== 0) {
            container.scrollTop += scrollDelta;
            // Keep scrolling with RAF while held near edge
            if (autoScrollRAF.current) cancelAnimationFrame(autoScrollRAF.current);
            autoScrollRAF.current = requestAnimationFrame(() => {
                container.scrollTop += scrollDelta;
            });
        } else if (autoScrollRAF.current) {
            cancelAnimationFrame(autoScrollRAF.current);
            autoScrollRAF.current = null;
        }
    }, [draggedSectionKey]);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container || !draggedSectionKey) return;

        container.addEventListener("dragover", handleAutoScroll);
        return () => {
            container.removeEventListener("dragover", handleAutoScroll);
            if (autoScrollRAF.current) {
                cancelAnimationFrame(autoScrollRAF.current);
                autoScrollRAF.current = null;
            }
        };
    }, [draggedSectionKey, handleAutoScroll]);

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="relative bg-white dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] rounded-2xl px-3.5 py-2.5 flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer ring-1 ring-slate-200 dark:ring-white/5 hover:shadow-primary/10 hover:bg-slate-50 dark:hover:bg-[#252b3b] text-slate-600 dark:text-slate-300 group"
                    title="Customize Dashboard Layout & Card Visibility"
                >
                    <SlidersHorizontal className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                    {hiddenCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center border-2 border-white dark:border-[#1e2330]">
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
                            <span>Executive Dashboard Configuration</span>
                        </div>
                        <SheetTitle className="text-xl font-black italic uppercase text-white tracking-tight">
                            Layout & Visibility Controls
                        </SheetTitle>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Reorder sections by dragging their headers. Toggle visibility of individual dashboard modules using the eye controls.
                        </p>
                    </SheetHeader>
                </div>

                {/* Scrollable Content Body */}
                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeSectionOrder.map((sectionKey) => {
                        const meta = sectionMeta[sectionKey];
                        if (!meta) return null;

                        const isBeingDragged = draggedSectionKey === sectionKey;
                        const isOver = dragOverSectionKey === sectionKey;
                        const keys = meta.keys;

                        return (
                            <div
                                key={sectionKey}
                                draggable
                                onDragStart={(e) => handleSectionDragStart(e, sectionKey)}
                                onDragOver={(e) => handleSectionDragOver(e, sectionKey)}
                                onDragLeave={() => setDragOverSectionKey(null)}
                                onDrop={(e) => handleSectionDrop(e, sectionKey)}
                                onDragEnd={() => {
                                    setDraggedSectionKey(null);
                                    setDragOverSectionKey(null);
                                }}
                                className={`space-y-3 pt-3 pb-2 border-t border-slate-800/60 transition-all rounded-2xl p-3 ${
                                    isBeingDragged ? "opacity-30 border-2 border-dashed border-indigo-500 bg-indigo-500/10" : ""
                                } ${
                                    isOver ? "ring-2 ring-indigo-500 bg-slate-900/90 scale-[1.01]" : ""
                                }`}
                            >
                                {/* Section Drag Handle & Title Header */}
                                <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-800/40 cursor-grab active:cursor-grabbing group/sec">
                                    <div className="flex items-center gap-2">
                                        <GripVertical className="w-4 h-4 text-slate-500 group-hover/sec:text-indigo-400 transition-colors" />
                                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic group-hover/sec:text-white transition-colors">
                                            {meta.title} ({keys.filter(k => cardVisibility[k] !== false).length}/{keys.length} Visible)
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-mono text-slate-600 uppercase italic bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                        Drag Section
                                    </span>
                                </div>

                                <div className="space-y-2.5 pt-1">
                                    {keys.map((key) => {
                                        const info = meta.cardDict[key];
                                        const isVisible = cardVisibility[key] !== false;

                                        return (
                                            <div
                                                key={key}
                                                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                                    isVisible
                                                        ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                                                        : "bg-slate-900/30 border-slate-800/40 opacity-50"
                                                }`}
                                            >
                                                <div className="min-w-0 space-y-0.5">
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
                                                    className={`p-2 rounded-xl transition-all border shrink-0 ${
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
                        );
                    })}
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
