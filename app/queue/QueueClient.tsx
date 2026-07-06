"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Volume2, 
    VolumeX, 
    Clock, 
    Activity, 
    Coins, 
    Building2, 
    Scroll, 
    Ruler,
    Play
} from "lucide-react";
import { getActiveQueueData, QueueDepartmentData } from "./actions";

interface QueueClientProps {
    themeColor: string;
    branding: {
        logo?: string | null;
        word1?: string;
        word2?: string;
    };
    initialQueueData: QueueDepartmentData[];
}

const DEPT_ICONS: Record<string, any> = {
    "Treasury": Coins,
    "BPLO": Building2,
    "Registrar": Scroll,
    "Engineering": Ruler
};

const DEPT_THEMES: Record<string, { bg: string; border: string; glow: string; text: string }> = {
    "Treasury": {
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20",
        glow: "shadow-emerald-500/10",
        text: "text-emerald-400"
    },
    "BPLO": {
        bg: "bg-blue-500/5",
        border: "border-blue-500/20",
        glow: "shadow-blue-500/10",
        text: "text-blue-400"
    },
    "Registrar": {
        bg: "bg-purple-500/5",
        border: "border-purple-500/20",
        glow: "shadow-purple-500/10",
        text: "text-purple-400"
    },
    "Engineering": {
        bg: "bg-amber-500/5",
        border: "border-amber-500/20",
        glow: "shadow-amber-500/10",
        text: "text-amber-400"
    }
};

