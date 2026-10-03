"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define a luxurious color palette for the mayors
const ACCENT_COLORS = [
    "#d97706", // amber-600
    "#0d9488", // teal-600
    "#7c3aed", // violet-600
    "#c2410c", // terracotta/orange-700
    "#2563eb", // blue-600
    "#be185d", // pink-700
    "#15803d", // green-700
    "#4338ca", // indigo-700
];

interface Mayor {
    id: string;
    name: string;
    termStart: string;
    termEnd: string;
    description: string | null;
    imageUrl: string | null;
    order: number;
}

interface PastMayorsExhibitProps {
    mayors: Mayor[];
    brandWord1?: string;
    brandWord2?: string;
    isBarangayView?: boolean;
}

export function PastMayorsExhibit({ mayors, brandWord1 = "E-", brandWord2 = "LGU", isBarangayView }: PastMayorsExhibitProps) {
    const [[page, direction], setPage] = React.useState([0, 0]);
    const [isPaused, setIsPaused] = React.useState(false);

    // Filter or prepare mayors gracefully if none
    const validMayors = React.useMemo(() => (mayors && mayors.length > 0 ? mayors : []), [mayors]);

    // Wrapping index calculation safely
    const activeIndex = validMayors.length > 0 ? Math.abs(page % validMayors.length) : 0;
    const activeMayor = validMayors[activeIndex];
    const currentColor = ACCENT_COLORS[activeIndex % ACCENT_COLORS.length];

    React.useEffect(() => {
        if (!validMayors.length || isPaused) return;
        const timer = setInterval(() => {
            setPage([page + 1, 1]);
        }, 6000);
        return () => clearInterval(timer);
    }, [page, isPaused, validMayors.length]);

    const paginate = (newDirection: number) => {
        setPage([page + newDirection, newDirection]);
    };

    if (!validMayors.length) return null;

    // Framer Motion Variants for directional sliding
    const slideVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
            scale: 0.95
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 100 : -100,
            opacity: 0,
            scale: 0.95
        })
    };

     
    const textStaggerVariants: any = {
        hidden: { opacity: 0, y: 20 },
        visible: (custom: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: custom * 0.15, duration: 0.8, ease: "easeOut" }
        })
    };

    // Calculate era badge based on year roughly
    const getEra = (startYear: string) => {
        const year = parseInt(startYear);
        if (isNaN(year)) return "Public Servant";
        if (year < 1946) return "Pre-War Era";
        if (year < 1986) return "Post-War Republic";
        if (year < 2000) return "Late 20th Century";
        return "Modern Era";
    };

    return (
        <section 
            id="past-mayors"
            className="relative w-full bg-[#080810] text-[#f8f9fa] flex flex-col py-10 md:py-10 font-sans selection:bg-white/20"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-label={isBarangayView ? "Historical Timeline of Past Captains" : "Historical Timeline of Past Mayors"}
        >
            {/* Background wrapper to prevent bleed without breaking sticky */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Dark Ambient Glow Bottom */}
                <div 
                    className="absolute -bottom-1/2 left-0 right-0 h-full opacity-30 blur-[120px] transition-colors duration-1000 select-none"
                    style={{ backgroundColor: currentColor }}
                />

                {/* Subtle SVG Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" 
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} 
                />
            </div>

            {/* Header */}
            <div className="sticky top-20 z-50 pt-4 pb-2 md:pt-1 md:pb-1 bg-[#080810]/95 backdrop-blur-xl md:bg-transparent md:backdrop-blur-none container mx-auto px-4 flex flex-col items-center w-full border-b border-white/5 md:border-none">
                <div className="flex items-center gap-2 text-white/60 mb-2 md:mb-4">
                    <div className="h-px w-8 bg-white/20" />
                    <span className="uppercase tracking-[0.4em] text-xs font-bold text-white/50">{brandWord1} {brandWord2}</span>
                    <div className="h-px w-8 bg-white/20" />
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none">
                    Past <span className="opacity-50">{isBarangayView ? "Captains" : "Mayors"}</span>
                </h2>
                <div className="w-px h-8 md:h-12 bg-gradient-to-b from-white/20 to-transparent mt-2" />
            </div>

            {/* Main Carousel Area */}
            <div className="relative w-full max-w-7xl mx-auto flex-1 flex items-center justify-center px-12 lg:px-24 py-12 z-10">
                {/* Left Side Navigation */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => paginate(-1)}
                    className="absolute left-4 lg:left-8 z-30 rounded-full w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white backdrop-blur-sm hidden md:flex"
                    aria-label={isBarangayView ? "Previous Captain" : "Previous Mayor"}
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>

                <AnimatePresence initial={false} custom={direction} mode="wait">
                    <motion.div
                        key={page}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ x: { type: "spring", stiffness: 300, damping: 30 }, opacity: { duration: 0.4 } }}
                        className="w-full flex flex-col lg:flex-row gap-8 lg:gap-16 items-center"
                    >
                        {/* Left: Image Panel */}
                        <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative">
                            {/* Ghosted Index Watermark */}
                            <div className="absolute -left-4 -top-12 md:-left-12 md:-top-16 text-[8rem] md:text-[14rem] font-black italic text-white/[0.03] select-none pointer-events-none leading-none z-0 tracking-tighter">
                                {String(activeIndex + 1).padStart(2, '0')}
                            </div>

                            <div className="relative group perspective-1000 z-10 w-full max-w-md">
                                {/* Corner Bracket Accents */}
                                <div className="absolute -top-4 -left-4 w-12 h-12 border-t border-l border-white/30 rounded-tl-xl transition-all duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:border-white/60" />
                                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b border-r border-white/30 rounded-br-xl transition-all duration-700 group-hover:translate-x-2 group-hover:translate-y-2 group-hover:border-white/60" />

                                <div className="relative aspect-[3/4] md:aspect-[4/5] rounded-sm overflow-hidden bg-[#111116] border border-white/10 shadow-2xl bg-black">
                                    {/* Radial Glow Setup behind image */}
                                    <div 
                                        className="absolute inset-0 opacity-20 transition-colors duration-1000 mix-blend-color-dodge z-0"
                                        style={{ background: `radial-gradient(circle at 50% 50%, ${currentColor} 0%, transparent 70%)` }}
                                    />
                                    
                                    <div className="w-full h-full relative z-10 rounded-sm overflow-hidden bg-[#0c0c12]">
                                        {activeMayor.imageUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={activeMayor.imageUrl} 
                                                alt={activeMayor.name} 
                                                className="w-full h-full object-cover grayscale-0 opacity-100 transition-all duration-1000 hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center border border-white/5 bg-[#0a0a0f] relative overflow-hidden">
                                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
                                                <div 
                                                    className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center text-4xl font-serif text-white/20 italic backdrop-blur-md transition-colors duration-1000"
                                                    style={{ boxShadow: `0 0 40px -10px ${currentColor}` }}
                                                >
                                                    {activeMayor.name.charAt(0)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Frosted Badge */}
                                    <div className="absolute top-6 left-6 z-20 bg-black/40 backdrop-blur-md border border-white/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white italic shadow-xl">
                                        {getEra(activeMayor.termStart)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Text Panel */}
                        <div className="w-full lg:w-1/2 flex flex-col justify-center space-y-8 z-10 text-center lg:text-left">
                            
                            <motion.div custom={1} variants={textStaggerVariants} initial="hidden" animate="visible">
                                <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-white/50 flex items-center justify-center lg:justify-start gap-3 mb-4">
                                    <Calendar className="w-4 h-4 opacity-70" style={{ color: currentColor }} />
                                    <span>{activeMayor.termStart} &mdash; {activeMayor.termEnd}</span>
                                </div>
                                <h3 className="text-3xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-[1.1] mb-2">
                                    {activeMayor.name}
                                </h3>
                            </motion.div>

                            <motion.div custom={2} variants={textStaggerVariants} initial="hidden" animate="visible" className="relative pl-6 lg:pl-8 py-2">
                                <div 
                                    className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full transition-colors duration-1000 opacity-60" 
                                    style={{ backgroundColor: currentColor }}
                                />
                                <Quote className="absolute -left-2 -top-6 w-16 h-16 text-white/[0.04] rotate-180 z-0" />
                                
                                <div className="relative z-10 pt-2">
                                    <h4 className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mb-4 border-b border-white/10 pb-2 inline-block">Key Highlights & Leadership</h4>
                                    {activeMayor.description ? (
                                        <ul className="space-y-4 text-sm md:text-base text-white/70 font-medium italic tracking-tight max-w-lg mx-auto lg:mx-0 text-left">
                                            {activeMayor.description.split('\n').filter(Boolean).slice(0, 4).map((item, i) => (
                                                <li key={i} className="flex flex-col relative pl-6 group/item">
                                                    <span className="absolute left-0 top-2 w-1.5 h-1.5 rounded-full transition-transform group-hover/item:scale-150" style={{ backgroundColor: currentColor }} />
                                                    <span className="leading-snug">{item.trim().replace(/^[-•*]\s*/, '')}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">Historical records being updated.</p>
                                    )}
                                </div>
                            </motion.div>

                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Right Side Navigation */}
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => paginate(1)}
                    className="absolute right-4 lg:right-8 z-30 rounded-full w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white backdrop-blur-sm hidden md:flex"
                    aria-label={isBarangayView ? "Next Captain" : "Next Mayor"}
                >
                    <ChevronRight className="w-5 h-5" />
                </Button>
            </div>

            {/* Navigation & Controls (Mobile + Dots) */}
            <div className="relative z-20 pb-8 w-full max-w-7xl mx-auto px-6 flex flex-col items-center justify-center gap-6">
                
                {/* Mobile Chevrons */}
                <div className="flex md:hidden items-center gap-4 w-full justify-between">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => paginate(-1)}
                        className="rounded-full w-10 h-10 bg-white/5 border border-white/10 text-white/70"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                    {validMayors.map((_, idx) => {
                        const isActive = activeIndex === idx;
                        return (
                            <button
                                key={idx}
                                onClick={() => {
                                    const direction = idx > activeIndex ? 1 : -1;
                                    setPage([idx, direction]);
                                }}
                                className={cn(
                                    "h-1.5 rounded-full transition-all duration-700 ease-in-out",
                                    isActive ? "w-12 opacity-100" : "w-2 bg-white/20 hover:bg-white/40 opacity-50"
                                )}
                                style={isActive ? { backgroundColor: currentColor, boxShadow: `0 0 10px ${currentColor}50` } : {}}
                                aria-label={isBarangayView ? `Go to captain ${idx + 1}` : `Go to mayor ${idx + 1}`}
                            />
                        );
                    })}
                </div>

                {/* Mobile Chevrons Next */}
                <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => paginate(1)}
                        className="md:hidden rounded-full w-10 h-10 bg-white/5 border border-white/10 text-white/70"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>

                {/* Current Info Tracker */}
                <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
                    <span style={{ color: currentColor }}>{String(activeIndex + 1).padStart(2, '0')}</span> / {String(validMayors.length).padStart(2, '0')}
                </div>

            </div>
        </section>
    );
}
