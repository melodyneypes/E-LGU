"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Siren, Flame, HeartPulse, AlertCircle, Info, Copy, Smartphone, Phone, MapPin, CloudLightning } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import MapandanMapWrapper from "@/components/maps/MapandanMapWrapper";

import { ReportForm } from "./ReportForm";

interface InitialHotline {
    id: string;
    name: string;
    category: string;
    mobileNumber: string | null;
    telephone: string | null;
    address: string | null;
}

export function EmergencyReport({ initialHotlines = [], showMap = true, isMaintenanceActive = false }: { initialHotlines?: InitialHotline[], showMap?: boolean, isMaintenanceActive?: boolean }) {
    const [copied, setCopied] = React.useState<string | null>(null);
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const getIcon = (category: string) => {
        const cat = category?.toLowerCase() || "";
        if (cat.includes("police") || cat.includes("pnp")) return Siren;
        if (cat.includes("fire") || cat.includes("bfp")) return Flame;
        if (cat.includes("health") || cat.includes("hospital") || cat.includes("rhu")) return HeartPulse;
        if (cat.includes("mdrrmo") || cat.includes("disaster")) return AlertCircle;
        return Info;
    };

    const copyToClipboard = (number: string, name: string) => {
        if (!number) return;
        navigator.clipboard.writeText(number);
        setCopied(number);
        toast.success(`Copied ${name}'s number: ${number}`);
        setTimeout(() => setCopied(null), 2000);
    };

    return (
        <section id="hotlines" className="pt-8 md:pt-12 pb-12 md:pb-24 px-6 bg-slate-950 text-white relative">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-red-600/5 blur-[100px] rounded-full" />
            </div>

            {/* Disaster Monitoring (Side by Side Maps) */}
            {showMap && (
                <div className="max-w-7xl mx-auto mb-16 md:mb-24 relative z-10">
                    <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-slate-950/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-12">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <CloudLightning className="w-8 h-8 text-blue-500 animate-pulse" />
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Map Monitoring</h2>
                            </div>
                            <p className="text-slate-400 font-medium italic max-w-lg">
                            Real-time visualization of regional weather patterns.
                        </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Mapandan Border Map (Left Side) */}
                        {isMobile ? (
                            <div className="rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden h-[350px] md:h-[500px] relative bg-[#050505]">
                                <MapandanMapWrapper />
                            </div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, x: -24 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden h-[350px] md:h-[500px] relative bg-[#050505]"
                            >
                                <MapandanMapWrapper />
                            </motion.div>
                        )}

                        {/* Live Weather / Typhoon Map */}
                        {isMobile ? (
                            <div className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden h-[350px] md:h-[500px] relative">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=12.8797&lon=121.7740" 
                                    frameBorder="0"
                                    title="Live Weather Map"
                                    loading="lazy"
                                    className="absolute inset-0"
                                />
                            </div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, x: 24 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                className="bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden h-[350px] md:h-[500px] relative"
                            >
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=°C&metricWind=km/h&zoom=5&overlay=wind&product=ecmwf&level=surface&lat=12.8797&lon=121.7740" 
                                    frameBorder="0"
                                    title="Live Weather Map"
                                    loading="lazy"
                                    className="absolute inset-0"
                                />
                            </motion.div>
                        )}
                    </div>
                </div>
            )}

            {/* Emergency Hotlines Container */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 relative z-10">
                <div className="space-y-12">
                    <div className="space-y-4 sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-slate-950/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-0">
                        <div className="flex items-center gap-3">
                            <Siren className="w-6 h-6 md:w-8 md:h-8 text-red-500 animate-pulse" />
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-white">Emergency Hotlines</h2>
                        </div>
                        <p className="text-slate-400 font-medium italic max-w-lg text-xs md:text-base">
                            In case of emergency, please contact the appropriate department immediately. 
                            Lines are open 24/7. Click to copy the number.
                        </p>
                    </div>

                    <div className="overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TooltipProvider>
                                {initialHotlines.length > 0 ? initialHotlines.map((hotline, idx) => {
                                    const Icon = getIcon(hotline.category);
                                    const primaryNumber = hotline.mobileNumber || hotline.telephone || "N/A";
                                    
                                    const hotlineCard = (
                                        <div
                                            onClick={() => copyToClipboard(primaryNumber, hotline.name)}
                                            className="p-4 md:p-6 bg-white/5 border border-white/10 rounded-2xl md:rounded-[2rem] flex items-center gap-3 md:gap-4 hover:bg-white/10 transition-all group cursor-pointer relative"
                                        >
                                            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-primary transition-colors">
                                                <Icon className="w-5 h-5 md:w-6 md:h-6 text-slate-300 group-hover:text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors truncate">{hotline.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-base md:text-lg font-black tracking-tighter text-white">{primaryNumber}</p>
                                                    {copied === primaryNumber && (
                                                        <span className="text-[9px] md:text-[10px] font-bold text-emerald-500 italic animate-in fade-in zoom-in">Copied!</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="hidden md:flex w-8 h-8 rounded-full bg-white/5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <Tooltip key={hotline.id}>
                                            <TooltipTrigger asChild>
                                                {isMobile ? (
                                                    hotlineCard
                                                ) : (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        whileInView={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                    >
                                                        {hotlineCard}
                                                    </motion.div>
                                                )}
                                            </TooltipTrigger>
                                            <TooltipContent className="bg-slate-900 border-white/10 p-4 rounded-2xl max-w-xs shadow-2xl">
                                                <div className="space-y-3">
                                                    <p className="text-xs font-black uppercase tracking-widest text-primary italic border-b border-white/10 pb-2">{hotline.name}</p>
                                                    
                                                    {hotline.mobileNumber && (
                                                        <div className="flex items-center gap-2">
                                                            <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                                                            <span className="text-[11px] font-bold text-slate-300">Mobile: {hotline.mobileNumber}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {hotline.telephone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="text-[11px] font-bold text-slate-300">Tele: {hotline.telephone}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {hotline.address && (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                            <span className="text-[11px] font-medium italic text-slate-400 leading-snug">{hotline.address}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="pt-1">
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Click any card to copy the primary number</p>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }) : (
                                    <div className="col-span-full py-12 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                                        <Info className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">No active hotlines listed...</p>
                                    </div>
                                )}
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="hidden md:flex p-8 bg-primary/10 border border-primary/20 rounded-[2.5rem] items-start gap-4">
                        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
                        <p className="text-sm font-medium italic text-primary/80">
                            Non-emergency reports can be submitted using the form on the right. 
                            For life-threatening situations, always call the hotlines first.
                        </p>
                    </div>
                </div>

                {/* Report Form Component */}
                {isMobile ? (
                    <div className="relative">
                        <ReportForm isMaintenanceActive={isMaintenanceActive} />
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative"
                    >
                        <ReportForm isMaintenanceActive={isMaintenanceActive} />
                    </motion.div>
                )}
            </div>
        </section>
    );
}
