"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
    Layers, 
    ShieldAlert, 
    Wind, 
    Waves, 
    Compass,
    Activity,
    Map as MapIcon,
    AlertTriangle,
    Home
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Link from "next/link";
import { SimpleDisasterView } from "../../admin/disasters/components/SimpleDisasterView";
import { cn } from "@/lib/utils";

export function UserDisasterWorkspace({ 
    initialMaps = [] 
}: { 
     
    initialMaps?: any[]
}) {
    const [selectedMap, setSelectedMap] = useState(initialMaps[0] || null);

    return (
        <div className="space-y-10">
            {/* Breadcrumb Section */}
            <Breadcrumb>
                <BreadcrumbList className="bg-white/50 dark:bg-white/5 backdrop-blur-sm px-6 py-2.5 rounded-2xl border border-slate-100 dark:border-white/5 w-fit shadow-sm">
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-colors">
                                <Home className="w-3.5 h-3.5 mb-0.5" />
                                Home
                            </Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-blue-600 italic max-w-[200px] truncate">Hazard Sentinel</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                            <ShieldAlert className="w-6 h-6 text-white" />
                         </div>
                         <div>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Hazard Sentinel</h1>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time Safety Monitoring</p>
                         </div>
                    </div>
                    <p className="text-slate-500 font-medium italic max-w-xl">
{ }
{ }
                        Explore our interactive hazard maps to understand geological risks,
                        flood zones, and environmental safety data in your vicinity.
                    </p>
                </div>

                {/* Layer Selector */}
                <div className="bg-white dark:bg-[#0a0c10] p-4 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl flex items-center gap-6">
                    <div className="flex flex-col items-end pr-6 border-r border-slate-100 dark:border-white/5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Active Visual</span>
                        <span className="text-sm font-black text-blue-600 truncate max-w-[150px] italic">
                            {selectedMap?.title || "No Selection"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {initialMaps.map((map) => (
                            <button
                                key={map.id}
                                onClick={() => setSelectedMap(map)}
                                className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300",
                                    selectedMap?.id === map.id
                                        ? "bg-blue-600 text-white shadow-xl shadow-blue-500/30 ring-4 ring-blue-500/10"
                                        : "bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-600 hover:scale-110"
                                )}
                                title={map.title}
                            >
                                <Layers className="w-5 h-5" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Visualizer Area */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                {/* Left: Dynamic Visualizer */}
                <div className="lg:col-span-3 space-y-8">
                    {selectedMap ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6 }}
                        >
                            <SimpleDisasterView 
                                title={selectedMap.title}
                                description={selectedMap.description || "Official hazard assessment for the municipality."}
                                imagePath={selectedMap.imagePath}
                                riskLevel={selectedMap.riskLevel}
                            />
                        </motion.div>
                    ) : (
                        <div className="aspect-[16/10] md:aspect-[21/9] flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-white/5 rounded-[2.5rem] sm:rounded-[4rem] text-center p-8 sm:p-20 bg-white dark:bg-black/20">
                            <MapIcon className="w-12 h-12 sm:w-20 sm:h-20 text-slate-200 dark:text-white/5 mb-6" />
                            <h3 className="text-xl sm:text-2xl font-black text-slate-400 uppercase italic tracking-tighter">Initializing Sentinel...</h3>
                            <p className="text-xs sm:text-sm text-slate-400 mt-2 font-medium italic">Please select a monitoring layer to begin spatial analysis.</p>
                        </div>
                    )}

                    {/* Safety Tips Overlay */}
                    <div className="p-10 bg-blue-600 rounded-[3rem] text-white overflow-hidden relative group">
                        <div className="absolute top-0 right-0 w-1/3 h-full bg-white/10 skew-x-12 translate-x-20" />
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                <Activity className="w-8 h-8 text-white" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter">Preparedness Protocol</h3>
                                <p className="text-blue-100 font-medium italic opacity-80 leading-relaxed">
                                    Understanding these maps is the first step toward safety. Ensure your family has an evacuation 
                                    plan and a ready-kit based on the highest risk level detected in your area.
                                </p>
                            </div>
                            <Link href="/user/hotlines">
                                <Button className="h-14 px-8 bg-white text-blue-600 hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 shrink-0">
                                    Emergency Lines
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right: Technical Metadata & Status */}
                <div className="space-y-8">
                    <div className="p-8 bg-white dark:bg-[#0a0c10] rounded-[2.5rem] border border-slate-100 dark:border-white/5 space-y-8">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic tracking-tight flex items-center gap-3">
                            <Compass className="w-5 h-5 text-blue-600" />
                            Environmental Pulse
                        </h3>
                        
                        <div className="space-y-6">
                            {[
                                { label: "Sea Condition", value: "Normal", icon: Waves, color: "text-blue-500" },
                                { label: "Wind Velocity", value: "12 km/h", icon: Wind, color: "text-slate-400" },
                                { label: "Sismic Activity", value: "Level 1", icon: Activity, color: "text-green-500" },
                                { label: "Tidal Surge", value: "Low", icon: AlertTriangle, color: "text-blue-400" },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between group cursor-help">
                                    <div className="flex items-center gap-4">
                                        <item.icon className={cn("w-5 h-5", item.color)} />
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{item.label}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 bg-slate-950 rounded-[2.5rem] space-y-6 border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping" />
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Latest Advisory</h3>
                        </div>
                        <p className="text-sm text-slate-400 font-medium italic leading-relaxed">
                            No active warnings at this time. However, localized rain showers are expected in the eastern barangays 
                            within the next 24 hours. Stay tuned to the Sentinel.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
