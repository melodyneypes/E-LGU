"use client";

import { useDisaster } from "../providers/DisasterProvider";
import { useHousehold } from "../../households/providers/HouseholdProvider";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { addDisasterZone, updateDisasterZone, deleteDisasterZone } from "../../actions";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Plus, Trash2, AlertCircle, Users, Palette, ShieldAlert, Maximize2 } from "lucide-react";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useState, useEffect } from "react";
import { toast } from "sonner";

// Point-in-polygon algorithm (Ray casting)
function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > lng) !== (yj > lng))
            && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export function DisasterSidebar() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { zones, activeZoneId, setActiveZoneId, addZone, updateZone, removeZone } = useDisaster();
    const { households } = useHousehold();
    const [isAdding, setIsAdding] = useState(false);

    const activeZone = zones.find(z => z.id === activeZoneId);

    const affectedHouseholds = activeZone
        ? households.filter(h => {
            const { latitude, longitude } = h;
            if (latitude === null || longitude === null) return false;
            return activeZone.shapes.some(shape => isPointInPolygon(latitude, longitude, shape));
        })
        : [];

    const handleAddNewZone = async () => {
        setIsAdding(true);
        // Default polygon (Square) near Mapandan center
        const defaultZone = {
            type: "New Disaster Layer",
            typeColor: "#3b82f6", // Blue
            riskLevel: "Moderate",
            riskColor: "#f59e0b", // Orange
            shapes: [[
                [16.12, 119.78],
                [16.12, 119.81],
                [16.10, 119.81],
                [16.10, 119.78]
            ]] as [number, number][][]
        };

        const result = await addDisasterZone(defaultZone);
        if (result.success && result.zone) {

            addZone(result.zone as any);
            setActiveZoneId(result.zone.id);
            toast.success("New Risk Zone Added!");
        } else {
            toast.error("Failed to add zone.");
        }
        setIsAdding(false);
    };


    const handleUpdateZone = async (id: string, updates: any) => {
        if (!activeZone) return;
        const updatedData = { ...activeZone, ...updates };
        updateZone(id, updates);

        const result = await updateDisasterZone(id, {
            type: updatedData.type,
            typeColor: updatedData.typeColor,
            riskLevel: updatedData.riskLevel,
            riskColor: updatedData.riskColor,
            shapes: updatedData.shapes
        });

        if (!result.success) {
            toast.error("Failed to sync property updates.");
        }
    };

    const riskLevels = ["Low", "Moderate", "High", "Critical"];
    const riskColors = {
        Low: "#10b981", // Emerald
        Moderate: "#f59e0b", // Orange
        High: "#ef4444", // Red
        Critical: "#7c3aed", // Purple
    };

    return (
        <div className="w-[400px] h-full flex flex-col gap-6">
            {/* Action Bar */}
            <button
                onClick={handleAddNewZone}
                disabled={isAdding}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl shadow-lg shadow-blue-200 transition-all font-bold disabled:opacity-50"
            >
                {isAdding ? <Plus className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                Add New Disaster Zone
            </button>

            {/* Selected Zone Controls */}
            {activeZone ? (
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto p-2">
                    <div className="bg-white dark:bg-[#1a1f2e] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <AlertCircle className="w-6 h-6 text-blue-500" />
                                Zone Settings
                            </h2>
                            <button
                                onClick={() => setActiveZoneId(null)}
                                className="text-slate-400 hover:text-slate-600 font-medium text-sm"
                            >
                                Deselect
                            </button>
                        </div>

                        {/* Type Input */}
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Disaster Type</label>
                                <input
                                    type="text"
                                    value={activeZone.type}
                                    onChange={(e) => handleUpdateZone(activeZone.id, { type: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    placeholder="e.g. Flooding, Landslide"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Type Color</label>
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#151b2b] p-2 rounded-2xl border border-slate-200 dark:border-[#2a3040]">
                                        <input
                                            type="color"
                                            value={activeZone.typeColor}
                                            onChange={(e) => handleUpdateZone(activeZone.id, { typeColor: e.target.value })}
                                            className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                                        />
                                        <span className="text-sm font-mono text-slate-500 uppercase">{activeZone.typeColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block tracking-wider">Severity</label>
                                    <select
                                        value={activeZone.riskLevel}
                                        onChange={(e) => {
                                            const level = e.target.value;
                                            handleUpdateZone(activeZone.id, {
                                                riskLevel: level,

                                                riskColor: (riskColors as any)[level]
                                            });
                                        }}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                                    >
                                        {riskLevels.map(level => (
                                            <option key={level} value={level}>{level}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Risk Stats Card */}
                        <div className="bg-slate-50 dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl p-4 space-y-4">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Impact Data</p>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white leading-none">{affectedHouseholds.length}</p>
                                        <p className="text-xs text-slate-500 font-medium uppercase">Households Affected</p>
                                    </div>
                                </div>
                                <ShieldAlert style={{ color: activeZone.riskColor }} className="w-8 h-8 opacity-40" />
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 dark:border-[#2a3040] rounded-3xl">
                    <Maximize2 className="w-12 h-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-500 mb-2">No Zone Selected</h3>
                    <p className="text-sm text-slate-400 max-w-[200px]">
                        Click on an existing zone on the map or add a new one to begin editing.
                    </p>
                </div>
            )}
        </div>
    );
}
