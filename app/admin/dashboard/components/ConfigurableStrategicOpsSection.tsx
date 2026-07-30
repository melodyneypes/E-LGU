"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Utensils, Hotel, Image, Flag, Phone } from "lucide-react";
import { MetricCardGridPicker } from "./MetricCardGridPicker";
import { ActivityLogsCard } from "./ActivityLogsCard";
import { StaffActivityLogsCard } from "./StaffActivityLogsCard";

export interface StrategicOpsConfig {
    id: string;
    colSpan: number; // 1 to 12
    rowSpan: number; // 1 to 6
}

interface ConfigurableStrategicOpsSectionProps {
    themeColor: string;
    activityLogs: any[];
    staffLogs: any[];
    selectedBarangay?: string;
}

const DEFAULT_CONFIGS: Record<string, { defaultCols: number; defaultRows: number }> = {
    admin_services: { defaultCols: 4, defaultRows: 1 },
    resident_activity: { defaultCols: 4, defaultRows: 1 },
    staff_audit: { defaultCols: 4, defaultRows: 1 },
};

const STORAGE_KEY = "emapandan_strategic_ops_grid_v1";

export function ConfigurableStrategicOpsSection({
    themeColor,
    activityLogs,
    staffLogs,
    selectedBarangay,
}: ConfigurableStrategicOpsSectionProps) {
    const cardKeys = Object.keys(DEFAULT_CONFIGS);

    const [configs, setConfigs] = useState<Record<string, StrategicOpsConfig>>(() => {
        const initial: Record<string, StrategicOpsConfig> = {};
        cardKeys.forEach((key) => {
            initial[key] = {
                id: key,
                colSpan: DEFAULT_CONFIGS[key].defaultCols,
                rowSpan: DEFAULT_CONFIGS[key].defaultRows,
            };
        });
        return initial;
    });

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
        } catch {
            /* Fallback */
        }
    }, []);

    const saveConfigs = (newConfigs: Record<string, StrategicOpsConfig>) => {
        setConfigs(newConfigs);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfigs));
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
        setConfigs({ ...updated });
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch {
            /* Fail gracefully */
        }
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

    const renderCardInner = (key: string, cfg: StrategicOpsConfig) => {
        // Compute exact card height for Row 1 = 540px, Row 2 = 680px, Row 3 = 820px, etc.
        const calculatedHeight = 540 + (cfg.rowSpan - 1) * 140;
        const containerStyle: React.CSSProperties = {
            height: `${calculatedHeight}px`,
        };

        switch (key) {
            case "admin_services":
                return (
                    <div style={containerStyle} className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl flex flex-col justify-between relative h-full">
                        {/* ⚙️ Grid Settings Icon Inside Card Header */}
                        <div className="absolute top-6 right-6 z-20 opacity-60 hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />
                        </div>

                        <div className="flex-1 flex flex-col justify-between h-full">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white mb-4 pr-12">
                                Administrative Services
                            </h3>
                            <div className="overflow-hidden divide-y divide-slate-100 dark:divide-[#2a3040] flex-1 flex flex-col justify-between">
                                {[
                                    { title: "Kainan Hub", desc: "Manage local dining & culinary spots.", icon: Utensils, color: "orange", action: "Manage", path: "/admin/dining" },
                                    { title: "Tuluyan Hub", desc: "Lodging & accommodation records.", icon: Hotel, color: "blue", action: "Manage", path: "/admin/accommodation" },
                                    { title: "Tourism Gallery", desc: "Showcase spots & gallery highlights.", icon: Image, color: "emerald", action: "Manage", path: "/admin/tourism" },
                                    { title: "Incident Reports", desc: "Monitor & review public incident files.", icon: Flag, color: "rose", action: "Review", path: "/admin/reports" },
                                    { title: "Emergency Hotlines", desc: "Update critical emergency list.", icon: Phone, color: "purple", action: "Manage", path: "/admin/hotlines" }
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
                        {/* ⚙️ Grid Settings Icon Inside Card Header */}
                        <div className="absolute top-6 right-6 z-20 opacity-60 hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />
                        </div>
                        <div className="h-full flex-1 flex flex-col">
                            <ActivityLogsCard logs={activityLogs} selectedBarangay={selectedBarangay} maxItems={5} />
                        </div>
                    </div>
                );

            case "staff_audit":
                return (
                    <div style={containerStyle} className="relative h-full flex flex-col">
                        {/* ⚙️ Grid Settings Icon Inside Card Header */}
                        <div className="absolute top-6 right-6 z-20 opacity-60 hover:opacity-100 transition-opacity">
                            <MetricCardGridPicker
                                currentCols={cfg.colSpan}
                                currentRowSpan={cfg.rowSpan}
                                onSelectSize={(cols, rows) => updateCardSize(key, cols, rows)}
                                onReset={() => resetCardSize(key)}
                            />
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
            {cardKeys.map((key) => {
                const cfg = configs[key] || { id: key, colSpan: 4, rowSpan: 1 };
                const currentClass = colSpanClasses[cfg.colSpan] || "col-span-12 lg:col-span-4";

                return (
                    <div
                        key={key}
                        className={`group relative transition-all duration-500 ease-in-out ${currentClass}`}
                    >
                        {/* Render Section Card Content */}
                        {renderCardInner(key, cfg)}
                    </div>
                );
            })}
        </div>
    );
}
