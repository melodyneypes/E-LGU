"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { SlidersHorizontal, Eye, EyeOff, LayoutGrid, RotateCcw, GripVertical } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export interface MayorDashboardSettingsSidebarProps {
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

export function MayorDashboardSettingsSidebar({
    cardVisibility,
    onToggleVisibility,
    onResetAll,
    sectionOrder,
    onReorderSections,
}: MayorDashboardSettingsSidebarProps) {
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
    const shownCount = allKeys.length - hiddenCount;

    // Default section keys for reordering
    const DEFAULT_SECTION_KEYS = ["top_metrics", "strategic_ops", "analytics", "community"];
    const activeSectionOrder = sectionOrder && sectionOrder.length > 0 ? sectionOrder : DEFAULT_SECTION_KEYS;

    // Auto-scroll handler while dragging a section
    const handleDragOverScroll = useCallback((mouseY: number) => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const topThreshold = rect.top + 80;
        const bottomThreshold = rect.bottom - 80;

        if (autoScrollRAF.current) {
            cancelAnimationFrame(autoScrollRAF.current);
            autoScrollRAF.current = null;
        }

        if (mouseY < topThreshold) {
            const intensity = Math.min(1, (topThreshold - mouseY) / 80);
            const speed = Math.max(2, Math.round(intensity * 16));
            const scrollStep = () => {
                if (container.scrollTop > 0) {
                    container.scrollTop -= speed;
                    autoScrollRAF.current = requestAnimationFrame(scrollStep);
                }
            };
            autoScrollRAF.current = requestAnimationFrame(scrollStep);
        } else if (mouseY > bottomThreshold) {
            const intensity = Math.min(1, (mouseY - bottomThreshold) / 80);
            const speed = Math.max(2, Math.round(intensity * 16));
            const scrollStep = () => {
                if (container.scrollTop < container.scrollHeight - container.clientHeight) {
                    container.scrollTop += speed;
                    autoScrollRAF.current = requestAnimationFrame(scrollStep);
                }
            };
            autoScrollRAF.current = requestAnimationFrame(scrollStep);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (autoScrollRAF.current) {
                cancelAnimationFrame(autoScrollRAF.current);
            }
        };
    }, []);

    const onSectionDragStart = (e: React.DragEvent, key: string) => {
        e.dataTransfer.setData("text/plain", key);
        e.dataTransfer.effectAllowed = "move";
        setDraggedSectionKey(key);
    };

    const onSectionDragOver = (e: React.DragEvent, key: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverSectionKey !== key) {
            setDragOverSectionKey(key);
        }
        handleDragOverScroll(e.clientY);
    };

    const onSectionDragLeave = () => {
        setDragOverSectionKey(null);
    };

    const onSectionDrop = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        if (autoScrollRAF.current) {
            cancelAnimationFrame(autoScrollRAF.current);
            autoScrollRAF.current = null;
        }
        const sourceKey = e.dataTransfer.getData("text/plain") || draggedSectionKey;
        setDraggedSectionKey(null);
        setDragOverSectionKey(null);

        if (!sourceKey || sourceKey === targetKey || !onReorderSections) return;

        const currentOrder = [...activeSectionOrder];
        const fromIndex = currentOrder.indexOf(sourceKey);
        const toIndex = currentOrder.indexOf(targetKey);

        if (fromIndex !== -1 && toIndex !== -1) {
            currentOrder.splice(fromIndex, 1);
            currentOrder.splice(toIndex, 0, sourceKey);
            onReorderSections(currentOrder);
        }
    };

    const onSectionDragEnd = () => {
        if (autoScrollRAF.current) {
            cancelAnimationFrame(autoScrollRAF.current);
            autoScrollRAF.current = null;
        }
        setDraggedSectionKey(null);
        setDragOverSectionKey(null);
    };

    const renderCardItem = (key: string, data: { label: string; desc: string; category: string }) => {
        const isVisible = cardVisibility[key] !== false;
        return (
            <div
                key={key}
                onClick={() => onToggleVisibility(key)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                    isVisible
                        ? "bg-white dark:bg-[#1a202c] border-slate-200 dark:border-[#2a3040] hover:border-[#10b981]/50 shadow-sm"
                        : "bg-slate-100/60 dark:bg-[#151923] border-slate-200/50 dark:border-[#222736] opacity-60 hover:opacity-80"
                }`}
            >
                <div className="space-y-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase italic tracking-tight text-slate-800 dark:text-slate-100 truncate">
                            {data.label}
                        </span>
                        <span className="text-[9px] font-black uppercase italic tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 shrink-0">
                            {data.category}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium italic truncate">
                        {data.desc}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggleVisibility(key);
                    }}
                    className={`p-2 rounded-xl transition-all shrink-0 ${
                        isVisible
                            ? "bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20"
                            : "bg-slate-200 dark:bg-[#252b3b] text-slate-400 hover:text-slate-200"
                    }`}
                    title={isVisible ? "Hide Container" : "Show Container"}
                >
                    {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
            </div>
        );
    };

    const renderSectionGroup = (sectionKey: string) => {
        let title = "";
        let desc = "";
        let cards: Record<string, { label: string; desc: string; category: string }> = {};

        switch (sectionKey) {
            case "top_metrics":
                title = "Key Metric Cards";
                desc = "Top-level municipal count indicators";
                cards = TOP_CARDS;
                break;
            case "strategic_ops":
                title = "Strategic Operations";
                desc = "Services, constituent activity, and audit logs";
                cards = STRATEGIC_CARDS;
                break;
            case "analytics":
                title = "Analytics & Intelligence";
                desc = "Charts, revenue ledgers, and demographic data";
                cards = ANALYTICS_CARDS;
                break;
            case "community":
                title = "Community & Media";
                desc = "Announcements, news, events, and projects";
                cards = COMMUNITY_CARDS;
                break;
            default:
                return null;
        }

        const isBeingDragged = draggedSectionKey === sectionKey;
        const isOver = dragOverSectionKey === sectionKey;

        return (
            <div
                key={sectionKey}
                draggable
                onDragStart={(e) => onSectionDragStart(e, sectionKey)}
                onDragOver={(e) => onSectionDragOver(e, sectionKey)}
                onDragLeave={onSectionDragLeave}
                onDrop={(e) => onSectionDrop(e, sectionKey)}
                onDragEnd={onSectionDragEnd}
                className={`space-y-3 p-3.5 rounded-2xl border transition-all ${
                    isBeingDragged
                        ? "opacity-30 border-dashed border-[#10b981] bg-[#10b981]/5"
                        : isOver
                        ? "border-[#10b981] bg-[#10b981]/10 scale-[1.01]"
                        : "border-slate-200/70 dark:border-[#2a3040]/70 bg-slate-50/50 dark:bg-[#121622]"
                }`}
            >
                <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-[#2a3040]/60 pb-2">
                    <div className="flex items-center gap-2">
                        <div
                            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-grab active:cursor-grabbing"
                            title="Drag to reorder section position on dashboard"
                        >
                            <GripVertical size={14} />
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-700 dark:text-slate-200">
                                {title}
                            </h4>
                            <p className="text-[10px] text-slate-400 italic">{desc}</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    {Object.keys(cards).map((k) => renderCardItem(k, cards[k]))}
                </div>
            </div>
        );
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <button
                    type="button"
                    className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white dark:bg-[#1e2330] border border-slate-200 dark:border-[#2a3040] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-xs font-black uppercase italic tracking-wider shadow-sm group"
                    title="Customize Mayor Dashboard View & Containers"
                >
                    <SlidersHorizontal size={14} className="text-[#10b981] group-hover:rotate-90 transition-transform duration-300" />
                    <span>Customize Dashboard</span>
                    {hiddenCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-black not-italic">
                            {hiddenCount} hidden
                        </span>
                    )}
                </button>
            </SheetTrigger>

            <SheetContent
                side="right"
                className="w-full sm:max-w-md bg-white dark:bg-[#151b2b] border-l border-slate-200 dark:border-[#2a3040] p-0 flex flex-col h-full"
            >
                {/* Header */}
                <SheetHeader className="p-6 border-b border-slate-100 dark:border-[#2a3040]">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#10b981]/10 flex items-center justify-center text-[#10b981] shadow-inner">
                                <LayoutGrid size={20} />
                            </div>
                            <div>
                                <SheetTitle className="text-base font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                                    Dashboard Customizer
                                </SheetTitle>
                                <p className="text-xs text-slate-400 font-medium italic">
                                    {shownCount} of {allKeys.length} containers visible
                                </p>
                            </div>
                        </div>
                    </div>
                </SheetHeader>

                {/* Content Container List */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800"
                >
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase italic tracking-wider text-slate-400">
                                Dashboard Section Layout & Containers
                            </h3>
                            <span className="text-[10px] font-bold italic text-slate-400">
                                Drag section headers to reorder
                            </span>
                        </div>

                        {activeSectionOrder.map((sectionKey) => renderSectionGroup(sectionKey))}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121622] flex items-center justify-between gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onResetAll}
                        className="flex-1 rounded-2xl border-slate-200 dark:border-[#2a3040] text-xs font-black uppercase italic tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        <RotateCcw size={13} className="mr-2" />
                        Reset Layout
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
