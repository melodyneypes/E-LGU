"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Landmark, ShieldCheck, Database, Activity } from "lucide-react";

interface LoadingProps {
    logoUrl?: string;
    brand1?: string;
    brand2?: string;
    themeColor?: string;
}

export default function LoadingClientBody({ logoUrl, brand1, brand2, themeColor }: LoadingProps) {
    const [phase, setPhase] = useState(0);
    const phrases = [
        `Accessing ${brand1 || "Mapandan"} Gateway...`,
        "Ready to Connect."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setPhase((p) => {
                if (p < phrases.length - 1) return p + 1;
                return p;
            });
        }, 300);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            className="fixed inset-0 bg-white dark:bg-[#020618] flex flex-col items-center justify-center z-[9999] overflow-hidden antialiased"
            style={{ "--primary-theme": themeColor } as React.CSSProperties}
        >
            <div className="absolute inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--primary-theme)_0%,transparent_70%)] opacity-10 animate-pulse-glow" />
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[140px] rounded-full animate-pulse-glow" style={{ animationDuration: '1s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[140px] rounded-full animate-pulse-glow" style={{ animationDelay: '.5s', animationDuration: '1s' }} />
            </div>

            <div className="relative flex flex-col items-center gap-20 z-10 w-full max-w-xl px-12">
                {/* Elite Icon/Logo Section */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    className="relative"
                >
                    <div className="w-32 h-32 md:w-40 md:h-40 bg-white dark:bg-slate-900 rounded-[3rem] flex items-center justify-center border border-slate-200 dark:border-white/10 shadow-3xl relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 transition-opacity" />

                        {logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={logoUrl}
                                alt="Official Logo"
                                className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10 animate-pulse"
                            />
                        ) : (
                            <Landmark className="w-16 h-16 text-primary relative z-10 animate-pulse" />
                        )}

                        {/* Shimmer on Logo */}
                        <div className="absolute top-0 left-[-100%] h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] animate-shimmer" style={{ animationDuration: '1s' }} />
                    </div>
                </motion.div>

                {/* Staggered Branding Line */}
                <div className="flex flex-col items-center gap-8">
                    <div className="flex items-center gap-0 overflow-hidden px-4 py-2">
                        {/* First Word Staggered */}
                        {(brand1 || "MAPANDAN").split("").map((char: string, i: number) => (
                            <motion.span
                                key={`b1-${i}`}
                                initial={{ y: 60, opacity: 0, rotateX: 90 }}
                                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                                transition={{
                                    delay: 0.3 + (i * 0.08),
                                    type: "spring",
                                    stiffness: 70,
                                    damping: 10
                                }}
                                className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white drop-shadow-sm"
                            >
                                {char}
                            </motion.span>
                        ))}



                        {/* Second Word Staggered */}
                        {(brand2 || "PORTAL").split("").map((char: string, i: number) => (
                            <motion.span
                                key={`b2-${i}`}
                                initial={{ y: 60, opacity: 0, rotateX: 90 }}
                                animate={{ y: 0, opacity: 1, rotateX: 0 }}
                                transition={{
                                    delay: 0.5 + (i * 0.05), // Delay to start after first word
                                    type: "spring",
                                    stiffness: 70,
                                    damping: 10
                                }}
                                style={{ color: themeColor }}
                                className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter drop-shadow-sm"
                            >
                                {char}
                            </motion.span>
                        ))}
                    </div>

                    {/* Elite Status & Progress */}
                    <div className="flex flex-col items-center gap-10 w-full">
                        <div className="flex flex-col items-center gap-3">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={phase}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.1 }}
                                    className="flex items-center gap-2"
                                >
                                    {phase === 0 && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                    {phase === 1 && <Database className="w-4 h-4 text-blue-500 animate-bounce" />}
                                    {phase === 2 && <Landmark className="w-4 h-4 text-primary animate-pulse" />}
                                    {phase === 3 && <Activity className="w-4 h-4 text-white animate-spin" />}
                                    <p className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 italic">
                                        {phrases[phase]}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Super-long Pro Progress System */}
                        <div className="w-full h-[3px] bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden relative border border-slate-200 dark:border-white/5 shadow-inner">
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2, ease: "easeInOut" }}
                                style={{ background: `linear-gradient(to right, transparent, ${themeColor}, transparent)` }}
                                className="absolute top-0 left-0 h-full"
                            />
                            <div
                                className="absolute top-0 left-[-100%] h-full w-32 blur-md animate-shimmer"
                                style={{ animationDuration: '.5s', background: `linear-gradient(to right, transparent, ${themeColor}66, transparent)` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Premium Textures */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.06] bg-[url('/noise.svg')] bg-repeat" />
        </div>
    );
}

