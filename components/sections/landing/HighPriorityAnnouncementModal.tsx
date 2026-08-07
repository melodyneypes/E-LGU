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
    Layers 
} from "lucide-react";
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
}

interface HighPriorityAnnouncementModalProps {
    announcements: HighPriorityAnnouncement[];
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

export function HighPriorityAnnouncementModal({ announcements }: HighPriorityAnnouncementModalProps) {
    const { data: session } = useSession();
    const userKey = session?.user ? `user_${(session.user as any).id || (session.user as any).email}` : "guest";

    const [isOpen, setIsOpen] = useState(false);
    const [highPriorityList, setHighPriorityList] = useState<HighPriorityAnnouncement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(1);
    const [themeColor, setThemeColor] = useState("#2563eb");

    useEffect(() => {
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
    }, []);

    useEffect(() => {
        if (!announcements || announcements.length === 0) return;

        // Filter Health category announcements regardless of priority
        const filtered = [...announcements]
            .filter(a => a.category === "Health")
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

    if (!activeAnnouncement) return null;

    const isCritical = activeAnnouncement.priority === "Critical";
    const hasImage = Boolean(activeAnnouncement.imageUrl);
    const hasMultiple = highPriorityList.length > 1;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) handleDismissCurrent();
        }}>
            <DialogContent 
                showCloseButton={false}
                className={`p-0 overflow-visible border-0 bg-transparent shadow-none z-[200] transition-all duration-300 ${
                    hasImage ? "w-[92vw] sm:max-w-[660px] md:max-w-[780px]" : "w-[90vw] sm:max-w-[540px]"
                }`}
            >
                <DialogTitle className="sr-only">{activeAnnouncement.title}</DialogTitle>

                {/* Main Front Modal Container */}
                <div className="relative w-full bg-transparent pt-3 pr-3">
                    {/* Floating Shopee-Style Top-Right Close Circle */}
                    <button
                        type="button"
                        onClick={handleDismissCurrent}
                        className="absolute top-0 right-0 z-50 w-9 h-9 rounded-full bg-slate-900/90 text-slate-300 hover:text-white border-2 border-white/20 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 focus:outline-none backdrop-blur-md cursor-pointer"
                        title="Dismiss Advisory"
                    >
                        <X className="w-5 h-5" />
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
                            className="relative w-full overflow-hidden rounded-3xl border border-slate-800/90 shadow-2xl bg-slate-950 text-white"
                        >
                            {/* Top Banner Header */}
                            <div
                                className={`p-4 sm:p-5 relative overflow-hidden shrink-0 ${
                                    isCritical
                                        ? "bg-gradient-to-br from-red-600 via-rose-600 to-orange-600"
                                        : ""
                                }`}
                                style={!isCritical ? { backgroundColor: themeColor } : undefined}
                            >
                                {/* Background Decorative Graphic */}
                                <div className="absolute -right-6 -bottom-6 opacity-15 pointer-events-none">
                                    <Activity className="w-44 sm:w-52 h-44 sm:h-52 text-white" />
                                </div>
                                <div className="absolute top-0 right-0 w-44 sm:w-52 h-44 sm:h-52 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                                <div className="relative z-10 space-y-2">
                                    {/* Top Bar: Badges & Stack Navigation */}
                                    <div className="flex items-center justify-between gap-2 pr-6">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <Badge className={`px-3 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest gap-1 border-0 shadow-md ${
                                                isCritical
                                                    ? "bg-white text-red-600 animate-pulse"
                                                    : "bg-white text-emerald-800"
                                            }`}>
                                                {isCritical ? (
                                                    <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" />
                                                ) : (
                                                    <Activity className="w-3 h-3 text-emerald-600 shrink-0" />
                                                )}
                                                <span>RHU Health Advisory</span>
                                            </Badge>

                                            {activeAnnouncement.isPinned && (
                                                <Badge className="bg-white/20 text-white border-white/30 text-[8px] uppercase font-black tracking-wider backdrop-blur-md gap-1">
                                                    <Pin className="w-2.5 h-2.5" />
                                                    Pinned
                                                </Badge>
                                            )}

                                            {/* Stack Deck Counter Badge */}
                                            {hasMultiple && (
                                                <Badge className="bg-black/40 text-white border border-white/25 text-[8px] uppercase font-black tracking-wider backdrop-blur-md gap-1 px-2">
                                                    <Layers className="w-2.5 h-2.5 text-emerald-300" />
                                                    <span>Advisory {currentIndex + 1} of {highPriorityList.length}</span>
                                                </Badge>
                                            )}
                                        </div>

