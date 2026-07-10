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
    Play,
    Lock,
    ShieldAlert,
    Loader2
} from "lucide-react";
import { getActiveQueueData, QueueDepartmentData, verifyRfidUnlock } from "./actions";
import { supabase } from "@/lib/supabase";

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
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    
    // RFID Lock Screen States
    const [isLocked, setIsLocked] = useState(true);
    const [verifyingRfid, setVerifyingRfid] = useState(false);
    const [rfidError, setRfidError] = useState("");
    const [manualRfid, setManualRfid] = useState("");
    const [showManualInput, setShowManualInput] = useState(false);

    // Keep track of previously called queue numbers to prevent repeating announcements
    const prevCalledRef = useRef<Record<string, string>>({});

    const triggerRfidUnlock = React.useCallback(async (rfidCode: string) => {
        setVerifyingRfid(true);
        setRfidError("");
        try {
            const res = await verifyRfidUnlock(rfidCode);
            if (res.success) {
                setIsLocked(false);
                setIsVoiceEnabled(true);
                setHasInteracted(true);
            } else {
                setRfidError(res.error || "Access Denied: RFID not authorized");
            }
        } catch {
            setRfidError("Database verification failed");
        } finally {
            setVerifyingRfid(false);
        }
    }, []);

    // Listen to global USB RFID scanner keyboard emulation (types digits + Enter)
    useEffect(() => {
        if (!isLocked) return;

        let buffer = "";
        let timeout: NodeJS.Timeout;

        const handleKeyDown = async (e: KeyboardEvent) => {
            // Avoid capturing key events when typing manually in the input box
            if (document.activeElement?.tagName === "INPUT") {
                return;
            }

            if (e.key === "Control" || e.key === "Alt" || e.key === "Shift" || e.key === "Meta") {
                return;
            }

            if (e.key === "Enter") {
                if (buffer.length > 0) {
                    const scannedCode = buffer.trim();
                    buffer = "";
                    await triggerRfidUnlock(scannedCode);
                }
            } else {
                if (e.key.length === 1) {
                    buffer += e.key;
                    
                    // USB scanners send keys at lightning speeds (e.g. 10ms intervals)
                    // Reset buffer if character interval is slow (>150ms) to ignore normal typing
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        buffer = "";
                    }, 150);
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            clearTimeout(timeout);
        };
    }, [isLocked, triggerRfidUnlock]);



    // Load voices and listen for async changes (crucial for Chrome/Safari)
    useEffect(() => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            const loadVoices = () => {
                setVoices(window.speechSynthesis.getVoices());
            };
            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    // Update Clock
    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Real-time updates via Supabase WebSockets + Fallback Polling (10 seconds)
    useEffect(() => {
        const fetchUpdates = async () => {
            const freshData = await getActiveQueueData();
            if (freshData && freshData.length > 0) {
                setQueueData(freshData);
            }
        };

        // 1. WebSocket Realtime subscription to postgres changes on Transaction table
        let channel: any = null;
        if (supabase) {
            channel = supabase
                .channel("lobby-queue-realtime")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction"
                    },
                    async (payload: any) => {
                        console.log("Realtime Update: Transaction change detected", payload);
                        await fetchUpdates();
                    }
                )
                .subscribe((status: string) => {
                    console.log(`Realtime Channel status: ${status}`);
                });
        }

        // 2. Fallback polling (updates every 10 seconds to sync if connection drops)
        const fallbackInterval = setInterval(async () => {
            await fetchUpdates();
        }, 10000);

        return () => {
            if (supabase && channel) {
                supabase.removeChannel(channel);
            }
            clearInterval(fallbackInterval);
        };
    }, []);

    // Text-to-Speech logic
    useEffect(() => {
        if (!isVoiceEnabled) return;

        queueData.forEach(dept => {
            dept.nowServing.forEach(active => {
                const currentTicket = active.queueNumber;
                const lastUpdated = active.updatedAt || "";
                const trackerKey = `${dept.department}-${active.counterName}`;
                const prevCallKey = prevCalledRef.current[trackerKey];
                const currentCallKey = `${currentTicket}-${lastUpdated}`;

                if (currentTicket && currentCallKey !== prevCallKey) {
                    // Update tracker immediately to avoid double calls
                    prevCalledRef.current[trackerKey] = currentCallKey;

                    // Speech Synthesis
                    const counter = active.counterName;
                    const phrase = `Ticket number, ${currentTicket.split("").join(" ")}, please proceed to ${counter}.`;
                    
                    const utterance = new SpeechSynthesisUtterance(phrase);
                    utterance.rate = 0.85; // slightly slower for clarity
                    utterance.pitch = 1.05; // slightly higher pitch for natural female tone
                    
                    // Find a high-quality female English voice from our loaded state
                    const femaleVoice = voices.find(voice => {
                        const name = voice.name.toLowerCase();
                        const lang = voice.lang.toLowerCase();
                        const isEnglish = lang.startsWith("en");
                        
                        const isFemaleName = 
                            name.includes("zira") ||
                            name.includes("samantha") ||
                            name.includes("hazel") ||
                            name.includes("aria") ||
                            name.includes("susan") ||
                            name.includes("female") ||
                            name.includes("google us english") ||
                            name.includes("en-us-language") ||
                            name.includes("heera"); // Cortana/other standard female voices
                        
                        const isMaleName = 
                            name.includes("david") ||
                            name.includes("mark") ||
                            name.includes("george") ||
                            name.includes("ravi") ||
                            name.includes("male");

                        return isEnglish && isFemaleName && !isMaleName;
                    }) || voices.find(voice => {
                        // Fallback to any voice that is English and doesn't contain a male name
                        const name = voice.name.toLowerCase();
                        const lang = voice.lang.toLowerCase();
                        return lang.startsWith("en") && !(
                            name.includes("david") ||
                            name.includes("mark") ||
                            name.includes("george") ||
                            name.includes("male")
                        );
                    });

                    console.log("Speech Engine: Selected voice -", femaleVoice?.name || "System Default");

                    if (femaleVoice) {
                        utterance.voice = femaleVoice;
                    }
                    
                    // Add minor delays between queued voices if many change at once
                    window.speechSynthesis.speak(utterance);
                }
            });
        });
    }, [queueData, isVoiceEnabled, voices]);

    const handleEnableVoice = () => {
        setIsVoiceEnabled(true);
        setHasInteracted(true);

        // Pre-warm audio engine for mobile browsers
        const utterance = new SpeechSynthesisUtterance("Voice announcements enabled");
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
    };

    if (isLocked) {
        return (
            <div className="min-h-screen bg-[#060813] text-white flex flex-col items-center justify-center font-sans relative overflow-hidden select-none">
                {/* Ambient Background Glows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

                <div className="max-w-md w-full mx-4 p-8 rounded-[2.5rem] border border-white/10 bg-slate-950/40 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center space-y-8 relative z-10">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center" style={{ color: themeColor }}>
                        {verifyingRfid ? (
                            <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
                        ) : (
                            <Lock className="w-8 h-8" style={{ color: themeColor }} />
                        )}
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-xl font-black uppercase tracking-wider italic">
                            {branding.word1} <span style={{ color: themeColor }}>SECURE ACCESS</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                            Lobby TV Monitor Display
                        </p>
                    </div>

                    <div className="p-4 w-full rounded-2xl bg-white/5 border border-white/5 space-y-2">
                        {verifyingRfid ? (
                            <p className="text-xs font-black uppercase tracking-wider text-slate-400 animate-pulse">
                                Verifying RFID badge...
                            </p>
                        ) : (
                            <div className="space-y-1">
                                <p className="text-xs font-black uppercase tracking-wider text-emerald-400">
                                    🟢 Waiting for RFID Scan
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                                    Please tap your staff RFID badge on the reader to unlock the queue display.
                                </p>
                            </div>
                        )}
                    </div>

                    {rfidError && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 w-full text-left">
                            <ShieldAlert className="w-4.5 h-4.5 shrink-0 text-red-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider leading-normal">
                                {rfidError}
                            </span>
                        </div>
                    )}

                    <div className="pt-4 border-t border-white/5 w-full flex flex-col items-center">
                        {!showManualInput ? (
                            <button
                                onClick={() => setShowManualInput(true)}
                                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
                            >
                                ⌨️ Type RFID card ID manually
                            </button>
                        ) : (
                            <form 
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (manualRfid.trim()) {
                                        await triggerRfidUnlock(manualRfid.trim());
                                    }
                                }}
                                className="w-full space-y-3"
                            >
                                <input
                                    type="text"
                                    placeholder="Enter RFID Card ID"
                                    value={manualRfid}
                                    onChange={(e) => setManualRfid(e.target.value)}
                                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-center text-white focus:border-primary focus:outline-none placeholder-slate-600 focus:ring-1 focus:ring-white/20"
                                    disabled={verifyingRfid}
                                    autoFocus
                                />
                                <div className="flex gap-2 w-full">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowManualInput(false);
                                            setManualRfid("");
                                            setRfidError("");
                                        }}
                                        className="h-9 px-4 rounded-xl border border-white/5 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 transition-all flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={verifyingRfid || !manualRfid.trim()}
                                        className="h-9 px-4 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-all flex-1 flex items-center justify-center gap-1.5"
                                        style={{ backgroundColor: themeColor }}
                                    >
                                        Unlock
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

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
                            <div className="flex-1 flex flex-col justify-center py-4 overflow-y-auto space-y-4 min-h-0">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic text-center block mb-2">Now Serving</span>
                                
                                <AnimatePresence mode="popLayout">
                                    {dept.nowServing.length > 0 ? (
                                        <div className="space-y-4 w-full">
                                            {dept.nowServing.map((serving) => (
                                                <motion.div 
                                                    key={serving.queueNumber}
                                                    initial={{ scale: 0.95, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.95, opacity: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="text-center w-full p-4 rounded-3xl bg-white/5 border border-white/5 shadow-md flex flex-col items-center justify-center"
                                                >
                                                    <h3 className={`text-3xl lg:text-4xl font-black tracking-tight font-mono ${theme.text} drop-shadow-[0_0_15px_rgba(var(--primary),0.3)] animate-pulse`}>
                                                        {serving.queueNumber}
                                                    </h3>
                                                    <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/5">
                                                        <Activity className="w-3 h-3 text-slate-400" />
                                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                                            {serving.counterName}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 line-clamp-1">
                                                        {serving.residentName}
                                                    </p>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <motion.div
                                            key="idle"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 0.4 }}
                                            className="text-center space-y-2 py-6 w-full"
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
