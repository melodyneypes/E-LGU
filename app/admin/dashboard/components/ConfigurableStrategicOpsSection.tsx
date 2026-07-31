"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Utensils, Hotel, Image, Flag, Phone, GripVertical } from "lucide-react";
import { MetricCardGridPicker } from "./MetricCardGridPicker";
import { ActivityLogsCard } from "./ActivityLogsCard";
import { StaffActivityLogsCard } from "./StaffActivityLogsCard";
import { toast } from "sonner";

export interface StrategicOpsConfig {
    id: string;
    colSpan: number; // 1 to 12
    rowSpan: number; // 1 to 6
    hidden: boolean;
    isManualOverride?: boolean;
}

interface ConfigurableStrategicOpsSectionProps {
    themeColor: string;
    activityLogs: any[];
    staffLogs: any[];
    selectedBarangay?: string;
    visibilityMap?: Record<string, boolean>;
    onToggleVisibility?: (key: string) => void;
}

const DEFAULT_KEYS = ["admin_services", "resident_activity", "staff_audit"];

const DEFAULT_CONFIGS: Record<string, { defaultCols: number; defaultRows: number }> = {
    admin_services: { defaultCols: 4, defaultRows: 1 },
    resident_activity: { defaultCols: 4, defaultRows: 1 },
    staff_audit: { defaultCols: 4, defaultRows: 1 },
};

const STORAGE_KEY = "emapandan_strategic_ops_grid_v2";
const ORDER_STORAGE_KEY = "emapandan_strategic_ops_order_v1";

