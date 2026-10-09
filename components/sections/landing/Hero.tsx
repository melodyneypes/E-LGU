"use client";

import * as React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroSlide } from "@prisma/client";
import Link from "next/link";

interface HeroProps {
    slides: HeroSlide[];
    themeColor?: string;
    isMaintenanceActive?: boolean;
}

export function Hero({ slides, themeColor = "#0038a8", isMaintenanceActive = false }: HeroProps) {
    const [current, setCurrent] = React.useState(0);

    const defaultSlides: HeroSlide[] = React.useMemo(() => [
        {
            id: "default-slide-1",
            title: "Empowering Citizens Through Digital Governance",
            subtitle: null,
            tagline: "Welcome to the Official E-LGU Portal",
            imageUrl: "/images/lgu-seal-full.jpg",
            primaryBtnText: "Explore Online Services",
            primaryBtnLink: "#services",
            secondaryBtnText: "Municipal Leadership",
            secondaryBtnLink: "#leadership",
            barangay: null,
            order: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: "default-slide-2",
            title: "Fast, Transparent & Efficient Public Services",
            subtitle: null,
            tagline: "Local Government Unit Services",
            imageUrl: "/images/lgu-logo.png",
            primaryBtnText: "Apply for Permits",
            primaryBtnLink: "/user/services",
            secondaryBtnText: "Track Applications",
            secondaryBtnLink: "/user/services/requests",
            barangay: null,
            order: 2,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            id: "default-slide-3",
            title: "24/7 Civic Safety & Emergency Response",
            subtitle: null,
            tagline: "Public Order & Disaster Response",
            imageUrl: "/images/lgu-seal-full.jpg",
            primaryBtnText: "Report Emergency",
            primaryBtnLink: "#emergency",
            secondaryBtnText: "Emergency Hotlines",
            secondaryBtnLink: "#emergency",
            barangay: null,
            order: 3,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ], []);

    const effectiveSlides = React.useMemo(() => {
        return (slides && slides.length > 0) ? slides : defaultSlides;
    }, [slides, defaultSlides]);

    const next = () => setCurrent((prev) => (prev + 1) % effectiveSlides.length);
    const prev = () => setCurrent((prev) => (prev - 1 + effectiveSlides.length) % effectiveSlides.length);

    React.useEffect(() => {
        if (current >= effectiveSlides.length) {
            setCurrent(0);
        }
    }, [effectiveSlides.length, current]);

    React.useEffect(() => {
        if (effectiveSlides.length <= 1) return;
        const timer = setInterval(next, 7000);
        return () => clearInterval(timer);
    }, [effectiveSlides.length]);

    const [heroImageError, setHeroImageError] = React.useState<Record<string, boolean>>({});

    const activeSlide = effectiveSlides[current] || effectiveSlides[0];
    const slideImageUrl = heroImageError[activeSlide.id] ? "/images/lgu-seal-full.jpg" : (activeSlide.imageUrl || "/images/lgu-seal-full.jpg");

    return (
        <section className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-slate-950">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 z-0"
                >
                    <Image
                        src={slideImageUrl}
                        alt={activeSlide.title}
                        fill
                        className="object-cover scale-105 filter brightness-90"
                        priority
                        onError={() => setHeroImageError((prev) => ({ ...prev, [activeSlide.id]: true }))}
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/50 to-slate-950/90 z-10" />
                    <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay z-10" />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent z-10 pointer-events-none" />
                </motion.div>
            </AnimatePresence>

            <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 text-center w-full">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSlide.id}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -30 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="space-y-6 md:space-y-10 max-w-5xl mx-auto"
                    >
                        <div className="space-y-3 md:space-y-5">
                            {activeSlide.tagline && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-block px-4 py-1.5 backdrop-blur-xl rounded-full text-[9px] sm:text-[11px] font-black uppercase tracking-[0.25em] md:tracking-[0.35em] text-white shadow-[0_0_20px_rgba(0,56,168,0.4)] border border-white/20"
                                    style={{ backgroundColor: `${themeColor}44` }}
                                >
                                    {activeSlide.tagline}
                                </motion.span>
                            )}
                            <h1 className="text-3xl xs:text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white uppercase italic tracking-tighter leading-[0.95] md:leading-[0.88] break-words max-w-4xl mx-auto drop-shadow-[0_8px_30px_rgba(0,0,0,0.9)]">
                                {activeSlide.title.replace(/-/g, "\u2011")}
                            </h1>
                        </div>



                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            {activeSlide.primaryBtnText && !isMaintenanceActive && (
                                <Link href={activeSlide.primaryBtnLink || "#"}>
                                    <Button
                                        className="px-6 py-3 md:px-10 md:py-5 h-auto text-white rounded-[2rem] font-black uppercase tracking-widest text-[8px] md:text-[10px] transition-all shadow-xl active:scale-95 flex items-center gap-2 md:gap-3 border-none hover:opacity-90"
                                        style={{ backgroundColor: themeColor, boxShadow: `0 20px 25px -5px ${themeColor}44` }}
                                    >
                                        <Compass className="w-4 h-4 md:w-5 md:h-5" />
                                        {activeSlide.primaryBtnText}
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Controls */}
            {effectiveSlides.length > 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-30 hidden md:flex justify-between px-4 md:px-10 pointer-events-none">
                    <button
                        onClick={prev}
                        className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white backdrop-blur-md transition-all pointer-events-auto active:scale-90"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={next}
                        className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white backdrop-blur-md transition-all pointer-events-auto active:scale-90"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* Slide Indicators */}
            {effectiveSlides.length > 1 && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                    {effectiveSlides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            className={cn(
                                "h-1.5 transition-all rounded-full outline-none border-none",
                                current === i ? "w-10" : "w-3 bg-white/30"
                            )}
                            style={{ backgroundColor: current === i ? themeColor : undefined }}
                        />
                    ))}
                </div>
            )}

            {/* Bottom Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white dark:from-slate-950 to-transparent z-20" />

            {/* Floating Indicators */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4">
                <div className="w-px h-12 bg-gradient-to-b from-white to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50 vertical-text">Scroll</span>
            </div>
        </section>
    );
}


function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
