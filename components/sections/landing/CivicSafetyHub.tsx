"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
    Compass, 
    ShieldAlert, 
    ArrowUpRight, 
    ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CivicSafetyHubProps {
    themeColor?: string;
}

export function CivicSafetyHub({ themeColor = "var(--primary-theme, #2563eb)" }: CivicSafetyHubProps) {
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const cards = [
        {
            id: "road-advisory",
            title: "Live Road & Traffic Advisory",
            agency: "MDRRMO Traffic Network",
            statusText: "Real-Time Monitoring",
            statusColor: "bg-amber-500",
            statusBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
            description: "Check active road closures, floodings, maintenance projects, and detour routes across Mapandan before travelling.",
            icon: Compass,
            iconBg: "bg-amber-500/10 text-amber-500",
            glowColor: "rgba(245, 158, 11, 0.15)",
            ctaText: "Check Road Advisory",
            href: "/road-advisory/mapandan",
            metaBadge: "Interactive Map & Closures",
        },
        {
            id: "poso-portal",
            title: "POSO Public Safety Portal",
            agency: "Public Order & Safety Office",
            statusText: "Online Inquiries & Verification",
            statusColor: "bg-blue-500",
            statusBadge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
            description: "Search or scan traffic violation citations, inspect official municipal traffic codes, and verify settlement statuses.",
            icon: ShieldAlert,
            iconBg: "bg-blue-500/10 text-blue-500",
            glowColor: "rgba(37, 99, 235, 0.15)",
            ctaText: "Access POSO Portal",
            href: "/poso/mapandan",
            metaBadge: "QR Ticket Scan & Settle",
        }
    ];

    return (
        <section id="civic-safety-hub" className="pt-6 md:pt-10 pb-4 md:pb-6 px-6 max-w-7xl mx-auto relative z-20">
            {/* Sticky Section Header on Mobile (Title & Badge stick, static in desktop view) */}
            <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-3 pt-3 -mx-6 px-6 md:mx-0 md:px-0 md:pt-0 bg-white/95 dark:bg-slate-950/95 md:bg-transparent md:dark:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-4 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.3em] text-slate-700 dark:text-slate-300">
                        Public Safety & Mobility Portals
                    </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Official Mapandan Citizen Services
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8">
                {cards.map((card, idx) => {
                    const CardIcon = card.icon;

                    const cardContent = (
                        <div className="group relative bg-white dark:bg-[#0f1117] rounded-3xl md:rounded-[2.5rem] p-6 md:p-8 border border-slate-200/80 dark:border-white/10 shadow-xl shadow-slate-200/50 dark:shadow-none hover:shadow-2xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
                            {/* Ambient Glow */}
                            <div 
                                className="absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity pointer-events-none"
                                style={{ backgroundColor: card.glowColor }}
                            />

                            <div className="relative z-10 space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-inner ${card.iconBg}`}>
                                            <CardIcon className="w-6 h-6 md:w-7 md:h-7" />
                                        </div>
                                        <div>
                                            <div className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                {card.agency}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className={`w-1.5 h-1.5 rounded-full ${card.statusColor} animate-pulse`} />
                                                <span className="text-[10px] md:text-[11px] font-bold text-slate-600 dark:text-slate-300 tracking-tight">
                                                    {card.statusText}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <span className={`px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest border ${card.statusBadge} hidden sm:inline-block`}>
                                        {card.metaBadge}
                                    </span>
                                </div>

                                <div className="space-y-2 pt-2">
                                    <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight group-hover:text-primary transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-5 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-end relative z-10">
                                <Button
                                    size="sm"
                                    className="rounded-full px-6 py-2.5 h-auto text-xs font-black uppercase tracking-wider gap-2 shadow-md group-hover:scale-105 transition-transform"
                                    style={{
                                        backgroundColor: themeColor,
                                        color: "#ffffff"
                                    }}
                                >
                                    {card.ctaText}
                                    <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                </Button>
                            </div>
                        </div>
                    );

                    return isMobile ? (
                        <Link key={card.id} href={card.href} className="block no-underline">
                            {cardContent}
                        </Link>
                    ) : (
                        <motion.div
                            key={card.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4, delay: idx * 0.1 }}
                            whileHover={{ y: -4 }}
                        >
                            <Link href={card.href} className="block h-full no-underline">
                                {cardContent}
                            </Link>
                        </motion.div>
                    );
                })}
            </div>
        </section>
    );
}
