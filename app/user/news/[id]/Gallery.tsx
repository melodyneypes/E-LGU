"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface GalleryProps {
    images: string[];
    themeColor?: string;
}

export default function Gallery({ images, themeColor = "#2563eb" }: GalleryProps) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const handlePrev = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (activeIndex !== null) {
            setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev! - 1));
        }
    }, [activeIndex, images.length]);

    const handleNext = useCallback((e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (activeIndex !== null) {
            setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev! + 1));
        }
    }, [activeIndex, images.length]);

    const handleClose = useCallback(() => {
        setActiveIndex(null);
    }, []);

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeIndex === null) return;
            if (e.key === "Escape") handleClose();
            if (e.key === "ArrowLeft") handlePrev();
            if (e.key === "ArrowRight") handleNext();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeIndex, handleClose, handlePrev, handleNext]);

    if (!images || images.length === 0) return null;

    return (
        <div className="pt-12 border-t border-slate-200 dark:border-white/5 space-y-6">
            {/* Header row with Title and Pill Badge */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Event Gallery
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                        Official event photography capturing speeches, exhibitions, and delegates.
                    </p>
                </div>
                <div className="px-3 py-1 bg-slate-100 dark:bg-white/5 rounded-full text-[10px] font-black tracking-wider text-slate-500 dark:text-slate-400 w-fit shrink-0">
                    {images.length} Additional Photos (2-{images.length + 1} of {images.length + 1})
                </div>
            </div>

            {/* Grid Layout Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {images.map((imgUrl, idx) => (
                    <motion.div
                        key={idx}
                        whileHover={{ y: -4 }}
                        onClick={() => setActiveIndex(idx)}
                        className="bg-white dark:bg-[#0f111a] border border-slate-200 dark:border-[#2a3040] rounded-2xl overflow-hidden shadow-sm hover:shadow-md cursor-pointer group flex flex-col transition-all duration-300"
                    >
                        <div className="relative aspect-square w-full bg-slate-50 dark:bg-[#1a1f2e] overflow-hidden">
                            <Image
                                src={imgUrl}
                                alt={`Gallery image ${idx + 2}`}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    className="bg-white/20 backdrop-blur-md text-white p-2 rounded-full border border-white/20 shadow-lg"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </motion.div>
                            </div>
                        </div>
                        <div className="p-3 bg-white dark:bg-[#0f111a] border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                Photo {idx + 2}
                            </span>
                            <span className="text-[9px] font-semibold text-slate-400 group-hover:text-primary transition-colors flex items-center gap-1" style={{ color: themeColor }}>
                                View Image
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Full-Screen Lightbox Modal Overlay */}
            <AnimatePresence>
                {activeIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 md:p-12 cursor-zoom-out"
                    >
                        {/* Close button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="absolute top-4 right-4 md:top-8 md:right-8 z-[10000] text-white/70 hover:text-white bg-white/5 hover:bg-white/15 rounded-full h-12 w-12 cursor-pointer"
                        >
                            <X className="w-6 h-6" />
                        </Button>

                        {/* Navigation Controls */}
                        {images.length > 1 && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handlePrev}
                                    className="absolute left-4 md:left-8 z-[10000] text-white/70 hover:text-white bg-white/5 hover:bg-white/15 rounded-full h-14 w-14 cursor-pointer flex items-center justify-center"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleNext}
                                    className="absolute right-4 md:right-8 z-[10000] text-white/70 hover:text-white bg-white/5 hover:bg-white/15 rounded-full h-14 w-14 cursor-pointer flex items-center justify-center"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </Button>
                            </>
                        )}

                        {/* Centered Image Container */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-5xl max-h-[80vh] aspect-[4/3] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black cursor-default"
                        >
                            <Image
                                src={images[activeIndex]}
                                alt={`Gallery image active`}
                                fill
                                className="object-contain"
                                priority
                            />
                        </motion.div>

                        {/* Gallery Index Indicator Badge */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white/80 text-[10px] font-black tracking-widest uppercase border border-white/10">
                            {activeIndex + 1} / {images.length}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