export default function QueueClient({
    themeColor,
    branding,
    initialQueueData
}: QueueClientProps) {
    const [queueData, setQueueData] = useState<QueueDepartmentData[]>(initialQueueData);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Keep track of previously called queue numbers to prevent repeating announcements
    const prevCalledRef = useRef<Record<string, string>>({});

    // Update Clock
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Active Polling: fetch queue updates every 3 seconds
    useEffect(() => {
        const interval = setInterval(async () => {
            const freshData = await getActiveQueueData();
            if (freshData && freshData.length > 0) {
                setQueueData(freshData);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Text-to-Speech logic
    useEffect(() => {
        if (!isVoiceEnabled) return;

        queueData.forEach(dept => {
            const currentTicket = dept.nowServing?.queueNumber;
            const prevTicket = prevCalledRef.current[dept.department];

            if (currentTicket && currentTicket !== prevTicket) {
                // Update tracker immediately to avoid double calls
                prevCalledRef.current[dept.department] = currentTicket;

                // Speech Synthesis
                const counter = dept.nowServing?.counterName || `${dept.department} Counter`;
                const phrase = `Ticket number, ${currentTicket.split("").join(" ")}, please proceed to ${counter}.`;
                
                const utterance = new SpeechSynthesisUtterance(phrase);
                utterance.rate = 0.85; // slightly slower for clarity
                utterance.pitch = 1.0;
                
                // Add minor delays between queued voices if many change at once
                window.speechSynthesis.speak(utterance);
            }
        });
    }, [queueData, isVoiceEnabled]);

    const handleEnableVoice = () => {
        setIsVoiceEnabled(true);
        setHasInteracted(true);

        // Pre-warm audio engine for mobile browsers
        const utterance = new SpeechSynthesisUtterance("Voice announcements enabled");
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
    };

    return (
        <div className="min-h-screen bg-[#060813] text-white flex flex-col font-sans select-none overflow-hidden relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[150px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none" />

            {/* Top Navigation / Status Header */}
            <header className="px-8 py-5 border-b border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
                <div className="flex items-center gap-4">
                    {branding.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={branding.logo} 
                            alt="Logo" 
                            className="w-12 h-12 object-contain"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center font-black text-xl italic" style={{ color: themeColor }}>
                            {branding.word1?.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-wider italic flex items-center gap-2">
                            {branding.word1} <span style={{ color: themeColor }}>{branding.word2}</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Unified Queuing Display System</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Voice Announcement Activator */}
                    {!hasInteracted ? (
                        <button
                            onClick={handleEnableVoice}
                            className="flex items-center gap-2.5 px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-500/20 active:scale-95 animate-pulse"
                        >
                            <Play className="w-4 h-4 fill-white" /> Enable Voice Announcements
                        </button>
                    ) : (
                        <button
                            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                            className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                isVoiceEnabled 
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                                    : "bg-slate-800/40 border-white/5 text-slate-400"
                            }`}
                        >
                            {isVoiceEnabled ? (
                                <>
                                    <Volume2 className="w-4 h-4 text-emerald-400" />
                                    Voice Announcements Active
                                </>
                            ) : (
                                <>
                                    <VolumeX className="w-4 h-4 text-slate-500" />
                                    Voice Muted
                                </>
                            )}
                        </button>
                    )}

                    {/* Clock Display */}
                    {currentTime && (
                        <div className="flex items-center gap-3 border-l border-white/10 pl-6 text-right">
                            <Clock className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-bold text-slate-200 uppercase tracking-wide leading-none">
                                    {currentTime.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true })}
                                </p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                    {currentTime.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Main Queuing Board */}
            <main className="flex-1 p-8 grid grid-cols-1 md:grid-cols-4 gap-8 z-10 min-h-0">
                {queueData.map((dept) => {
                    const Icon = DEPT_ICONS[dept.department] || Coins;
                    const theme = DEPT_THEMES[dept.department] || DEPT_THEMES["Treasury"];
                    
                    return (
                        <div 
                            key={dept.department}
                            className={`flex flex-col h-full rounded-[2.5rem] border ${theme.border} ${theme.bg} backdrop-blur-sm shadow-xl p-8 relative transition-all duration-500 overflow-hidden`}
                        >
                            {/* Department Heading */}
                            <div className="flex items-center justify-between pb-6 border-b border-white/5">
                                <div className="space-y-1">
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${theme.text} italic`}>Department</span>
                                    <h2 className="text-xl font-black uppercase tracking-wide text-white italic">{dept.department}</h2>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${theme.text}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                            </div>

                            {/* Now Serving Ticket Panel */}
                            <div className="flex-1 flex flex-col items-center justify-center py-8">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic mb-4">Now Serving</span>
                                
                                <AnimatePresence mode="wait">
                                    {dept.nowServing ? (
                                        <motion.div 
                                            key={dept.nowServing.queueNumber}
                                            initial={{ scale: 0.9, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.95, opacity: 0 }}
                                            transition={{ duration: 0.4, ease: "easeOut" }}
                                            className="text-center w-full"
                                        >
                                            <h3 className={`text-4xl lg:text-5xl font-black tracking-tight font-mono ${theme.text} drop-shadow-[0_0_20px_rgba(var(--primary),0.3)] animate-pulse`}>
                                                {dept.nowServing.queueNumber}
                                            </h3>
                                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                                                <Activity className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                                    {dept.nowServing.counterName}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-3 line-clamp-1">
                                                {dept.nowServing.residentName}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.4 }}
                                            className="text-center space-y-2 py-6"
                                        >
                                            <p className="text-2xl font-black uppercase tracking-wider italic text-slate-500 font-mono">---</p>
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">No Ticket Called</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Up Next List */}
                            <div className="mt-auto pt-6 border-t border-white/5">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic block mb-4">Up Next in Line</span>
                                <div className="space-y-2.5">
                                    {dept.waiting.length > 0 ? (
                                        dept.waiting.slice(0, 3).map((num, idx) => (
                                            <div 
                                                key={num}
                                                className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all font-mono"
                                            >
                                                <span className="text-xs font-black text-slate-400">{idx + 1}</span>
                                                <span className="text-sm font-black tracking-wide text-slate-200">{num}</span>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">Queue Empty</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Bottom Announcements Ticker */}
            <footer className="h-14 border-t border-white/5 bg-slate-950/60 backdrop-blur-md flex items-center overflow-hidden z-10 shrink-0">
                <div className="px-6 h-full flex items-center justify-center bg-red-500/10 border-r border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest italic shrink-0">
                    📢 Advisory
                </div>
                <div className="flex-1 relative overflow-hidden h-full flex items-center">
                    <div className="animate-[marquee_25s_linear_infinite] whitespace-nowrap flex items-center gap-16 absolute text-[10px] md:text-xs font-black uppercase tracking-widest italic text-slate-400">
                        <span>• Please prepare your valid ID and documents before approaching the counter</span>
                        <span>• Senior Citizens, PWDs, and Pregnant women can claim Priority Lane service</span>
                        <span>• EMapandan Smart Governance Portal - Empowering residents with fast digital transactions</span>
                        <span>• Thank you for your patience and cooperation</span>
                    </div>
                </div>
            </footer>

            {/* Add Custom Animation Styles for the Ticker */}
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}} />
        </div>
    );
}