                                        {/* Stack Navigation Arrows */}
                                        {hasMultiple && (
                                            <div className="flex items-center gap-1 bg-black/30 backdrop-blur-md p-0.5 rounded-full border border-white/20">
                                                <button
                                                    type="button"
                                                    onClick={handlePrev}
                                                    className="w-6 h-6 rounded-full hover:bg-white/20 text-white/90 flex items-center justify-center transition-all focus:outline-none"
                                                    title="Previous Advisory"
                                                >
                                                    <ChevronLeft className="w-3.5 h-3.5" />
                                                </button>
                                                <span className="text-[9px] font-mono font-bold px-1 text-white/90">
                                                    {currentIndex + 1}/{highPriorityList.length}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleNext}
                                                    className="w-6 h-6 rounded-full hover:bg-white/20 text-white/90 flex items-center justify-center transition-all focus:outline-none"
                                                    title="Next Advisory"
                                                >
                                                    <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Title & Metadata */}
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-white/85">
                                            <BellRing className="w-3 h-3 text-emerald-300 animate-bounce" />
                                            <span>Rural Health Unit Mapandan</span>
                                            <span className="opacity-40">•</span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-2.5 h-2.5 opacity-70" />
                                                {format(new Date(activeAnnouncement.createdAt), "MMM d, yyyy")}
                                            </span>
                                        </div>

                                        <h2 className="text-base sm:text-lg md:text-xl font-black uppercase italic tracking-tighter text-white leading-tight drop-shadow-md break-words">
                                            {activeAnnouncement.title}
                                        </h2>
                                    </div>
                                </div>
                            </div>

                            {/* Content Body Card (Zero Scroll Bar Layout) */}
                            <div className="p-3.5 sm:p-4 bg-slate-950">
                                {hasImage ? (
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
                                        {/* Poster / Infographic Image Column */}
                                        <div className="md:col-span-6 relative w-full flex items-center justify-center rounded-none overflow-hidden border border-slate-800/80 shadow-md bg-slate-950/50">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={activeAnnouncement.imageUrl!}
                                                alt={activeAnnouncement.title}
                                                className="w-full h-auto max-h-[450px] object-contain rounded-none transition-all duration-300"
                                            />
                                        </div>

                                        {/* Details Text & Metadata Column */}
                                        <div className="md:col-span-6 space-y-2.5 flex flex-col justify-between">
                                            <div className="bg-slate-900/90 border border-slate-800/90 rounded-none p-3.5 space-y-2 shadow-inner h-full max-h-[160px] sm:max-h-[240px] md:max-h-[320px] overflow-y-auto custom-scrollbar">
                                                <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-line break-words">
                                                    {activeAnnouncement.content}
                                                </p>
                                            </div>

                                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-800/80">
                                                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-none border border-slate-800 text-slate-300">
                                                    <Tag className="w-3 h-3 text-primary" />
                                                    <span>Category: {activeAnnouncement.category}</span>
                                                </div>

                                                <div className="font-mono text-slate-400 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3 text-amber-400" /> E-Mapandan Official
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="bg-slate-900/90 border border-slate-800/90 rounded-none p-3.5 sm:p-4 space-y-2 shadow-inner max-h-[160px] sm:max-h-[240px] md:max-h-[320px] overflow-y-auto custom-scrollbar">
                                            <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed whitespace-pre-line break-words">
                                                {activeAnnouncement.content}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest pt-1 border-t border-slate-800/80">
                                            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-none border border-slate-800 text-slate-300">
                                                <Tag className="w-3 h-3 text-primary" />
                                                <span>Category: {activeAnnouncement.category}</span>
                                            </div>

                                            <div className="font-mono text-slate-400 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3 text-amber-400" /> E-Mapandan Official
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Action Bar */}
                            <DialogFooter className="p-3 sm:p-3.5 bg-slate-900/90 border-t border-slate-800/90 flex flex-col-reverse sm:flex-row items-center justify-between gap-2 shrink-0">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleDismissCurrent}
                                    className="w-full sm:w-auto text-[11px] sm:text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl h-9 sm:h-9.5 px-4"
                                >
                                    {hasMultiple ? "Dismiss This Notice" : "Dismiss Notice"}
                                </Button>
                                
                                <Link
                                    href="/user/services/rural-health-unit"
                                    onClick={handleDismissCurrent}
                                    className="w-full sm:w-auto"
                                >
                                    <Button
                                        type="button"
                                        className={`w-full sm:w-auto text-[11px] sm:text-xs font-black uppercase tracking-wider rounded-xl h-9 sm:h-9.5 px-5 gap-2 text-white shadow-xl transition-all active:scale-95 border-0 ${
                                            isCritical
                                                ? "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-600/25"
                                                : ""
                                        }`}
                                        style={!isCritical ? { backgroundColor: themeColor } : undefined}
                                    >
                                        <Calendar className="w-3.5 h-3.5" />
                                        <span>Schedule RHU Appointment</span>
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
