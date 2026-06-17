"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Download, ShieldCheck, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppDownloadSectionProps {
    themeColor?: string;
    googlePlayUrl?: string;
    appStoreUrl?: string;
    apkDownloadUrl?: string;
    isLoggedIn?: boolean;
}

export function AppDownloadSection({ themeColor, googlePlayUrl, appStoreUrl, apkDownloadUrl, isLoggedIn }: AppDownloadSectionProps) {
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
    const [isVisible, setIsVisible] = React.useState(true);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    React.useEffect(() => {
        if (isLoggedIn) {
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 120000); // 2 minutes (120,000 ms)
            return () => clearTimeout(timer);
        }
    }, [isLoggedIn]);

    if (!isVisible) return null;

    const isPlayStoreDisabled = !googlePlayUrl || googlePlayUrl === "#" || googlePlayUrl.trim() === "";
    const isAppStoreDisabled = !appStoreUrl || appStoreUrl === "#" || appStoreUrl.trim() === "";
    const isApkDisabled = !apkDownloadUrl || apkDownloadUrl === "#" || apkDownloadUrl.trim() === "";

    const apps = [
        {
            platform: "Android Device",
            store: "Google Play Store",
            description: "Install the official E-Mapandan app from Google Play for automatic updates and secure transactions.",
            icon: (
                <svg className="w-8 h-8 transition-colors" style={{ color: themeColor || "var(--primary-theme)" }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5,3.06C5,3 5.04,3 5.08,3.03L15.93,12.06L5.08,21.09C5.04,21.12 5,21.11 5,21.06V3.06M16.9,12.87L19.46,14.3C20.19,14.71 20.19,15.77 19.46,16.18L16.9,17.61L16.15,12.87M17.84,11.5L20.4,12.93C21.13,13.34 21.13,14.4 20.4,14.81L17.84,16.24L17.09,11.5M15.93,12.06L5.08,3.03C5.04,3 5,3.04 5,3.08V11.5L15.93,12.06Z" />
                </svg>
            ),
            link: googlePlayUrl || "#",
            actionText: isPlayStoreDisabled ? "Not Available" : "Get on Google Play",
            badge: isPlayStoreDisabled ? "Unavailable" : "Available",
            isDisabled: isPlayStoreDisabled
        },
        {
            platform: "iOS Device",
            store: "Apple App Store",
            description: "Install the premium Apple edition of E-Mapandan optimized specifically for iPhone and iPad devices.",
            icon: (
                <svg className="w-8 h-8 transition-colors" style={{ color: themeColor || "var(--primary-theme)" }} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.1,16.67C20.08,16.74 19.67,18.11 18.71,19.5M15.97,4.17C16.63,3.37 17.07,2.28 16.95,1C16,1.04 14.9,1.6 14.24,2.38C13.68,3.04 13.19,4.14 13.34,5.39C14.39,5.47 15.4,4.88 15.97,4.17Z" />
                </svg>
            ),
            link: appStoreUrl || "#",
            actionText: isAppStoreDisabled ? "Coming Soon" : "Get on App Store",
            badge: isAppStoreDisabled ? "Development Mode" : "Available",
            isDisabled: isAppStoreDisabled
        },
        {
            platform: "Direct Installation",
            store: "Download APK Package",
            description: "Download the application file directly to bypass app stores. Perfect for offline installations.",
            icon: <Cpu className="w-8 h-8" style={{ color: themeColor || "var(--primary-theme)" }} />,
            link: apkDownloadUrl || "#",
            actionText: isApkDisabled ? "Not Available" : "Download APK File",
            badge: isApkDisabled ? "Unavailable" : "Direct Download",
            isDisabled: isApkDisabled
        }
    ];

    const gridClass = "grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-6 md:mt-16";

    return (
        <section id="app-download" className="pt-8 md:pt-8 pb-6 md:pb-12 px-6 max-w-7xl mx-auto">
            {/* Header section styled exactly like other sections */}
            <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-0">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: themeColor || "var(--primary-theme)" }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: themeColor || "var(--primary-theme)" }}>Go Mobile</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Download <span style={{ color: themeColor || "var(--primary-theme)" }}>Mobile Apps</span>
                    </h2>
                </div>
                <div className="hidden md:flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-[9px] italic bg-slate-50 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 px-4 py-2 rounded-full shadow-sm">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    Official Government App Distribution
                </div>
            </div>

            {isMobile ? (
                <div className={gridClass}>
                    {apps.map((app, idx) => (
                        <AppCard key={idx} app={app} themeColor={themeColor} isMobile={isMobile} />
                    ))}
                </div>
            ) : (
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "100px" }}
                    variants={{
                        hidden: {},
                        visible: { transition: { staggerChildren: 0.1 } }
                    }}
                    className={gridClass}
                >
                    {apps.map((app, idx) => (
                        <AppCard key={idx} app={app} themeColor={themeColor} isMobile={isMobile} />
                    ))}
                </motion.div>
            )}
        </section>
    );
}