export function ConfigurableStrategicOpsSection({
    themeColor,
    activityLogs,
    staffLogs,
    selectedBarangay,
    visibilityMap,
}: ConfigurableStrategicOpsSectionProps) {
    const [cardOrder, setCardOrder] = useState<string[]>(DEFAULT_KEYS);

    const [configs, setConfigs] = useState<Record<string, StrategicOpsConfig>>(() => {
        const initial: Record<string, StrategicOpsConfig> = {};
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

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed: Record<string, StrategicOpsConfig> = JSON.parse(saved);
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

    // Sync external visibilityMap from parent if passed
    useEffect(() => {
        if (visibilityMap) {
            setConfigs((prev) => {
                let updated = false;
                const next = { ...prev };
                DEFAULT_KEYS.forEach((k) => {
                    if (visibilityMap[k] !== undefined) {
                        const targetHidden = !visibilityMap[k];
                        if (next[k].hidden !== targetHidden) {
                            next[k] = { ...next[k], hidden: targetHidden };
                            updated = true;
                        }
                    }
                });

                if (updated) {
                    const visibleAfter = DEFAULT_KEYS.filter((k) => !next[k].hidden);
                    const visibleCount = visibleAfter.length;
                    const autoCols = visibleCount > 0 ? Math.floor(12 / visibleCount) : 12;

                    visibleAfter.forEach((k) => {
                        if (!next[k].isManualOverride) {
                            next[k] = { ...next[k], colSpan: autoCols };
                        }
                    });
                }
                return updated ? next : prev;
            });
        }
    }, [visibilityMap]);

    const saveConfigs = (newConfigs: Record<string, StrategicOpsConfig>) => {
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

    const resetCardSize = (key: string) => {
        const visibleKeys = cardOrder.filter((k) => !configs[k].hidden);
        const visibleCount = visibleKeys.length;
        const autoCalculatedCols = visibleCount > 0 ? Math.floor(12 / visibleCount) : 4;

        const updated = {
            ...configs,
            [key]: {
                id: key,
                colSpan: autoCalculatedCols,
                rowSpan: DEFAULT_CONFIGS[key].defaultRows,
                isManualOverride: false,
                hidden: configs[key].hidden,
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

        if (!DEFAULT_KEYS.includes(sourceKey)) {
            toast.error("Cross-Section Drag Restricted", {
                description: "Strategic Operations Cards can only be reordered within the Strategic Operations section.",
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

    const visibleKeys = cardOrder.filter((k) => !configs[k]?.hidden);
    if (visibleKeys.length === 0) return null;

    const renderCardInner = (key: string, cfg: StrategicOpsConfig) => {
        const calculatedHeight = 540 + (cfg.rowSpan - 1) * 140;
        const containerStyle: React.CSSProperties = {
            height: `${calculatedHeight}px`,
        };

        switch (key) {
            case "admin_services":
                return (
                    <div style={containerStyle} className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col justify-between relative h-full">
                        {/* ⚙️ Grid Settings Icon & Grip Handle Inside Header */}
                        <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />
                            <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="Drag to reorder card">
                                <GripVertical className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col justify-between h-full">
                            <div className="flex items-center gap-2 mb-4 pr-20">
                                <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white truncate">
                                    Administrative Services
                                </h3>
                            </div>
                            <div className="overflow-hidden divide-y divide-slate-100 dark:divide-[#2a3040] flex-1 flex flex-col justify-between">
                                {[
                                    { title: "Kainan Hub", desc: "Manage local dining & culinary spots.", icon: Utensils, color: "orange", action: "View", path: "/admin/dining" },
                                    { title: "Tuluyan Hub", desc: "Lodging & accommodation records.", icon: Hotel, color: "blue", action: "View", path: "/admin/accommodation" },
                                    { title: "Tourism Gallery", desc: "Showcase spots & gallery highlights.", icon: Image, color: "emerald", action: "View", path: "/admin/tourism" },
                                    { title: "Incident Reports", desc: "Monitor & review public incident files.", icon: Flag, color: "rose", action: "View", path: "/admin/reports" },
                                    { title: "Emergency Hotlines", desc: "Update critical emergency list.", icon: Phone, color: "purple", action: "View", path: "/admin/hotlines" }
                                ].map((item, idx) => (
                                    <Link
                                        key={idx}
                                        href={item.path}
                                        className="py-3 flex-1 flex items-center justify-between transition-colors hover:bg-slate-50/50 dark:hover:bg-white/5 cursor-pointer rounded-2xl group"
                                    >
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-2xl bg-${item.color === 'orange' ? 'amber' : item.color === 'rose' ? 'red' : item.color}-50 dark:bg-${item.color === 'orange' ? 'amber' : item.color === 'rose' ? 'red' : item.color}-500/10 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                                                <item.icon className={`w-5 h-5 text-${item.color === 'orange' ? 'amber' : item.color === 'rose' ? 'red' : item.color}-600`} />
                                            </div>
                                            <div className="min-w-0 space-y-0.5">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight uppercase italic truncate">{item.title}</h4>
                                                <p className="text-slate-500 dark:text-slate-400 text-[11px] font-medium italic truncate">{item.desc}</p>
                                            </div>
                                        </div>
                                        <span
                                            className="text-center whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-black uppercase italic transition-all shadow-md hover:shadow-lg active:scale-95 text-white shrink-0 ml-2"
                                            style={{ backgroundColor: themeColor }}
                                        >
                                            {item.action}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                );

            case "resident_activity":
                return (
                    <div style={containerStyle} className="relative h-full flex flex-col">
                        <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />
                            <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="Drag to reorder card">
                                <GripVertical className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="h-full flex-1 flex flex-col">
                            <ActivityLogsCard logs={activityLogs} selectedBarangay={selectedBarangay} maxItems={5} />
                        </div>
                    </div>
                );

            case "staff_audit":
                return (
                    <div style={containerStyle} className="relative h-full flex flex-col">
                        <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />
                            <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-indigo-500 transition-colors" title="Drag to reorder card">
                                <GripVertical className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="h-full flex-1 flex flex-col">
                            <StaffActivityLogsCard initialLogs={staffLogs} maxItems={5} />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-12 gap-6 items-stretch transition-all duration-500 ease-in-out">
            {cardOrder.map((key) => {
                const cfg = configs[key] || { id: key, colSpan: 4, rowSpan: 1, hidden: false };
                if (cfg.hidden) return null;

                const currentClass = colSpanClasses[cfg.colSpan] || "col-span-12 lg:col-span-4";
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
                        className={`group relative transition-all duration-500 ease-in-out ${currentClass} ${
                            isBeingDragged ? "opacity-40 scale-[0.98]" : ""
                        } ${isOver ? "ring-2 ring-indigo-500/50 rounded-[2.5rem] scale-[1.01]" : ""}`}
                    >
                        {renderCardInner(key, cfg)}
                    </div>
                );
            })}
        </div>
    );
}
