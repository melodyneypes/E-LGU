"use client";

import React, { useState, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { MetricCardGridPicker } from "./MetricCardGridPicker";
import { TransactionDashboardView } from "./TransactionDashboardView";
import { PaymentDashboardView } from "./PaymentDashboardView";
import { ResidentDashboardView } from "./ResidentDashboardView";
import { ReportsOverviewCard } from "./ReportsOverviewCard";
import { toast } from "sonner";

export interface AnalyticsCardConfig {
    id: string;
    colSpan: number; // 6 or 12
    rowSpan: number; // 1 to 4
}

interface ConfigurableAnalyticsSectionProps {
    // Transaction Dashboard Props
    chartData: any[];
    fromDate: Date;
    toDate: Date;
    categories: string[];
    selectedCategory: string;
    themeColor: string;

    // Payment Dashboard Props
    paymentChartData: any[];
    payFromDate: Date;
    payToDate: Date;
    payCategory: string;
    payMethod: string;

    // Resident Dashboard Props
    residentChartData: any[];
    resFromDate: Date;
    resToDate: Date;
    resGender: string;
    resCivil: string;
    resSector: string;

    // Reports Overview Props
    recentReportsDetailed?: any[];

    // Visibility toggles from Sidebar Modal
    cardVisibility?: Record<string, boolean>;
}

const DEFAULT_KEYS = [
    "daily_requests",
    "collections_ledger",
    "resident_analytics",
    "citizen_reports",
];

const DEFAULT_CONFIGS: Record<string, { defaultCols: number; defaultRows: number }> = {
    daily_requests: { defaultCols: 12, defaultRows: 1 },
    collections_ledger: { defaultCols: 12, defaultRows: 1 },
    resident_analytics: { defaultCols: 12, defaultRows: 1 },
    citizen_reports: { defaultCols: 12, defaultRows: 1 },
};

const STORAGE_KEY = "mayor_analytics_cards_individual_grid_v5";
const ORDER_STORAGE_KEY = "mayor_analytics_cards_order_v5";

export function ConfigurableAnalyticsSection({
    chartData,
    fromDate,
    toDate,
    categories,
    selectedCategory,
    themeColor,
    paymentChartData,
    payFromDate,
    payToDate,
    payCategory,
    payMethod,
    residentChartData,
    resFromDate,
    resToDate,
    resGender,
    resCivil,
    resSector,
    recentReportsDetailed,
    cardVisibility = {},
}: ConfigurableAnalyticsSectionProps) {
    const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_KEYS);

    const [configs, setConfigs] = useState<Record<string, AnalyticsCardConfig>>(() => {
        const initial: Record<string, AnalyticsCardConfig> = {};
        DEFAULT_KEYS.forEach((key) => {
            initial[key] = {
                id: key,
                colSpan: DEFAULT_CONFIGS[key].defaultCols,
                rowSpan: DEFAULT_CONFIGS[key].defaultRows,
            };
        });
        return initial;
    });

    const [draggedKey, setDraggedKey] = useState<string | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);

    useEffect(() => {
        try {
            const savedConfigs = localStorage.getItem(STORAGE_KEY);
            if (savedConfigs) {
                const parsed: Record<string, AnalyticsCardConfig> = JSON.parse(savedConfigs);
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
                if (Array.isArray(parsedOrder) && parsedOrder.length > 0) {
                    const validKeys = parsedOrder.filter((k) => DEFAULT_KEYS.includes(k));
                    DEFAULT_KEYS.forEach((k) => {
                        if (!validKeys.includes(k)) validKeys.push(k);
                    });
                    setCardOrder(validKeys);
                }
            }
        } catch {
            /* Fallback */
        }
    }, []);

    const saveConfigs = (newConfigs: Record<string, AnalyticsCardConfig>) => {
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
            },
        };
        saveConfigs(updated);
    };

    const resetCardSize = (key: string) => {
        const updated = {
            ...configs,
            [key]: {
                id: key,
                colSpan: DEFAULT_CONFIGS[key].defaultCols,
                rowSpan: DEFAULT_CONFIGS[key].defaultRows,
            },
        };
        saveConfigs(updated);
    };

    // Global Auto-Scroll Listener while dragging any card
    useEffect(() => {
        if (!draggedKey) return;

        const handleGlobalDragOver = (e: DragEvent) => {
            const threshold = 140;
            const speed = 25;

            // Find scrollable main container in AdminShell or window
            const scrollContainer = document.querySelector("main.overflow-y-auto") || window;

            if (e.clientY < threshold) {
                scrollContainer.scrollBy({ top: -speed, behavior: "auto" });
            } else if (window.innerHeight - e.clientY < threshold) {
                scrollContainer.scrollBy({ top: speed, behavior: "auto" });
            }
        };

        window.addEventListener("dragover", handleGlobalDragOver);
        return () => {
            window.removeEventListener("dragover", handleGlobalDragOver);
        };
    }, [draggedKey]);

    // HTML5 Drag & Drop Handlers
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

        if (!DEFAULT_KEYS.includes(sourceKey)) {
            toast.error("Cross-Section Drag Restricted", {
                description: "Analytics & Intelligence Cards can only be reordered within the Analytics section.",
            });
            return;
        }

        const currentOrder = [...cardOrder];
        const fromIndex = currentOrder.indexOf(sourceKey);
        const toIndex = currentOrder.indexOf(targetKey);

        if (fromIndex !== -1 && toIndex !== -1) {
            currentOrder.splice(fromIndex, 1);
            currentOrder.splice(toIndex, 0, sourceKey);
            saveOrder(currentOrder);
        }
    };

    const onDragEnd = () => {
        setDraggedKey(null);
        setDragOverKey(null);
    };

    const colSpanClasses: Record<number, string> = {
        1: "col-span-12 lg:col-span-1",
        2: "col-span-12 lg:col-span-2",
        3: "col-span-12 lg:col-span-3",
        4: "col-span-12 lg:col-span-4",
        5: "col-span-12 lg:col-span-5",
        6: "col-span-12 lg:col-span-6",
        7: "col-span-12 lg:col-span-7",
        8: "col-span-12 lg:col-span-8",
        9: "col-span-12 lg:col-span-9",
        10: "col-span-12 lg:col-span-10",
        11: "col-span-12 lg:col-span-11",
        12: "col-span-12",
    };

    const renderCardInner = (key: string, cfg: AnalyticsCardConfig) => {
        const isCompact = cfg.colSpan <= 6;

        switch (key) {
            case "daily_requests":
                return (
                    <TransactionDashboardView
                        data={chartData}
                        initialFrom={fromDate.toISOString().split("T")[0]}
                        initialTo={toDate.toISOString().split("T")[0]}
                        categories={categories}
                        activeCategory={selectedCategory}
                        themeColor={themeColor}
                        isCompact={isCompact}
                        rowSpan={cfg.rowSpan}
                    />
                );

            case "collections_ledger":
                return (
                    <PaymentDashboardView
                        data={paymentChartData}
                        initialFrom={payFromDate.toISOString().split("T")[0]}
                        initialTo={payToDate.toISOString().split("T")[0]}
                        categories={categories}
                        activeCategory={payCategory}
                        activeMethod={payMethod}
                        isCompact={isCompact}
                        rowSpan={cfg.rowSpan}
                    />
                );

            case "resident_analytics":
                return (
                    <ResidentDashboardView
                        data={residentChartData}
                        initialFrom={resFromDate.toISOString().split("T")[0]}
                        initialTo={resToDate.toISOString().split("T")[0]}
                        activeGender={resGender}
                        activeCivilStatus={resCivil}
                        activeSector={resSector}
                        isCompact={isCompact}
                        rowSpan={cfg.rowSpan}
                    />
                );

            case "citizen_reports":
                return (
                    <ReportsOverviewCard
                        initialReports={(recentReportsDetailed || []).map((r: any) => ({
                            ...r,
                            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
                        }))}
                        isCompact={isCompact}
                        rowSpan={cfg.rowSpan}
                    />
                );

            default:
                return null;
        }
    };

    const visibleCardOrder = cardOrder.filter((key) => cardVisibility[key] !== false);

    if (visibleCardOrder.length === 0) return null;

    return (
        <div className="grid grid-cols-12 gap-8 items-stretch transition-all duration-500 ease-in-out">
            {visibleCardOrder.map((key) => {
                const cfg = configs[key] || { id: key, colSpan: 12, rowSpan: 1 };
                const currentClass = colSpanClasses[cfg.colSpan] || "col-span-12";
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
                        onDragEnd={onDragEnd}
                        className={`group relative transition-all duration-300 h-full ${currentClass} ${
                            isBeingDragged ? "opacity-40 scale-[0.99] rounded-[2.5rem] border-2 border-dashed border-indigo-500" : ""
                        } ${
                            isOver ? "ring-2 ring-indigo-500/80 rounded-[2.5rem] scale-[1.01] shadow-2xl" : ""
                        }`}
                    >
                        {/* Overlay Controls: Grid Matrix Picker + Drag Handle */}
                        <div className="absolute top-8 right-8 z-30 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />

                            <div
                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700/60 shadow-sm cursor-grab active:cursor-grabbing"
                                title="Click and drag to reposition analytical section"
                            >
                                <GripVertical className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                            </div>
                        </div>

                        {renderCardInner(key, cfg)}
                    </div>
                );
            })}
        </div>
    );
}