function AppCard({ app, themeColor, isMobile }: { app: any; themeColor?: string; isMobile: boolean }) {
    const isDevelopment = app.isDisabled;
    const cardClasses = `group bg-white dark:bg-[#0f1117] rounded-2xl md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none hover:-translate-y-2 transition-all duration-300 overflow-hidden relative flex flex-col h-full ${
        isDevelopment ? "opacity-60" : "hover:border-primary"
    }`;

    const content = (
        <div className="p-6 md:p-8 flex flex-col h-full relative z-10">
            {/* Top-right subtle glow */}
            <div 
                className="absolute top-0 right-0 w-24 h-24 blur-2xl -mr-12 -mt-12 transition-all opacity-10 group-hover:opacity-25 pointer-events-none rounded-full" 
                style={{ backgroundColor: themeColor || "var(--primary-theme)" }}
            />

            {/* Platform & Badge Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center border border-slate-100 dark:border-white/5 group-hover:bg-primary/5 transition-colors">
                    {app.icon}
                </div>
                <span className={`text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                    isDevelopment
                        ? "bg-slate-50 text-slate-400 border-slate-200/50 dark:bg-white/5 dark:text-slate-400 dark:border-white/5"
                        : app.badge === "Direct Download"
                            ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                }`}>
                    {app.badge}
                </span>
            </div>

            {/* Text details */}
            <div className="space-y-2 flex-grow">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">
                    {app.platform}
                </span>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none group-hover:text-primary transition-colors">
                    {app.store}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed pt-2">
                    {app.description}
                </p>
            </div>

            {/* Interactive Footer Button */}
            <div className="pt-8 mt-auto">
                <a href={app.link} target={app.link.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={isDevelopment ? "pointer-events-none w-full" : "w-full"}>
                    <Button
                        disabled={isDevelopment}
                        style={{ 
                            backgroundColor: isDevelopment ? undefined : themeColor || "var(--primary-theme)",
                            borderColor: isDevelopment ? undefined : themeColor || "var(--primary-theme)",
                            color: isDevelopment ? undefined : "white"
                        }}
                        className={`w-full py-4 h-auto rounded-[2rem] font-black uppercase tracking-widest text-[9px] md:text-[10px] flex items-center justify-center gap-2 border-2 transition-all ${
                            isDevelopment 
                                ? "bg-slate-100 dark:bg-white/5 border-transparent text-slate-400 cursor-not-allowed"
                                : "hover:opacity-90 shadow-lg shadow-primary/20 active:scale-95 group-hover:translate-x-0.5"
                        }`}
                    >
                        {app.actionText}
                        {isDevelopment ? null : app.badge === "Direct Download" ? (
                            <Download className="w-3.5 h-3.5" />
                        ) : (
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                    </Button>
                </a>
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <div className={cardClasses} style={{ "--primary-theme": themeColor } as any}>
                {content}
            </div>
        );
    }

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
            }}
            className={cardClasses}
            style={{ "--primary-theme": themeColor } as any}
        >
            {content}
        </motion.div>
    );
}
