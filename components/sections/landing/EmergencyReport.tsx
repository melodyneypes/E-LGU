"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
    Siren, 
    Flame, 
    HeartPulse, 
    AlertCircle, 
    Info, 
    Copy, 
    Smartphone, 
    Phone, 
    MapPin, 
    CloudLightning,
    Truck,
    PhoneCall,
    CheckCircle2,
    User,
    ExternalLink
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { SampleMapPreview } from "@/components/maps/SimulatedSituationMap";
import { copyToClipboard as safeCopyToClipboard, cn } from "@/lib/utils";
import { getAmbulanceSettings } from "@/app/user/services/rural-health-unit/actions";
import lguConfig from "@/config/lgu.config.json";

import { ReportForm } from "./ReportForm";

interface InitialHotline {
    id: string;
    name: string;
    category: string;
    mobileNumber: string | null;
    telephone: string | null;
    address: string | null;
}

interface InitialAmbulance {
    id?: string;
    unit: string;
    plateNumber: string;
    station: string;
    status: string;
    statusColor?: string;
}

interface InitialDispatchHotline {
    id?: string;
    name: string;
    number: string;
}

const defaultDispatchHotlines: InitialDispatchHotline[] = [
    { name: "Police Emergency Hotline", number: lguConfig.contact.hotlines.police },
    { name: "Fire Emergency Hotline", number: lguConfig.contact.hotlines.fire },
    { name: "Health Emergency Hotline", number: lguConfig.contact.hotlines.health },
    { name: "Disaster Response Hotline", number: lguConfig.contact.hotlines.disasterResponse }
];

