"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Hammer, Shield, HardHat, Clock, ArrowRight } from "lucide-react";

interface MaintenanceClientProps {
    brandWord1: string;
    brandWord2: string;
    themeColor: string;
    logoUrl?: string;
    maintenanceUpdatedAt: string;
}

export function MaintenanceClient({ 
    brandWord1, 
    brandWord2, 
    themeColor, 
    logoUrl,
    maintenanceUpdatedAt
}: MaintenanceClientProps) {
    return (
        <main 
            className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white overflow-hidden relative font-sans"
            style={{ "--primary": themeColor } as React.CSSProperties}
        >
            {/* Animated Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full z-0 overflow-hidden">
                <div 
                    className="absolute top-1/4 left-1/4 w-[600px] h-[600px] blur-[150px] rounded-full animate-pulse opacity-20" 
                    style={{ backgroundColor: themeColor }}
                />
                <div 
                    className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] blur-[150px] rounded-full animate-pulse opacity-10 delay-1000" 
                    style={{ backgroundColor: themeColor }}
                />
            </div>

            <div className="relative z-10 max-w-3xl w-full text-center space-y-16">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center gap-8"
                >
                    <div 
                        className="w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-3xl relative overflow-hidden group"
                        style={{ backgroundColor: themeColor, boxShadow: `0 35px 60px -15px ${themeColor}66` }}
                    >
                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoUrl} alt="Logo" className="w-full h-full object-cover p-3 transition-transform group-hover:scale-110" />
                        ) : (
                            <Shield className="w-14 h-14 text-white" />
                        )}
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    
                    <div className="space-y-6">
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="inline-flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.4em] text-white border"
                            style={{ backgroundColor: `${themeColor}22`, borderColor: `${themeColor}44` }}
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: themeColor }}></span>
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: themeColor }}></span>
                            </span>
                            Maintenance In Progress
                        </motion.div>
                        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black uppercase italic tracking-tighter leading-[0.85] text-white">
                            {brandWord1}<span style={{ color: themeColor }}>{brandWord2}</span>
                        </h1>
                    </div>
                </motion.div>

                <p className="text-xl md:text-2xl text-slate-400 font-medium leading-relaxed italic max-w-2xl mx-auto px-4">
                    We&apos;re currently performing essential system upgrades to enhance your digital experience.
                    <br className="hidden md:block" />
                    Our services will be back shortly with a brand new look.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
                    {[
                        { icon: Hammer, label: "Upgrading", sub: "Logic Systems" },
                        { icon: HardHat, label: "Structural", sub: "UI/UX Enhancements" },
                        { icon: Clock, label: "Standby", sub: "Coming Back Soon" }
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl hover:bg-white/10 transition-colors"
                        >
                            <item.icon className="w-10 h-10 mb-6 mx-auto" style={{ color: themeColor }} />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-2">{item.label}</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.sub}</p>
                        </motion.div>
                    ))}
                </div>

                {/* Premium Interactive Action Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex items-center justify-center pt-12 max-w-md mx-auto relative z-20"
                >
                    <button
                        onClick={() => {
                            document.cookie = `bypass_maintenance=${maintenanceUpdatedAt}; path=/; max-age=1800`;
                            window.location.href = "/";
                        }}
                        className="w-full sm:w-auto px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all duration-300 border flex items-center justify-center gap-2 hover:scale-105 active:scale-[0.98]"
                        style={{
                            backgroundColor: themeColor,
                            borderColor: themeColor,
                            color: "#ffffff",
                            boxShadow: `0 10px 25px -5px ${themeColor}66`
                        }}
                    >
                        Go to Landing Page
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </motion.div>

                <div className="pt-20 text-[10px] font-black uppercase tracking-[0.6em] text-slate-600">
                    © {new Date().getFullYear()} {brandWord1}{brandWord2} • Digital Infrastructure
                </div>
            </div>
        </main>
    );
}
