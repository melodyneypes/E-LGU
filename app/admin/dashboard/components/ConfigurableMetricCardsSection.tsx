"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, RotateCcw, Users, Briefcase, AlertTriangle, Hammer, GripVertical } from "lucide-react";
import { MetricCardGridPicker } from "./MetricCardGridPicker";
import { DashboardSettingsSidebar } from "./DashboardSettingsSidebar";
import { Button } from "@/components/ui/button";

export interface MetricCardConfig {
    id: string;
    colSpan: number; // 1 to 12
    rowSpan: number; // 1 to 6
    hidden: boolean;
    isManualOverride?: boolean; // Flag to check if user manually picked a matrix size
}

interface ConfigurableMetricCardsSectionProps {
    residentsCount: number;
    jobsCount: number;
    reportsCount: number;
    projectsCount: number;
}

const DEFAULT_KEYS = ["residents", "jobs", "reports", "projects"];

const DEFAULT_CONFIGS: Record<string, { defaultCols: number; defaultRows: number }> = {
    residents: { defaultCols: 3, defaultRows: 1 },
    jobs: { defaultCols: 3, defaultRows: 1 },
    reports: { defaultCols: 3, defaultRows: 1 },
    projects: { defaultCols: 3, defaultRows: 1 },
};

const STORAGE_KEY = "emapandan_metric_cards_individual_grid_v5";
const ORDER_STORAGE_KEY = "emapandan_metric_cards_order_v5";

