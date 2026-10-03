"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
    Loader2,
    Maximize2,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Layers,
    Globe,
    X,
    Compass
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import lguConfig from "@/config/lgu.config.json";

// Dynamically import the real Leaflet/MapLibre component, turning off SSR
const LiveInteractiveMap = dynamic(() => import("./LguMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full min-h-[300px] md:min-h-[400px] flex flex-col items-center justify-center bg-slate-900 rounded-3xl animate-pulse text-slate-400">
            <Loader2 className="animate-spin mb-2 text-cyan-400" size={32} />
            <span className="font-bold text-xs tracking-widest uppercase">Loading Live Interactive Map...</span>
        </div>
    )
});

export default function LguMapWrapper() {
    const [viewMode, setViewMode] = useState<"gis" | "live">("gis");
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.35, 2.8));
    const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.35, 1));
    const handleResetZoom = () => setZoomLevel(1);

    return (
        <div className="w-full h-full rounded-[2rem] md:rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 relative z-0 bg-slate-950 flex flex-col">
            {/* Top Control HUD */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
                {/* Brand / Status Pill */}
                <div className="pointer-events-auto backdrop-blur-xl bg-slate-900/80 border border-white/15 px-3.5 py-1.5 rounded-2xl shadow-xl flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                    </span>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                            E-LGU Spatial Sentinel
                        </span>
                        <span className="text-[8px] font-bold text-cyan-300 uppercase tracking-widest -mt-0.5">
                            {viewMode === "gis" ? "Fictional LGU GIS Grid" : "Live Spatial View"}
                        </span>
                    </div>
                </div>

                {/* Mode Selector & Action Buttons */}
                <div className="pointer-events-auto flex items-center gap-2">
                    <div className="backdrop-blur-xl bg-slate-900/85 border border-white/15 p-1 rounded-2xl shadow-xl flex items-center gap-1">
                        <button
                            onClick={() => setViewMode("gis")}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                viewMode === "gis"
                                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            }`}
                            title="Fictional E-LGU GIS Hazard Map"
                        >
                            <Layers className="w-3 h-3" />
                            <span className="hidden sm:inline">GIS Map</span>
                        </button>
                        <button
                            onClick={() => setViewMode("live")}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                                viewMode === "live"
                                    ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25"
                                    : "text-slate-300 hover:text-white hover:bg-white/10"
                            }`}
                            title="Interactive Street/Satellite Map"
                        >
                            <Globe className="w-3 h-3" />
                            <span className="hidden sm:inline">Live OSM</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setIsFullscreen(true)}
                        className="backdrop-blur-xl bg-slate-900/80 border border-white/15 p-2 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10 transition-all shadow-xl"
                        title="Expand Fullscreen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Map Canvas / Viewer */}
            <div className="w-full h-full relative overflow-hidden flex-1 bg-slate-950">
                {viewMode === "gis" ? (
                    <div className="w-full h-full relative overflow-hidden flex items-center justify-center select-none">
                        <motion.div
                            className="w-full h-full relative flex items-center justify-center cursor-grab active:cursor-grabbing"
                            animate={{ scale: zoomLevel }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                        >
                            <Image
                                src={lguConfig.assets.contentPlaceholder}
                                alt="Municipality of E-LGU Integrated GIS Spatial & Hazard Map"
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                                className="object-cover object-center pointer-events-none"
                            />
                            {/* Subtle Ambient Vignette & Radar Scanline Effect */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-slate-950/40 pointer-events-none" />
                        </motion.div>

                        {/* Interactive Zoom Controls for GIS Map */}
                        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 backdrop-blur-xl bg-slate-900/85 border border-white/15 p-1 rounded-2xl shadow-2xl">
                            <button
                                onClick={handleZoomIn}
                                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <button
                                onClick={handleZoomOut}
                                className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            {zoomLevel > 1 && (
                                <button
                                    onClick={handleResetZoom}
                                    className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-white/10 rounded-xl transition-all border-t border-white/10"
                                    title="Reset Zoom"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Legend Chips on Bottom Left */}
                        <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2 pointer-events-none">
                            <div className="backdrop-blur-xl bg-slate-900/85 border border-white/15 px-3 py-1.5 rounded-2xl text-[9px] font-bold text-slate-300 shadow-xl flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                                <span>Agri / Residential</span>
                                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block ml-1"></span>
                                <span>Municipal Center</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full relative">
                        <LiveInteractiveMap />
                    </div>
                )}
            </div>

            {/* Fullscreen Inspection Modal */}
            <AnimatePresence>
                {isFullscreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-2xl flex flex-col p-4 sm:p-8"
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                                    <Compass className="w-6 h-6 animate-spin-slow" />
                                </div>
                                <div>
                                    <h3 className="text-lg sm:text-xl font-black uppercase italic tracking-wider text-white">
                                        Municipality of E-LGU • Integrated Spatial Map
                                    </h3>
                                    <p className="text-xs text-slate-400 font-medium">
                                        Fictional Municipal Jurisdiction & Hazard Zoning Overview
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-2xl p-1">
                                    <button
                                        onClick={handleZoomIn}
                                        className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleZoomOut}
                                        className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={handleResetZoom}
                                        className="p-2 text-cyan-400 hover:text-cyan-300 hover:bg-white/10 rounded-xl"
                                        title="Reset"
                                    >
                                        <RotateCcw className="w-5 h-5" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => setIsFullscreen(false)}
                                    className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-2xl transition-all"
                                    title="Close Preview"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 relative rounded-3xl overflow-hidden border border-white/10 bg-black flex items-center justify-center">
                            <motion.div
                                className="w-full h-full relative flex items-center justify-center cursor-grab active:cursor-grabbing"
                                animate={{ scale: zoomLevel }}
                                transition={{ type: "spring", stiffness: 260, damping: 24 }}
                            >
                                <Image
                                    src={lguConfig.assets.contentPlaceholder}
                                    alt="Full Municipality of E-LGU Spatial Map"
                                    fill
                                    priority
                                    className="object-contain"
                                />
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
