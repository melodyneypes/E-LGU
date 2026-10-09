"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { 
    ShieldAlert, 
    Activity, 
    Calendar, 
    Tag, 
    X, 
    BellRing, 
    Sparkles, 
    Pin, 
    ChevronLeft, 
    ChevronRight, 
    Layers,
    Building2
} from "lucide-react";
import lguConfig from "@/config/lgu.config.json";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export interface HighPriorityAnnouncement {
    id: string;
    title: string;
    content: string;
    priority: string;
    category: string;
    isPinned?: boolean;
    imageUrl?: string | null;
    createdAt: Date | string;
    department?: string | null;
    approvalStatus?: string | null;
}

interface HighPriorityAnnouncementModalProps {
    announcements: HighPriorityAnnouncement[];
    themeColor?: string;
}

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0
    }),
    center: {
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 80 : -80,
        opacity: 0
    })
};

export function HighPriorityAnnouncementModal({ announcements, themeColor: initialThemeColor }: HighPriorityAnnouncementModalProps) {
    const { data: session } = useSession();
    const userKey = session?.user ? `user_${(session.user as any).id || (session.user as any).email}` : "guest";

    const [isOpen, setIsOpen] = useState(false);
    const [highPriorityList, setHighPriorityList] = useState<HighPriorityAnnouncement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [themeColor, setThemeColor] = useState(initialThemeColor || "var(--primary-theme, #0038a8)");

    useEffect(() => {
        if (initialThemeColor) {
            setThemeColor(initialThemeColor);
        } else {
            const fetchSettings = async () => {
                try {
                    const response = await fetch('/api/settings');
                    const data = await response.json();
                    if (data.themeColor) {
                        setThemeColor(data.themeColor);
                    }
                } catch (error) {
                    console.error('Error fetching theme settings:', error);
                }
            };
            fetchSettings();
        }
    }, [initialThemeColor]);

    useEffect(() => {
        if (!announcements || announcements.length === 0) return;

        // Filter Health, BPLO/Business advisories, or Critical municipality alerts
        const filtered = [...announcements]
            .filter(a => a.category === "Health" || a.category === "Business" || a.department === "BPLO" || a.priority === "Critical" || a.isPinned)
            .sort((a, b) => {
                if (a.priority === "Critical" && b.priority !== "Critical") return -1;
                if (a.priority !== "Critical" && b.priority === "Critical") return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

        // Exclude ones dismissed for the current auth scope (guest vs logged-in user)
        const unDismissed = filtered.filter(a => {
            try {
                return !sessionStorage.getItem(`dismissed_${userKey}_announcement_${a.id}`);
            } catch {
                return true;
            }
        });

        if (unDismissed.length === 0) return;

        setHighPriorityList(unDismissed);
        setCurrentIndex(0);

        // Entrance animation timer
        const timer = setTimeout(() => {
            setIsOpen(true);
        }, 600);
        return () => clearTimeout(timer);
    }, [announcements, userKey]);

    const activeAnnouncement = highPriorityList[currentIndex];
    const isCritical = activeAnnouncement?.priority === "Critical";
    const isBPLO = activeAnnouncement?.category === "Business" || activeAnnouncement?.department === "BPLO";
    const isHealth = activeAnnouncement?.category === "Health" || activeAnnouncement?.department === "RHU";

    let badgeLabel = "Official Advisory";
    if (isCritical) {
        badgeLabel = "Critical Alert";
    } else if (isBPLO) {
        badgeLabel = "BPLO Business Advisory";
    } else if (isHealth) {
        badgeLabel = "RHU Health Advisory";
    } else if (activeAnnouncement?.category) {
        badgeLabel = `${activeAnnouncement.category} Advisory`;
    }

    let issuerLabel = "Municipality of E-LGU";
    if (isBPLO) {
        issuerLabel = "Business Permits & Licensing Office (BPLO)";
    } else if (isHealth) {
        issuerLabel = "Rural Health Unit (RHU)";
    }

    let ctaHref = "/user/announcements";
    let ctaLabel = "View Advisory Details";
    if (isBPLO) {
        ctaHref = "/user/services/business-permit-appointment";
        ctaLabel = "Schedule BPLO Appointment";
    } else if (isHealth) {
        ctaHref = "/user/services/rural-health-unit";
        ctaLabel = "Schedule RHU Appointment";
    }

    const handleDismissCurrent = () => {
        if (!activeAnnouncement) return;

        try {
            sessionStorage.setItem(`dismissed_${userKey}_announcement_${activeAnnouncement.id}`, "true");
        } catch {
            // ignore
        }

        const remaining = highPriorityList.filter(a => a.id !== activeAnnouncement.id);
        if (remaining.length > 0) {
            setHighPriorityList(remaining);
            setCurrentIndex(prev => (prev >= remaining.length ? 0 : prev));
        } else {
            setIsOpen(false);
        }
    };

    const handleNext = () => {
        if (highPriorityList.length <= 1) return;
        setDirection(1);
        setCurrentIndex(prev => (prev + 1) % highPriorityList.length);
    };

    const handlePrev = () => {
        if (highPriorityList.length <= 1) return;
        setDirection(-1);
        setCurrentIndex(prev => (prev - 1 + highPriorityList.length) % highPriorityList.length);
    };

    if (!isOpen || !activeAnnouncement) return null;

    const hasMultiple = highPriorityList.length > 1;
    const hasImage = Boolean(activeAnnouncement.imageUrl);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                handleDismissCurrent();
            }
        }}>
            <DialogContent 
                className="max-w-2xl w-[94vw] sm:w-[90vw] md:w-full p-0 border-0 bg-transparent shadow-none overflow-visible rounded-3xl focus:outline-none z-[150] my-auto"
                showCloseButton={false}
            >
                <DialogTitle className="sr-only">
                    {activeAnnouncement.title}
                </DialogTitle>

                <div className="relative group max-h-[88vh] sm:max-h-[90vh] flex flex-col">
                    {/* Floating Close Button */}
                    <button
                        type="button"
                        onClick={handleDismissCurrent}
                        className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 z-50 p-2 sm:p-2.5 rounded-full bg-slate-900/95 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-all shadow-2xl active:scale-90 cursor-pointer flex items-center justify-center focus:outline-none"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <AnimatePresence mode="wait" custom={direction}>
                        <motion.div
                            key={activeAnnouncement.id}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.22, ease: "easeInOut" }}
                            className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/90 shadow-2xl bg-slate-950 text-white flex flex-col max-h-[88vh] sm:max-h-[90vh]"
                        >
                            {/* Top Banner Header */}
                            <div
                                className={`p-3.5 sm:p-5 relative overflow-hidden shrink-0 ${
                                    isCritical
                                        ? "bg-gradient-to-br from-red-600 via-rose-600 to-orange-600"
                                        : ""
                                }`}
                                style={!isCritical ? { backgroundColor: themeColor } : undefined}
                            >
                                {/* Background Decorative Graphic */}
                                <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
                                    {isCritical ? (
                                        <ShieldAlert className="w-36 sm:w-52 h-36 sm:h-52 text-white" />
                                    ) : isBPLO ? (
                                        <Building2 className="w-36 sm:w-52 h-36 sm:h-52 text-white" />
                                    ) : (
                                        <Activity className="w-36 sm:w-52 h-36 sm:h-52 text-white" />
                                    )}
                                </div>
                                <div className="absolute top-0 right-0 w-36 sm:w-52 h-36 sm:h-52 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                <div className="relative z-10 space-y-1.5 sm:space-y-2">
                                    {/* Top Bar: Badges & Stack Navigation */}
                                    <div className="flex items-center justify-between gap-2 pr-6 sm:pr-8">
                                        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                                            <Badge className={`px-2.5 py-0.5 sm:px-3 sm:py-1 text-[8.5px] sm:text-[10px] font-black uppercase tracking-widest gap-1 border-0 shadow-md ${
                                                isCritical
                                                    ? "bg-white text-red-600 animate-pulse"
                                                    : isBPLO
                                                    ? "bg-white text-blue-900"
                                                    : "bg-cyan-400 text-slate-950 font-bold shadow-[0_0_12px_rgba(0,210,255,0.4)]"
                                            }`}>
                                                {isCritical ? (
                                                    <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" />
                                                ) : isBPLO ? (
                                                    <Building2 className="w-3 h-3 text-blue-800 shrink-0" />
                                                ) : (
                                                    <Activity className="w-3 h-3 text-slate-950 shrink-0" />
                                                )}
                                                <span>{badgeLabel}</span>
                                            </Badge>

                                            {activeAnnouncement.isPinned && (
                                                <Badge className="bg-white/20 text-white border-white/30 text-[7.5px] sm:text-[8px] uppercase font-black tracking-wider backdrop-blur-md gap-1">
                                                    <Pin className="w-2.5 h-2.5" />
                                                    Pinned
                                                </Badge>
                                            )}

                                            {/* Stack Deck Counter Badge */}
                                            {hasMultiple && (
                                                <Badge className="bg-black/40 text-white border border-white/25 text-[7.5px] sm:text-[8px] uppercase font-black tracking-wider backdrop-blur-md gap-1 px-1.5 sm:px-2">
                                                    <Layers className="w-2.5 h-2.5 text-cyan-300" />
                                                    <span>{currentIndex + 1} of {highPriorityList.length}</span>
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Stack Navigation Arrows */}
                                        {hasMultiple && (
                                            <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md p-0.5 rounded-full border border-white/20">
                                                <button
                                                    type="button"
                                                    onClick={handlePrev}
                                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full hover:bg-white/20 text-white/90 flex items-center justify-center transition-all focus:outline-none"
                                                    title="Previous Advisory"
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-[8px] sm:text-[9px] font-mono font-bold px-1 text-white/90">
                                                    {currentIndex + 1}/{highPriorityList.length}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleNext}
                                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full hover:bg-white/20 text-white/90 flex items-center justify-center transition-all focus:outline-none"
                                                    title="Next Advisory"
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title & Metadata */}
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5 sm:gap-2 text-[7.5px] sm:text-[9px] font-black uppercase tracking-[0.12em] sm:tracking-[0.15em] text-white/85 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <BellRing className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-300 animate-bounce" />
                                                <span className="truncate max-w-[190px] sm:max-w-none">{issuerLabel}</span>
                                            </div>
                                            <span className="opacity-40">•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5 opacity-70" />
                                                {format(new Date(activeAnnouncement.createdAt), "MMM d, yyyy")}
                                            </span>
                                        </div>

                                        <h2 className="text-sm sm:text-lg md:text-xl font-black uppercase italic tracking-tight text-white leading-snug drop-shadow-md break-words">
                                            {activeAnnouncement.title}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            {/* Content Body Card */}
                            <div className="p-3 sm:p-4 bg-slate-950 overflow-y-auto flex-1 custom-scrollbar">
                                {hasImage ? (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                                        <div className="md:col-span-6 relative w-full flex items-center justify-center rounded-xl overflow-hidden border border-slate-800/80 shadow-md bg-slate-900/50">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={activeAnnouncement.imageUrl!}
                                                alt={activeAnnouncement.title}
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = lguConfig.assets.contentPlaceholder;
                                                }}
                                                className="w-full h-auto max-h-[180px] sm:max-h-[260px] md:max-h-[360px] object-contain rounded-xl transition-all duration-300"
                                            />
                                        </div>

                                        {/* Details Text & Metadata Column */}
                                        <div className="md:col-span-6 space-y-2 flex flex-col justify-between">
                                            <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 sm:p-3.5 space-y-1.5 shadow-inner max-h-[120px] sm:max-h-[180px] md:max-h-[260px] overflow-y-auto custom-scrollbar">
                                                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-line break-words">
                                                    {activeAnnouncement.content}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-800/80">
                                                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-800 text-slate-300">
                                                    <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                                                    <span>{activeAnnouncement.category}</span>
                                                </div>

                                                <div className="font-mono text-slate-400 flex items-center gap-1 text-[8px] sm:text-[9px]">
                                                    <Sparkles className="w-2.5 h-2.5 text-amber-400" /> E-LGU Official
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        <div className="bg-slate-900/90 border border-slate-800/90 rounded-xl p-3 sm:p-4 space-y-2 shadow-inner max-h-[160px] sm:max-h-[240px] md:max-h-[300px] overflow-y-auto custom-scrollbar">
                                            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-line break-words">
                                                {activeAnnouncement.content}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-800/80">
                                            <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-slate-800 text-slate-300">
                                                <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                                                <span>{activeAnnouncement.category}</span>
                                            </div>

                                            <div className="font-mono text-slate-400 flex items-center gap-1 text-[8px] sm:text-[9px]">
                                                <Sparkles className="w-2.5 h-2.5 text-amber-400" /> E-LGU Official
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Action Bar */}
                            <DialogFooter className="p-2.5 sm:p-3.5 bg-slate-900/90 border-t border-slate-800/90 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleDismissCurrent}
                                    className="w-full sm:w-auto text-[10.5px] sm:text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl h-8.5 sm:h-9.5 px-3 sm:px-4"
                                >
                                    {hasMultiple ? "Dismiss This Notice" : "Dismiss Notice"}
                                </Button>
                                
                                <Link
                                    href={ctaHref}
                                    onClick={handleDismissCurrent}
                                    className="w-full sm:w-auto"
                                >
                                    <Button
                                        type="button"
                                        className={`w-full sm:w-auto text-[10.5px] sm:text-xs font-black uppercase tracking-wider rounded-xl h-8.5 sm:h-9.5 px-4 sm:px-5 gap-2 text-white shadow-xl transition-all active:scale-95 border-0 ${
                                            isCritical
                                                ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/25"
                                                : ""
                                        }`}
                                        style={!isCritical ? { backgroundColor: themeColor } : undefined}
                                    >
                                        {isBPLO ? (
                                            <Building2 className="w-3.5 h-3.5" />
                                        ) : isHealth ? (
                                            <Calendar className="w-3.5 h-3.5" />
                                        ) : (
                                            <Sparkles className="w-3.5 h-3.5" />
                                        )}
                                        <span>{ctaLabel}</span>
                                    </Button>
                                </Link>
                            </DialogFooter>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