export function ConfigurableMetricCardsSection({
    residentsCount,
    jobsCount,
    reportsCount,
    projectsCount,
}: ConfigurableMetricCardsSectionProps) {
    const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_KEYS);

    const [configs, setConfigs] = useState<Record<string, MetricCardConfig>>(() => {
        const initial: Record<string, MetricCardConfig> = {};
        DEFAULT_KEYS.forEach((key) => {
            initial[key] = {
                id: key,
                colSpan: DEFAULT_CONFIGS[key].defaultCols,
                rowSpan: DEFAULT_CONFIGS[key].defaultRows,
                hidden: false,
                isManualOverride: false,
            };
        });
        return initial;
    });

    const [draggedKey, setDraggedKey] = useState<string | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        try {
            const savedConfigs = localStorage.getItem(STORAGE_KEY);
            if (savedConfigs) {
                const parsed: Record<string, MetricCardConfig> = JSON.parse(savedConfigs);
                setConfigs((prev) => {
                    const next = { ...prev };
                    Object.keys(parsed).forEach((k) => {
                        if (next[k]) {
                            next[k] = { ...next[k], ...parsed[k] };
                        }
                    });
                    return next;
                });
            }

            const savedOrder = localStorage.getItem(ORDER_STORAGE_KEY);
            if (savedOrder) {
                const parsedOrder: string[] = JSON.parse(savedOrder);
                const validOrder = parsedOrder.filter((k) => DEFAULT_KEYS.includes(k));
                const missingKeys = DEFAULT_KEYS.filter((k) => !validOrder.includes(k));
                setCardOrder([...validOrder, ...missingKeys]);
            }
        } catch {
            /* Fallback */
        }
    }, []);

    const saveConfigs = (newConfigs: Record<string, MetricCardConfig>) => {
        setConfigs(newConfigs);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
        } catch {
            /* Fail gracefully */
        }
    };

    const saveOrder = (newOrder: string[]) => {
        setCardOrder(newOrder);
        try {
            localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(newOrder));
        } catch {
            /* Fail gracefully */
        }
    };

    const updateCardSize = (key: string, cols: number, rows: number) => {
        const updated = {
            ...configs,
            [key]: {
                ...configs[key],
                colSpan: cols,
                rowSpan: rows,
                isManualOverride: true,
            },
        };
        saveConfigs(updated);
    };

    const toggleCardVisibility = (key: string) => {
        const targetWillHide = !configs[key].hidden;

        // Calculate remaining visible keys after toggle
        const visibleAfterToggle = DEFAULT_KEYS.filter((k) =>
            k === key ? !targetWillHide : !configs[k].hidden
        );

        const visibleCount = visibleAfterToggle.length;
        const autoCalculatedCols = visibleCount > 0 ? Math.floor(12 / visibleCount) : 12;

        const updated = { ...configs };
        updated[key] = {
            ...configs[key],
            hidden: targetWillHide,
        };

        // Recalculate auto-adapted column span for visible cards without manual override
        visibleAfterToggle.forEach((k) => {
            if (!updated[k].isManualOverride) {
                updated[k] = {
                    ...updated[k],
                    colSpan: autoCalculatedCols,
                };
            }
        });

        saveConfigs(updated);
    };

    const resetCardSize = (key: string) => {
        const visibleKeys = DEFAULT_KEYS.filter((k) => !configs[k].hidden);
        const visibleCount = visibleKeys.length;
        const autoCalculatedCols = visibleCount > 0 ? Math.floor(12 / visibleCount) : 3;

        const updated = {
            ...configs,
            [key]: {
                ...configs[key],
                colSpan: autoCalculatedCols,
                rowSpan: DEFAULT_CONFIGS[key].defaultRows,
                isManualOverride: false,
            },
        };
        saveConfigs(updated);
    };

    const resetAllConfigs = () => {
        const initial: Record<string, MetricCardConfig> = {};
        DEFAULT_KEYS.forEach((key) => {
            initial[key] = {
                id: key,
                colSpan: DEFAULT_CONFIGS[key].defaultCols,
                rowSpan: DEFAULT_CONFIGS[key].defaultRows,
                hidden: false,
                isManualOverride: false,
            };
        });
        setConfigs(initial);
        setCardOrder(DEFAULT_KEYS);
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(ORDER_STORAGE_KEY);
        } catch {
            /* Fail gracefully */
        }
    };

    // HTML5 Drag & Drop Event Handlers
    const onDragStart = (e: React.DragEvent, key: string) => {
        e.dataTransfer.setData("text/plain", key);
        e.dataTransfer.effectAllowed = "move";
        setDraggedKey(key);
    };

    const onDragOver = (e: React.DragEvent, key: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverKey !== key) {
            setDragOverKey(key);
        }
    };

    const onDragLeave = () => {
        setDragOverKey(null);
    };

    const onDrop = (e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        const sourceKey = e.dataTransfer.getData("text/plain") || draggedKey;
        setDraggedKey(null);
        setDragOverKey(null);

        if (!sourceKey || sourceKey === targetKey) return;

        const currentOrder = [...cardOrder];
        const fromIndex = currentOrder.indexOf(sourceKey);
        const toIndex = currentOrder.indexOf(targetKey);

        if (fromIndex !== -1 && toIndex !== -1) {
            currentOrder.splice(fromIndex, 1);
            currentOrder.splice(toIndex, 0, sourceKey);
            saveOrder(currentOrder);
        }
    };

    const cardVisibilityMap: Record<string, boolean> = {};
    DEFAULT_KEYS.forEach((k) => {
        cardVisibilityMap[k] = !configs[k]?.hidden;
    });

    const hiddenKeys = DEFAULT_KEYS.filter((k) => configs[k]?.hidden);

    const renderCardInner = (key: string, cfg: MetricCardConfig) => {
        const isWide = cfg.colSpan > 6;
        const isTall = cfg.rowSpan > 1;

        const calculatedMinHeight = Math.max(180, 180 + (cfg.rowSpan - 1) * 120);
        const calculatedIconSize = Math.min(260, Math.max(120, 120 + (cfg.colSpan > 6 ? 40 : 0) + (cfg.rowSpan - 1) * 35));
        const calculatedFontSize = isTall && isWide ? "text-7xl" : isTall ? "text-6xl" : isWide ? "text-6xl" : "text-5xl";

        const containerStyle: React.CSSProperties = {
            minHeight: `${calculatedMinHeight}px`,
        };

        switch (key) {
            case "residents":
                return (
                    <div
                        style={containerStyle}
                        className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1 h-full flex flex-col justify-between"
                    >
                        <div className="absolute -top-4 -right-4 text-blue-100 dark:text-blue-500/10 transition-transform group-hover:scale-110 pointer-events-none">
                            <Users size={calculatedIconSize} strokeWidth={1} />
                        </div>
                        <div className="z-10">
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Total Residents</p>
                            <h2 className={`font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4 transition-all ${calculatedFontSize}`}>
                                {residentsCount.toLocaleString()}
                            </h2>
                        </div>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-blue-600 italic z-10">
                            <span className="bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">Registered Registry</span>
                        </div>
                    </div>
                );

            case "jobs":
                return (
                    <div
                        style={containerStyle}
                        className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1 h-full flex flex-col justify-between"
                    >
                        <div className="absolute -top-4 -right-4 text-emerald-100 dark:text-emerald-500/10 transition-transform group-hover:scale-110 pointer-events-none">
                            <Briefcase size={calculatedIconSize} strokeWidth={1} />
                        </div>
                        <div className="z-10">
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Jobs Posted</p>
                            <h2 className={`font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4 transition-all ${calculatedFontSize}`}>
                                {jobsCount.toLocaleString()}
                            </h2>
                        </div>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-emerald-600 italic z-10">
                            <span className="bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">Available Openings</span>
                        </div>
                    </div>
                );

            case "reports":
                return (
                    <div
                        style={containerStyle}
                        className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1 h-full flex flex-col justify-between"
                    >
                        <div className="absolute -top-4 -right-4 text-orange-100 dark:text-orange-500/10 transition-transform group-hover:scale-110 pointer-events-none">
                            <AlertTriangle size={calculatedIconSize} strokeWidth={1} />
                        </div>
                        <div className="z-10">
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">Pending Reports</p>
                            <h2 className={`font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4 transition-all ${calculatedFontSize}`}>
                                {reportsCount.toLocaleString()}
                            </h2>
                        </div>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-orange-600 italic z-10">
                            <span className="bg-orange-50 dark:bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">Needs Response</span>
                        </div>
                    </div>
                );

            case "projects":
                return (
                    <div
                        style={containerStyle}
                        className="bg-white dark:bg-[#1e2330] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1 h-full flex flex-col justify-between"
                    >
                        <div className="absolute -top-4 -right-4 text-purple-100 dark:text-purple-500/10 transition-transform group-hover:scale-110 pointer-events-none">
                            <Hammer size={calculatedIconSize} strokeWidth={1} />
                        </div>
                        <div className="z-10">
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1 italic">LGU Projects</p>
                            <h2 className={`font-black text-slate-900 dark:text-white tracking-tighter italic leading-none mb-4 transition-all ${calculatedFontSize}`}>
                                {projectsCount.toLocaleString()}
                            </h2>
                        </div>
                        <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-purple-600 italic z-10">
                            <span className="bg-purple-50 dark:bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">Infrastructure Works</span>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const colSpanClasses: Record<number, string> = {
        1: "col-span-12 sm:col-span-6 md:col-span-3 lg:col-span-1",
        2: "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2",
        3: "col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-3",
        4: "col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-4",
        5: "col-span-12 lg:col-span-5",
        6: "col-span-12 lg:col-span-6",
        7: "col-span-12 lg:col-span-7",
        8: "col-span-12 lg:col-span-8",
        9: "col-span-12 lg:col-span-9",
        10: "col-span-12 lg:col-span-10",
        11: "col-span-12 lg:col-span-11",
        12: "col-span-12",
    };

    return (
        <div className="space-y-4">
            {/* Top Bar Section Header Toolbar with Settings Sidebar Icon */}
            <div className="flex items-center justify-end px-2 py-1">
                <div className="flex items-center gap-2">
                    {/* Appbar Workspace Settings Drawer Trigger Icon */}
                    <DashboardSettingsSidebar
                        cardVisibility={cardVisibilityMap}
                        onToggleVisibility={toggleCardVisibility}
                        onResetAll={resetAllConfigs}
                    />
                </div>
            </div>

            {/* 12-Column CSS Grid Container for the 4 Stat Cards with Drag & Drop */}
            <div className="grid grid-cols-12 gap-6 items-start transition-all duration-500 ease-in-out">
                {cardOrder.map((key) => {
                    const cfg = configs[key] || { id: key, colSpan: 3, rowSpan: 1, hidden: false };
                    if (cfg.hidden) return null;

                    const currentClass = colSpanClasses[cfg.colSpan] || "col-span-12 sm:col-span-6 md:col-span-6 lg:col-span-3";
                    const isBeingDragged = draggedKey === key;
                    const isOver = dragOverKey === key;

                    return (
                        <div
                            key={key}
                            draggable
                            onDragStart={(e) => onDragStart(e, key)}
                            onDragOver={(e) => onDragOver(e, key)}
                            onDragLeave={onDragLeave}
                            onDrop={(e) => onDrop(e, key)}
                            className={`group relative transition-all duration-300 rounded-[2.5rem] ${currentClass} ${
                                isBeingDragged ? "opacity-40 scale-[0.99] border-2 border-dashed border-blue-500" : ""
                            } ${
                                isOver ? "ring-2 ring-blue-500/80 scale-[1.01] shadow-2xl" : ""
                            }`}
                        >
                            {/* Card Header Overlay Controls: Grid Matrix Picker + Drag Handle */}
                            <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                <MetricCardGridPicker
                                    currentCols={cfg.colSpan}
                                    currentRowSpan={cfg.rowSpan}
                                    onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                    onReset={() => resetCardSize(key)}
                                />

                                {/* Drag Handle Icon */}
                                <div
                                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700/60 shadow-sm cursor-grab active:cursor-grabbing"
                                    title="Click and drag to reposition metric card"
                                >
                                    <GripVertical className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                                </div>
                            </div>

                            {/* Render Card UI Directly */}
                            {renderCardInner(key, cfg)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
