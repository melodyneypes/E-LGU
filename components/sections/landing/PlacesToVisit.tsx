"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import { Camera, Map as MapIcon, Compass, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TourismSpot } from "@prisma/client";

interface PlacesToVisitProps {
    spots?: TourismSpot[];
}

export function PlacesToVisit({ spots }: PlacesToVisitProps) {
    const router = useRouter();

    const [activeIndex, setActiveIndex] = React.useState(0);
    const [isPaused, setIsPaused] = React.useState(false);
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const displaySpots = spots || [];

    // Auto-cycle logic
    React.useEffect(() => {
        if (!displaySpots.length || isPaused) return;

        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % displaySpots.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [isPaused, displaySpots.length]);

    if (!spots || spots.length === 0) return null;

    return (
        <section id="tourism" className="pt-8 md:pt-12 pb-8 md:pb-12 px-6 max-w-7xl mx-auto">
            <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-0">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-0.5 bg-primary" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Spotlight</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Gallery
                    </h2>
                </div>
            </div>

            <div
                className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 grid-flow-dense mt-6 md:mt-10 lg:mt-12"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {displaySpots.map((spot, idx) => (
                    <GalleryCard 
                        key={spot.id} 
                        spot={spot} 
                        isActive={activeIndex === idx} 
                        activeIndex={activeIndex}
                        isMobile={isMobile}
                        onClick={() => router.push(`/user/tourism/${spot.id}`)}
                    />
                ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-center gap-3 mt-8 md:mt-12">
                {displaySpots.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setActiveIndex(idx)}
                        className={cn(
                            "h-1 transition-all duration-500 rounded-full",
                            activeIndex === idx ? "w-10 bg-primary" : "w-2.5 bg-slate-200 dark:bg-white/10"
                        )}
                    />
                ))}
            </div>
            
            <div className="flex justify-center mt-8 md:mt-12">
                <div
                    onClick={() => router.push("/user/tourism")}
                    className="w-full md:w-[400px] px-8 py-3.5 md:py-5 bg-primary hover:opacity-90 text-white rounded-[2rem] font-black uppercase tracking-widest text-[9px] md:text-[10px] transition-all cursor-pointer shadow-xl shadow-primary/25 active:scale-95 group flex items-center justify-center gap-2 md:gap-3 border-none"
                >
                    <Compass className="w-3.5 h-3.5 md:w-4 md:h-4 group-hover:rotate-45 transition-transform" />
                    Explore Entire Gallery
                </div>
            </div>
        </section>
    );
}

interface GalleryCardProps {
    spot: TourismSpot;
    isActive: boolean;
    activeIndex: number;
    isMobile: boolean;
    onClick: () => void;
}

function GalleryCard({ spot, isActive, activeIndex, isMobile, onClick }: GalleryCardProps) {
    const [isImageLoading, setIsImageLoading] = React.useState(true);

    const cardClasses = cn(
        "group relative h-[180px] md:h-[280px] rounded-2xl md:rounded-[2rem] overflow-hidden shadow-xl cursor-pointer transition-all duration-700 bg-slate-100 dark:bg-slate-900",
        isActive ? "col-span-2 ring-2 ring-primary shadow-primary/20" : "col-span-1 ring-1 ring-slate-200 dark:ring-white/5 opacity-80 hover:opacity-100"
    );

    const content = (
        <>
            <div className={`absolute inset-0 z-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 transition-opacity duration-700 ${isImageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
            <Image
                src={spot.imageUrl || "/place_to_visits/umbrella_rocks.png"}
                alt={spot.name}
                fill
                loading="lazy"
                onLoad={() => setIsImageLoading(false)}
                className={cn(
                    "object-cover transition-all duration-1000",
                    isActive ? "scale-105" : "scale-110",
                    isImageLoading ? 'opacity-0 blur-sm scale-110' : 'opacity-100 blur-0'
                )}
            />

            {/* Overlays */}
            <div className={cn(
                "absolute inset-0 transition-opacity duration-700",
                isActive
                    ? "bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-100"
                    : "bg-black/50 opacity-100"
            )} />
            <div className="absolute inset-0 bg-primary/10 mix-blend-overlay z-10" />

            {/* Content */}
            <div className="absolute bottom-3 left-3 right-3 md:bottom-6 md:left-6 md:right-6 z-20 space-y-2 md:space-y-3">
                <div className="flex items-center gap-2 md:gap-3">
                    <div className={cn(
                        "rounded-lg flex items-center justify-center border transition-all duration-500 shrink-0",
                        isActive ? "w-8 h-8 bg-primary border-primary/50 shadow-lg" : "w-6 h-6 md:w-8 md:h-8 bg-white/10 backdrop-blur-md border-white/20"
                    )}>
                        {isActive ? <Compass className="w-4 h-4 text-white animate-spin-slow" /> : <Camera className="w-3 h-3 md:w-4 md:h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className={cn(
                            "font-black text-white uppercase italic tracking-tighter leading-tight truncate",
                            isActive ? "text-lg md:text-xl lg:text-2xl" : "text-sm md:text-xl lg:text-2xl"
                        )}>
                            {spot.name}
                        </h3>
                        <p className="text-primary/90 text-[7px] md:text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                            <MapIcon className="w-2 md:w-2.5 h-2 md:h-2.5 min-w-[8px]" />
                            <span className="truncate">{spot.address}</span>
                        </p>
                    </div>
                    {isActive && (
                        <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>

                {isMobile ? (
                    isActive && (
                        <p className="text-slate-200 text-xs lg:text-sm font-medium leading-relaxed max-w-2xl italic line-clamp-2 md:line-clamp-none">
                            {spot.description}
                        </p>
                    )
                ) : (
                    <AnimatePresence>
                        {isActive && (
                            <motion.p
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-slate-200 text-xs lg:text-sm font-medium leading-relaxed max-w-2xl italic line-clamp-2 md:line-clamp-none"
                            >
                                {spot.description}
                            </motion.p>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Active Progress Bar */}
            {isActive && !isMobile && (
                <motion.div
                    className="absolute bottom-0 left-0 h-1 bg-primary z-30"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    key={`progress-${activeIndex}`}
                />
            )}
        </>
    );

    if (isMobile) {
        return (
            <div
                onClick={onClick}
                className={cardClasses}
                style={{ filter: isActive ? "grayscale(0)" : "grayscale(0.4)" }}
            >
                {content}
            </div>
        );
    }

    return (
        <motion.div
            layout
            onClick={onClick}
            initial={false}
            animate={{
                filter: isActive ? "grayscale(0)" : "grayscale(0.4)"
            }}
            transition={{
                duration: 0.6,
                ease: "anticipate"
            }}
            className={cardClasses}
        >
            {content}
        </motion.div>
    );
}
