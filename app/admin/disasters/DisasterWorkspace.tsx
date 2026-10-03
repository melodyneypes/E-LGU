"use client";
import { sanitizeLguText } from "@/lib/utils/lgu";


import { DisasterProvider } from "./providers/DisasterProvider";
import { HouseholdProvider, Household } from "../households/providers/HouseholdProvider";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DisasterMapView } from "./components/DisasterMapView";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DisasterSidebar } from "./components/DisasterSidebar";
import { SimpleDisasterView } from "./components/SimpleDisasterView";
import { Map as MapIcon, ShieldAlert, Layers } from "lucide-react";

import { useState } from "react";

export function DisasterWorkspace({ 
    initialHouseholds,
    initialMaps = [] 
}: { 
    initialHouseholds: Household[],
     
    initialMaps?: any[]
}) {
    const [selectedMap, setSelectedMap] = useState(initialMaps[0] || null);

    return (
        <HouseholdProvider initialHouseholds={initialHouseholds}>
            <DisasterProvider>
                <div className="flex flex-col h-[calc(100vh-100px)] p-6 gap-6">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 italic uppercase tracking-tight">
                                <ShieldAlert className="w-8 h-8 text-blue-600" />
                                Hazard Virtualizer
                            </h1>
                            <p className="text-slate-500 font-medium mt-1">
{ }
{ }
                                {/* eslint-disable-next-line react/no-unescaped-entities */}
                                Command center for {sanitizeLguText("{{LGU_NAME}}")}'s multi-hazard spatial analysis.
                            </p>
                        </div>

                        <div className="flex items-center gap-6 bg-white dark:bg-[#151b2b] p-3 rounded-3xl border border-slate-200 dark:border-white/5 shadow-xl">
                            <div className="flex flex-col items-end pr-4 border-r border-slate-100 dark:border-white/5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Scenario</p>
                                <p className="text-sm font-bold text-blue-600 truncate max-w-[200px]">
                                    {selectedMap?.title || "No Active Analysis"}
                                </p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {initialMaps.map((map) => (
                                    <button
                                        key={map.id}
                                        onClick={() => setSelectedMap(map)}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                                            selectedMap?.id === map.id
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20"
                                                : "bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-white/10"
                                        }`}
                                        title={map.title}
                                    >
                                        <Layers className="w-5 h-5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content Workspace */}
                    <div className="flex-1 flex flex-col gap-8 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                        {selectedMap ? (
                            <SimpleDisasterView 
                                title={selectedMap.title}
                                description={selectedMap.description || "No technical description available for this layer."}
                                imagePath={selectedMap.imagePath}
                                riskLevel={selectedMap.riskLevel}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] text-center p-12 bg-slate-50/50 dark:bg-white/5">
                                <MapIcon className="w-20 h-20 text-slate-200 dark:text-white/5 mb-6" />
                                <h3 className="text-2xl font-black text-slate-400 uppercase italic tracking-tighter">No Active Layers</h3>
                                <p className="text-slate-400 mt-2 font-medium">Please initialize a hazard analysis layer in the Admin Console to begin visualization.</p>
                            </div>
                        )}
                    </div>
                </div>
            </DisasterProvider>
        </HouseholdProvider>
    );
}
