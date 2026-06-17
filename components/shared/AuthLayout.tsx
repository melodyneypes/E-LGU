"use client";

import React from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

export const AuthTransitionContext = React.createContext<{
    isLeaving: boolean;
    triggerLeave: (callback: () => void) => void;
}>({
    isLeaving: false,
    triggerLeave: () => { },
});

interface HeroSlide {
    id: string;
    imageUrl: string;
    title: string;
    subtitle?: string | null;
}

interface AuthLayoutProps {
    children: React.ReactNode;
    slides?: HeroSlide[] | null;
    logoSrc?: string;
    brandWord1?: string;
    brandWord2?: string;
    themeColor?: string;
}

export const AuthLayout = ({
    children,
    slides = [],
    logoSrc,
    brandWord1 = "E",
    brandWord2 = "",
    themeColor = "#2563eb" // Default blue-600
}: AuthLayoutProps) => {
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isLeaving, setIsLeaving] = React.useState(false);

    const hasSlides = slides && slides.length > 0;

    React.useEffect(() => {
        if (!hasSlides) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % slides.length);
        }, 6000); // 6 seconds per slide
        return () => clearInterval(interval);
    }, [hasSlides, slides?.length]);

    const triggerLeave = (callback: () => void) => {
        setIsLeaving(true);
        setTimeout(() => {
            callback();
        }, 1200); // Allow animation to fully complete before routing
    };

    // Fallback data if no slides exist
    const currentSlide = hasSlides ? slides[currentIndex] : {
        imageUrl: "/images/umbrella-rocks.png",
        title: "Representing the timeless beauty of our coastal heritage.",
        subtitle: "LOCAL TOURISM OFFICE"
    };

    return (
        <AuthTransitionContext.Provider value={{ isLeaving, triggerLeave }}>
            <div
                className="flex min-h-screen w-full bg-slate-950 transition-colors duration-500 font-sans text-slate-950 dark:text-white relative overflow-hidden"
                style={{ "--primary-theme": themeColor } as React.CSSProperties}
            >


                {/* Left Side: Form Area */}
                <motion.div
                    animate={{ x: isLeaving ? "-100%" : "0%" }}
                    transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
                    className="flex w-full flex-col justify-center pt-48 lg:pt-32 px-8 lg:w-1/2 xl:px-24 relative z-10 bg-white dark:bg-slate-950 border-r border-slate-100 dark:border-white/5 min-h-screen"
                >
                    {/* Branding Block - Now Centered specifically over the Form Side */}
                    <div className="absolute top-10 md:top-14 lg:top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 md:gap-4 lg:gap-6 pointer-events-none transition-all duration-500 w-full">
                        <div className="flex flex-col md:flex-row items-center gap-3 md:gap-5 group pointer-events-auto">
                            <div
                                className="w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 relative overflow-hidden group-hover:scale-110 group-hover:rotate-3"
                                style={{ backgroundColor: themeColor, boxShadow: `0 20px 25px -5px ${themeColor}44` }}
                            >
                                {logoSrc ? (
                                    <Image src={logoSrc} alt="Logo" fill className="object-cover p-2" />
                                ) : (
                                    <Shield className="w-8 h-8 text-white relative z-10" />
                                )}
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex flex-col items-center drop-shadow-xl translate-y-1">
                                <span className="text-2xl md:text-3xl font-black uppercase tracking-tighter italic leading-none text-slate-900 dark:text-white">
                                    {brandWord1}<span style={{ color: themeColor }}>{brandWord2}</span>
                                </span>
                                <span className="text-[10px] md:text-[11px] uppercase font-black tracking-[0.4em] mt-2 text-slate-400 dark:text-slate-500/60">
                                    Smart Municipality
                                </span>
                            </div>
                        </div>
                        <div
                            className="h-0.5 w-32 md:w-40 bg-gradient-to-r from-transparent via-slate-200 to-transparent"
                            style={{ background: `linear-gradient(to right, transparent, ${themeColor}33, transparent)` } as React.CSSProperties}
                        />
                    </div>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="mx-auto w-full max-w-md"
                    >
                        {children}
                    </motion.div>

                    {/* Footer Credits */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 lg:left-14 lg:translate-x-0 w-full lg:w-auto text-center lg:text-left">
                        <p className="text-[10px] uppercase font-black tracking-widest text-slate-300 dark:text-slate-600">
                            © {new Date().getFullYear()} {brandWord1}{brandWord2} Portal
                        </p>
                    </div>
                </motion.div>

                {/* Right Side: Immersive Visual Carousel (Hidden on Mobile) */}
                <motion.div
                    animate={{ x: isLeaving ? "100%" : "0%" }}
                    transition={{ duration: 0.9, ease: [0.76, 0, 0.24, 1] }}
                    className="relative hidden w-1/2 lg:block overflow-hidden bg-slate-900 z-10"
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSlide.imageUrl}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="absolute inset-0"
                        >
                            <div className="absolute inset-0 bg-blue-950/20 z-10 mix-blend-overlay" />
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent z-10" />
                            <Image
                                src={currentSlide.imageUrl}
                                alt="Auth Background"
                                fill
                                className="object-cover"
                                priority
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* Quote Section Overlay with Animations */}
                    <div className="absolute inset-0 z-20 flex flex-col justify-end p-20 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentSlide.title}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="max-w-xl"
                            >
                                <blockquote className="space-y-6">
                                    <p className="text-4xl font-black italic tracking-tighter text-white leading-[1.1] uppercase drop-shadow-2xl">
                                        &quot;{currentSlide.title}&quot;
                                    </p>
                                    {currentSlide.subtitle && (
                                        <footer className="flex items-center gap-4">
                                            <div
                                                className="h-[2px] w-16 shadow-lg"
                                                style={{ backgroundColor: themeColor, boxShadow: `0 0 15px ${themeColor}88` }}
                                            />
                                            <cite
                                                className="text-xs font-black uppercase tracking-[0.5em] italic"
                                                style={{ color: themeColor }}
                                            >
                                                {currentSlide.subtitle}
                                            </cite>
                                        </footer>
                                    )}
                                </blockquote>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Decorative Corner Accents */}
                    <div className="absolute top-0 right-0 p-16 z-20 opacity-20">
                        <div className="w-40 h-40 border-t-2 border-r-2 border-white rounded-tr-[4rem]" />
                    </div>
                    <div className="absolute bottom-0 left-0 p-16 z-20 opacity-20">
                        <div className="w-40 h-40 border-b-2 border-l-2 border-white rounded-bl-[4rem]" />
                    </div>

                    {/* Slide Indicators */}
                    {hasSlides && slides.length > 1 && (
                        <div className="absolute bottom-10 right-20 z-30 flex gap-2">
                            {slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    className="h-1 transition-all duration-500 rounded-full"
                                    style={{
                                        width: idx === currentIndex ? '2rem' : '0.5rem',
                                        backgroundColor: idx === currentIndex ? themeColor : 'rgba(255,255,255,0.2)'
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>
        </AuthTransitionContext.Provider>
    );
};;