export function EmergencyReport({ 
    initialHotlines = [], 
    initialFleet = [],
    initialDispatchHotlines = [],
    showMap = true, 
    isMaintenanceActive = false,
    themeColor = "var(--primary-theme, #0038a8)"
}: { 
    initialHotlines?: InitialHotline[];
    initialFleet?: InitialAmbulance[];
    initialDispatchHotlines?: InitialDispatchHotline[];
    showMap?: boolean;
    isMaintenanceActive?: boolean;
    themeColor?: string;
}) {
    const [copied, setCopied] = React.useState<string | null>(null);
    const [copiedDispatch, setCopiedDispatch] = React.useState<string | null>(null);
    const resolvedTheme = themeColor || "var(--primary-theme, #0038a8)";
    const [fleet, setFleet] = React.useState<InitialAmbulance[]>(
        initialFleet.filter(v => v.status !== "INACTIVE")
    );
    const [dispatchHotlines, setDispatchHotlines] = React.useState<InitialDispatchHotline[]>(
        (initialDispatchHotlines.length > 0 ? initialDispatchHotlines : defaultDispatchHotlines).filter(h => (h as any).status !== "INACTIVE")
    );
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync from database if initial props were empty
    React.useEffect(() => {
        if (initialFleet.length === 0 || initialDispatchHotlines.length === 0) {
            getAmbulanceSettings().then((res) => {
                if (res.success) {
                    if (res.fleet && res.fleet.length > 0) {
                        setFleet(res.fleet.filter((v: any) => v.status !== "INACTIVE"));
                    }
                    if (res.hotlines && res.hotlines.length > 0) {
                        setDispatchHotlines(res.hotlines.filter((h: any) => h.status !== "INACTIVE"));
                    }
                }
            }).catch(() => {});
        }
    }, [initialFleet.length, initialDispatchHotlines.length]);

    const getIcon = (category: string) => {
        const cat = category?.toLowerCase() || "";
        if (cat.includes("police") || cat.includes("pnp")) return Siren;
        if (cat.includes("fire") || cat.includes("bfp")) return Flame;
        if (cat.includes("health") || cat.includes("hospital") || cat.includes("rhu")) return HeartPulse;
        if (cat.includes("mdrrmo") || cat.includes("disaster")) return AlertCircle;
        return Info;
    };

    const copyToClipboard = async (number: string, name: string) => {
        if (!number) return;
        await safeCopyToClipboard(number);
        setCopied(number);
        toast.success(`Copied ${name}'s number: ${number}`);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleDispatchCall = async (number: string) => {
        if (!number) return;
        await safeCopyToClipboard(number);
        setCopiedDispatch(number);
        toast.success(`Connecting to hotline: ${number}`);
        setTimeout(() => setCopiedDispatch(null), 2000);
    };

    const activeCount = fleet.filter(f => f.status === "ACTIVE" || f.status === "STANDBY" || f.status === "ON DUTY" || f.status === "MAINTENANCE").length;
    const hasSampleHotlines = initialHotlines.some(
        hotline => hotline.mobileNumber === "123456789" || hotline.telephone === "123456789"
    );

    return (
        <section id="hotlines" className="pt-8 md:pt-12 pb-16 md:pb-28 px-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white relative border-t border-slate-200 dark:border-white/5">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[30%] h-[30%] bg-red-600/5 blur-[100px] rounded-full" />
                <div className="absolute top-1/2 right-1/4 w-[25%] h-[25%] bg-primary/5 blur-[100px] rounded-full" />
            </div>

            {/* Disaster Monitoring (Side by Side Maps) */}
            {showMap && (
                <div className="max-w-7xl mx-auto mb-16 md:mb-24 relative z-10">
                    <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-slate-50/95 dark:bg-slate-950/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-12">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <CloudLightning className="w-8 h-8 text-blue-500 animate-pulse" />
                                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">Map Monitoring</h2>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-lg">
                                Explore sample community locations and simulated response routes alongside the regional weather map.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Static illustrative sample map */}
                        <motion.div
                            initial={{ opacity: 0, x: -24 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <SampleMapPreview />
                        </motion.div>

                        {/* Live Weather / Typhoon Map */}
                        {isMobile ? (
                            <div className="bg-slate-100 dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden h-[350px] md:h-[500px] relative">
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
                                className="bg-slate-100 dark:bg-slate-900 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden h-[350px] md:h-[500px] relative"
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

            {/* Main Hotlines & Report Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 relative z-10 items-start">
                {/* Emergency Hotlines Section */}
                <div className="space-y-6 md:space-y-8">
                    <div>
                        <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-3 pt-3 -mx-6 px-6 md:mx-0 md:px-0 md:pt-0 bg-slate-50/95 dark:bg-slate-950/95 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-3 md:mb-2">
                            <div className="flex items-center gap-3">
                                <Siren className="w-6 h-6 md:w-8 md:h-8 text-red-500 animate-pulse" />
                                <h2 className="text-2xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">Emergency Hotlines</h2>
                            </div>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-lg text-xs md:text-base">
                            In case of emergency, please contact the appropriate department immediately. 
                            Lines are open 24/7. Click to copy the number.
                        </p>
                        {hasSampleHotlines && (
                            <div role="status" className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs font-bold leading-relaxed text-amber-700 dark:text-amber-300">
                                SAMPLE ONLY — These hotline numbers are placeholders, not verified emergency contacts. Replace them with official numbers before relying on them.
                            </div>
                        )}
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
                                            className="p-4 md:p-6 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl md:rounded-[2rem] flex items-center gap-3 md:gap-4 hover:bg-slate-100/50 dark:hover:bg-white/10 transition-all group cursor-pointer relative shadow-sm"
                                        >
                                            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-slate-100 dark:bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center group-hover:bg-primary transition-colors">
                                                <Icon className="w-5 h-5 md:w-6 md:h-6 text-slate-500 dark:text-slate-300 group-hover:text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors truncate">{hotline.name}</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="break-all text-base md:text-lg font-black tracking-tighter text-slate-900 dark:text-white">{primaryNumber}</p>
                                                    {copied === primaryNumber && (
                                                        <span className="text-[9px] md:text-[10px] font-bold text-cyan-400 italic animate-in fade-in zoom-in">Copied!</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="hidden md:flex w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
                                            <TooltipContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 p-4 rounded-2xl max-w-xs shadow-2xl">
                                                <div className="space-y-3">
                                                    <p className="text-xs font-black uppercase tracking-widest text-primary italic border-b border-slate-200 dark:border-white/10 pb-2">{hotline.name}</p>
                                                    
                                                    {hotline.mobileNumber && (
                                                        <div className="flex items-center gap-2">
                                                            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Mobile: {hotline.mobileNumber}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {hotline.telephone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-3.5 h-3.5 text-blue-500" />
                                                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Tele: {hotline.telephone}</span>
                                                        </div>
                                                    )}
                                                    
                                                    {hotline.address && (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-3.5 h-3.5 text-red-500" />
                                                            <span className="text-[11px] font-medium italic text-slate-500 dark:text-slate-400 leading-snug">{hotline.address}</span>
                                                        </div>
                                                    )}
                                                    
                                                    <div className="pt-1">
                                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">Click any card to copy the primary number</p>
                                                    </div>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                }) : (
                                    <div className="col-span-full py-12 text-center bg-slate-100/50 dark:bg-white/5 rounded-[2rem] border border-dashed border-slate-200 dark:border-white/10">
                                        <Info className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">No active hotlines listed...</p>
                                    </div>
                                )}
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="hidden md:flex p-8 bg-primary/10 border border-primary/20 rounded-[2.5rem] items-start gap-4">
                        <Info className="w-6 h-6 text-primary shrink-0 mt-1" />
                        <p className="text-sm font-medium italic text-primary/90">
                            Non-emergency reports can be submitted using the form on the right. 
                            For life-threatening situations, always call the hotlines first.
                        </p>
                    </div>
                </div>

                {/* Report Form Component */}
                {isMobile ? (
                    <div id="reports" className="relative scroll-mt-28">
                        <ReportForm isMaintenanceActive={isMaintenanceActive} />
                    </div>
                ) : (
                    <motion.div
                        id="reports"
                        initial={{ opacity: 0, x: 24 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative scroll-mt-28"
                    >
                        <ReportForm isMaintenanceActive={isMaintenanceActive} />
                    </motion.div>
                )}
            </div>

            {/* ======================================================== */}
            {/* AMBULANCE FLEET & DISPATCH STATUS SECTION (BELOW REPORTS) */}
            {/* ======================================================== */}
            <div id="ambulance" className="max-w-7xl mx-auto mt-16 md:mt-24 pt-12 md:pt-16 border-t border-slate-200 dark:border-white/10 relative z-10 scroll-mt-28">
                {/* Sticky Header Title on Mobile (Hoisted to container level so it sticks for the ENTIRE ambulance section) */}
                <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-3 pt-3 -mx-6 px-6 md:mx-0 md:px-0 md:pt-0 bg-slate-50/95 dark:bg-slate-950/95 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none space-y-1.5 text-left mb-4 md:mb-0">
                    <div 
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] md:text-[10px] font-black uppercase tracking-widest"
                        style={{
                            backgroundColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}1a` : `color-mix(in srgb, ${resolvedTheme} 10%, transparent)`,
                            borderColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}33` : `color-mix(in srgb, ${resolvedTheme} 20%, transparent)`,
                            color: resolvedTheme
                        }}
                    >
                        <Truck className="w-3.5 h-3.5" /> Municipal Emergency Fleet Status
                    </div>
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl sm:text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                            Ambulance Fleet & Dispatch
                        </h3>
                    </div>
                </div>

                <div className="bg-transparent md:bg-white md:dark:bg-slate-900 border-0 md:border md:border-slate-200 md:dark:border-white/10 rounded-none md:rounded-[2.5rem] p-0 md:p-8 lg:p-12 shadow-none md:shadow-xl md:dark:shadow-2xl relative overflow-visible md:overflow-hidden">
                    {/* Section Header Controls & Subtitle */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-6 md:mb-10 pb-5 md:pb-6 border-b border-slate-200/80 dark:border-white/10 relative z-10">
                        {/* Hidden on mobile, visible on desktop inside the card */}
                        <div className="hidden md:block space-y-3">
                            <div 
                                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest"
                                style={{
                                    backgroundColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}1a` : `color-mix(in srgb, ${resolvedTheme} 10%, transparent)`,
                                    borderColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}33` : `color-mix(in srgb, ${resolvedTheme} 20%, transparent)`,
                                    color: resolvedTheme
                                }}
                            >
                                <Truck className="w-3.5 h-3.5" /> Municipal Emergency Fleet Status
                            </div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
                                    Ambulance Fleet & Dispatch
                                </h3>
                            </div>
                            <p className="text-xs sm:text-sm font-medium italic text-slate-500 dark:text-slate-400 max-w-xl">
                                Real-time readiness monitoring for Municipal Rural Health Unit ambulances and rapid emergency response teams.
                            </p>
                        </div>

                        {/* Mobile description text */}
                        <p className="block md:hidden text-xs font-medium italic text-slate-500 dark:text-slate-400 max-w-xl">
                            Real-time readiness monitoring for Municipal Rural Health Unit ambulances and rapid emergency response teams.
                        </p>

                        {/* Summary Badges & Link */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
                            <span className="inline-flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(0,210,255,0.2)] px-3 py-1.5 rounded-xl">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(0,210,255,0.8)]" />
                                {activeCount} Active
                            </span>
                            <Link
                                href="/user/services/rural-health-unit"
                                className="inline-flex items-center gap-1.5 text-[9.5px] sm:text-[10px] font-black uppercase tracking-widest text-white border px-3.5 sm:px-4 py-1.5 rounded-xl transition-all active:scale-95 shadow-md shadow-black/10 hover:opacity-90"
                                style={{
                                    backgroundColor: resolvedTheme,
                                    borderColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}33` : `color-mix(in srgb, ${resolvedTheme} 20%, transparent)`
                                }}
                            >
                                <span>RHU Medical Hub</span>
                                <ExternalLink className="w-3 h-3" />
                            </Link>
                        </div>
                    </div>

                    {/* Active Fleet Grid */}
                    <div className="space-y-6 relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {fleet.map((vehicle, idx) => (
                                <div
                                    key={idx}
                                    className="p-5 rounded-2xl md:rounded-3xl bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 hover:bg-slate-100/80 dark:hover:bg-white/[0.04] transition-all flex flex-col justify-between space-y-4 group relative shadow-sm"
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = resolvedTheme.startsWith("#") ? `${resolvedTheme}4d` : `color-mix(in srgb, ${resolvedTheme} 30%, transparent)`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = "";
                                    }}
                                >
                                    <div className="space-y-3">
                                        {/* Unit Name & Plate */}
                                        <div className="flex items-start gap-3">
                                            <div 
                                                className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300"
                                                style={{
                                                    backgroundColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}1a` : `color-mix(in srgb, ${resolvedTheme} 10%, transparent)`,
                                                    borderColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}33` : `color-mix(in srgb, ${resolvedTheme} 20%, transparent)`,
                                                    color: resolvedTheme
                                                }}
                                            >
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                    {vehicle.unit}
                                                </h4>
                                                <div className="inline-flex mt-1.5 px-2.5 py-0.5 rounded-lg bg-slate-200/60 dark:bg-white/10 border border-slate-300/50 dark:border-white/5 font-mono text-[9.5px] font-black tracking-widest text-slate-700 dark:text-slate-200">
                                                    {vehicle.plateNumber || "NO PLATE"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Station */}
                                        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100/70 dark:bg-white/[0.01] p-2.5 rounded-xl border border-slate-200/60 dark:border-white/5">
                                            <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: resolvedTheme }} />
                                            <span className="truncate">{vehicle.station || "Main Station"}</span>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</span>
                                        <span className={cn(
                                            "text-[9px] font-black uppercase tracking-widest border px-3 py-1 rounded-full",
                                            vehicle.status === "INACTIVE"
                                                ? "text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20"
                                                : "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 font-bold"
                                        )}>
                                            {vehicle.status === "INACTIVE" ? "INACTIVE" : "ACTIVE"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Direct Emergency Dispatch Contact Directory */}
                        <div className="pt-6 border-t border-slate-200 dark:border-white/10 space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 italic flex items-center gap-2">
                                <PhoneCall className="w-3.5 h-3.5" style={{ color: resolvedTheme }} /> Direct Ambulance & Emergency Dispatch Lines (Click to Call)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {dispatchHotlines.map((hotline, idx) => {
                                    const isCopied = copiedDispatch === hotline.number;
                                    const cleanNumber = (hotline.number || "").replace(/[^0-9+]/g, "");
                                    const name = (hotline.name || "").toLowerCase();
                                    const Icon = isCopied
                                        ? CheckCircle2
                                        : name.includes("rhu") 
                                            ? PhoneCall 
                                            : name.includes("mdrrmo") 
                                                ? AlertCircle 
                                                : User;

                                    return (
                                        <a
                                            key={idx}
                                            href={`tel:${cleanNumber}`}
                                            onClick={() => handleDispatchCall(hotline.number)}
                                            className="p-4 bg-slate-50/90 dark:bg-white/[0.02] border border-slate-200 dark:border-white/10 rounded-2xl cursor-pointer flex items-center gap-3 transition-all duration-200 group active:scale-[0.98] no-underline shadow-sm hover:bg-slate-100/80 dark:hover:bg-white/[0.04]"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = resolvedTheme.startsWith("#") ? `${resolvedTheme}66` : `color-mix(in srgb, ${resolvedTheme} 40%, transparent)`;
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = "";
                                            }}
                                        >
                                            <div 
                                                className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200",
                                                    isCopied 
                                                        ? "bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-400/30"
                                                        : ""
                                                )}
                                                style={!isCopied ? {
                                                    backgroundColor: resolvedTheme.startsWith("#") ? `${resolvedTheme}1a` : `color-mix(in srgb, ${resolvedTheme} 10%, transparent)`,
                                                    color: resolvedTheme
                                                } : undefined}
                                            >
                                                <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase tracking-wider block truncate transition-colors text-slate-500 dark:text-slate-400"
                                                )}>
                                                    {hotline.name}
                                                </span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs sm:text-sm font-black tracking-tight text-slate-800 dark:text-slate-100">{hotline.number}</span>
                                                    {isCopied && (
                                                        <span className="text-[8px] font-bold text-cyan-400 italic animate-pulse">Dialing...</span>
                                                    )}
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
