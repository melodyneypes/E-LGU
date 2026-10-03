"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Pin, 
    Layers,
    Building2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export interface BploAnnouncementItem {
    id: string;
    title: string;
    content: string;
    priority: string;
    category?: string;
    department?: string;
    isPinned?: boolean;
    imageUrl?: string | null;
    eventDate?: string | Date | null;
    eventSchedule?: string | null;
    createdAt: Date | string;
}

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 60 : -60,
        opacity: 0
    }),
    center: {
        x: 0,
        opacity: 1
    },
    exit: (direction: number) => ({
        x: direction < 0 ? 60 : -60,
        opacity: 0
    })
};

export function BploAnnouncementModal({ initialAnnouncements }: { initialAnnouncements?: BploAnnouncementItem[] }) {
    const { data: session } = useSession();
    const userKey = session?.user ? `user_${(session.user as any).id || (session.user as any).email}` : "guest";

    const [isOpen, setIsOpen] = useState(false);
    const [list, setList] = useState<BploAnnouncementItem[]>(initialAnnouncements || []);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            try {
                const res = await fetch("/api/bplo/announcements");
                const json = await res.json();
                if (json.success && Array.isArray(json.announcements)) {
                    const unDismissed = json.announcements.filter((a: BploAnnouncementItem) => {
                        try {
                            return !sessionStorage.getItem(`dismissed_${userKey}_bplo_announcement_${a.id}`);
                        } catch {
                            return true;
                        }
                    });

                    if (unDismissed.length > 0) {
                        setList(unDismissed);
                        setCurrentIndex(0);
                        const timer = setTimeout(() => setIsOpen(true), 600);
                        return () => clearTimeout(timer);
                    }
                }
            } catch (err) {
                console.error("Error loading BPLO announcements for modal:", err);
            }
        };

        if (!initialAnnouncements || initialAnnouncements.length === 0) {
            fetchAnnouncements();
        } else {
            const unDismissed = initialAnnouncements.filter(a => {
                try {
                    return !sessionStorage.getItem(`dismissed_${userKey}_bplo_announcement_${a.id}`);
                } catch {
                    return true;
                }
            });
            if (unDismissed.length > 0) {
                setList(unDismissed);
                setCurrentIndex(0);
                const timer = setTimeout(() => setIsOpen(true), 600);
                return () => clearTimeout(timer);
            }
        }
    }, [initialAnnouncements, userKey]);

    const activeItem = list[currentIndex];

    const handleDismissAll = () => {
        list.forEach(a => {
            try {
                sessionStorage.setItem(`dismissed_${userKey}_bplo_announcement_${a.id}`, "true");
            } catch {}
        });
        setIsOpen(false);
    };

    const handleNext = () => {
        setDirection(1);
        setCurrentIndex(prev => (prev + 1) % list.length);
    };

    const handlePrev = () => {
        setDirection(-1);
        setCurrentIndex(prev => (prev - 1 + list.length) % list.length);
    };

    if (!activeItem) return null;

    const isCritical = activeItem.priority === "Critical";
    const isImportant = activeItem.priority === "Important";

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="max-w-xl w-[92vw] sm:w-full p-0 overflow-hidden bg-white dark:bg-[#0c101b] border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl z-50">
                <DialogTitle className="sr-only">{activeItem.title}</DialogTitle>

                {/* Top Accent Strip */}
                <div 
                    className={`h-2 w-full ${
                        isCritical 
                            ? "bg-rose-500" 
                            : isImportant 
                                ? "bg-amber-500" 
                                : "bg-primary"
                    }`} 
                />

                <div className="p-5 sm:p-7 space-y-4">
                    {/* Header Row */}
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span 
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-white shadow-sm"
                                style={{ backgroundColor: 'var(--primary-theme)' }}
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                BPLO Official Notice
                            </span>

                            {isCritical ? (
                                <Badge className="bg-rose-500 text-white border-0 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    Urgent Alert
                                </Badge>
                            ) : isImportant ? (
                                <Badge className="bg-amber-500 text-white border-0 text-[10px] font-black uppercase tracking-wider">
                                    Important
                                </Badge>
                            ) : null}

                            {activeItem.isPinned && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-primary">
                                    <Pin className="w-3 h-3 rotate-45" /> Pinned
                                </span>
                            )}
                        </div>

                        {/* Pagination Counter if multiple */}
                        {list.length > 1 && (
                            <div className="flex items-center gap-1 text-xs font-black text-slate-400">
                                <Layers className="w-3.5 h-3.5" />
                                {currentIndex + 1} / {list.length}
                            </div>
                        )}
                    </div>

                    {/* Animated Content Card */}
                    <div className="relative min-h-[160px] overflow-hidden">
                        <AnimatePresence mode="wait" custom={direction}>
                            <motion.div
                                key={activeItem.id}
                                custom={direction}
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="space-y-3"
                            >
                                {/* Image if available */}
                                {activeItem.imageUrl && (
                                    <div className="rounded-xl overflow-hidden max-h-52 w-full border border-slate-100 dark:border-white/5 shadow-xs">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={activeItem.imageUrl} alt={activeItem.title} className="w-full h-48 object-cover" />
                                    </div>
                                )}

                                {/* Title */}
                                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-snug">
                                    {activeItem.title}
                                </h2>

                                {/* Content Details */}
                                <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-h-56 overflow-y-auto pr-1 whitespace-pre-line font-medium">
                                    {activeItem.content}
                                </div>

                                {/* Event Date Metadata */}
                                {(activeItem.eventDate || activeItem.eventSchedule) && (
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                                        <span>
                                            Schedule: {activeItem.eventDate ? format(new Date(activeItem.eventDate), "MMMM dd, yyyy") : ""} 
                                            {activeItem.eventSchedule ? ` • ${activeItem.eventSchedule}` : ""}
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Navigation Carousel Buttons */}
                    {list.length > 1 ? (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePrev}
                                className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-white/10 text-xs font-bold"
                            >
                                <ChevronLeft className="w-4 h-4 mr-0.5" /> Prev
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNext}
                                className="h-8 px-2.5 rounded-lg border-slate-200 dark:border-white/10 text-xs font-bold"
                            >
                                Next <ChevronRight className="w-4 h-4 ml-0.5" />
                            </Button>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">
                            Official Municipal Advisory • E-LGU BPLO
                        </span>
                    )}

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            onClick={handleDismissAll}
                            className="w-full sm:w-auto rounded-xl text-xs font-black uppercase tracking-wider text-white shadow-md"
                            style={{ backgroundColor: 'var(--primary-theme)' }}
                        >
                            I Understand & Close
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
