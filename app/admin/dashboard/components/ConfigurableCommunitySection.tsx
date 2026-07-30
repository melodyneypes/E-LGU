"use client";

import React, { useState, useEffect } from "react";
import { GripVertical } from "lucide-react";
import { MetricCardGridPicker } from "./MetricCardGridPicker";
import { RecentAnnouncementsCard } from "./RecentAnnouncementsCard";
import { LatestNewsCard } from "./LatestNewsCard";
import { UpcomingEventsCard } from "./UpcomingEventsCard";
import { LGUProjectsCard } from "./LGUProjectsCard";
import { toast } from "sonner";

export interface CommunityCardConfig {
    id: string;
    colSpan: number; // 6 or 12
    rowSpan: number; // 1 to 4
}

interface ConfigurableCommunitySectionProps {
    announcements: any[];
    news: any[];
    events: any[];
    pastEvents: any[];
    projects: any[];
    cardVisibility?: Record<string, boolean>;
}

const DEFAULT_KEYS = [
    "recent_announcements",
    "latest_news",
    "upcoming_events",
    "lgu_projects",
];

const DEFAULT_CONFIGS: Record<string, { defaultCols: number; defaultRows: number }> = {
    recent_announcements: { defaultCols: 6, defaultRows: 1 },
    latest_news: { defaultCols: 6, defaultRows: 1 },
    upcoming_events: { defaultCols: 6, defaultRows: 1 },
    lgu_projects: { defaultCols: 6, defaultRows: 1 },
};

const STORAGE_KEY = "emapandan_community_cards_grid_v1";
const ORDER_STORAGE_KEY = "emapandan_community_cards_order_v1";

export function ConfigurableCommunitySection({
    announcements,
    news,
    events,
    pastEvents,
    projects,
    cardVisibility = {},
}: ConfigurableCommunitySectionProps) {
    const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_KEYS);

    const [configs, setConfigs] = useState<Record<string, CommunityCardConfig>>(() => {
        const initial: Record<string, CommunityCardConfig> = {};
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
                const parsed: Record<string, CommunityCardConfig> = JSON.parse(savedConfigs);
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

    const saveConfigs = (newConfigs: Record<string, CommunityCardConfig>) => {
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
                description: "Community & Public Affairs Cards can only be reordered within the Community section.",
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

    const renderCardInner = (key: string, cfg: CommunityCardConfig) => {
        switch (key) {
            case "recent_announcements":
                return <RecentAnnouncementsCard announcements={announcements} rowSpan={cfg.rowSpan} />;

            case "latest_news":
                return <LatestNewsCard news={news} rowSpan={cfg.rowSpan} />;

            case "upcoming_events":
                return <UpcomingEventsCard events={events} pastEvents={pastEvents} rowSpan={cfg.rowSpan} />;

            case "lgu_projects":
                return <LGUProjectsCard projects={projects} rowSpan={cfg.rowSpan} />;

            default:
                return null;
        }
    };

    const visibleCardOrder = cardOrder.filter((key) => cardVisibility[key] !== false);

    if (visibleCardOrder.length === 0) return null;

    return (
        <div className="grid grid-cols-12 gap-8 items-stretch transition-all duration-500 ease-in-out">
            {visibleCardOrder.map((key) => {
                const cfg = configs[key] || { id: key, colSpan: 6, rowSpan: 1 };
                const currentClass = colSpanClasses[cfg.colSpan] || "col-span-12 lg:col-span-6";
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
                        className={`group relative transition-all duration-300 ${currentClass} ${
                            isBeingDragged ? "opacity-40 scale-[0.99] rounded-[2.5rem] border-2 border-dashed border-indigo-500" : ""
                        } ${
                            isOver ? "ring-2 ring-indigo-500/80 rounded-[2.5rem] scale-[1.01] shadow-2xl" : ""
                        }`}
                    >
                        {/* Overlay Controls: Grid Matrix Picker + Drag Handle */}
                        <div className="absolute top-6 right-6 z-30 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />

                            <div
                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700/60 shadow-sm cursor-grab active:cursor-grabbing"
                                title="Click and drag to reposition card"
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
