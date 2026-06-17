"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Service {
    id: string;
    code: string;
    name: string;
    description: string;
    fee: number;
}

interface ServicesProps {
    services: Service[];
    themeColor?: string;
    isMaintenanceActive?: boolean;
}

export function Services({ services = [], themeColor, isMaintenanceActive = false }: ServicesProps) {
    const displayServices = services.length > 0 ? services : [];
    const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const gridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8 mt-6 md:mt-16";

    return (
        <section id="services" className="pt-8 md:pt-8 pb-6 md:pb-12 px-6 max-w-7xl mx-auto">
            <div className="sticky md:static top-16 sm:top-20 md:top-auto z-40 md:z-auto pb-4 pt-6 -mx-6 px-6 md:mx-0 md:px-0 bg-white dark:bg-slate-950 md:bg-transparent md:dark:bg-transparent backdrop-blur-none flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 border-b border-slate-200/50 dark:border-white/5 md:border-none shadow-sm md:shadow-none mb-6 md:mb-0">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: themeColor || "var(--primary-theme)" }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]" style={{ color: themeColor || "var(--primary-theme)" }}>Public Portal</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                        Services
                    </h2>
                </div>
            </div>

            {displayServices.length === 0 ? (
                <div className="py-20 text-center bg-slate-50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/10 italic mt-6 md:mt-16">
                    <ShieldCheck className="w-12 h-12 text-slate-200 dark:text-white/5 mx-auto mb-4" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">No Active Services Published</h3>
                    <p className="text-slate-500 font-medium text-sm mt-1">Select a specific Barangay to view available community services.</p>
                </div>
            ) : (
                isMobile ? (
                    <div className={gridClass}>
                        {displayServices.map((service) => (
                            <ServiceCard key={service.id} service={service} themeColor={themeColor} isMobile={isMobile} isMaintenanceActive={isMaintenanceActive} />
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
                        {displayServices.map((service) => (
                            <ServiceCard key={service.id} service={service} themeColor={themeColor} isMobile={isMobile} isMaintenanceActive={isMaintenanceActive} />
                        ))}
                    </motion.div>
                )
            )}

            <div className="flex justify-center mt-8 md:mt-12">
                {!isMaintenanceActive && (
                    <Link href="/user/services" className="w-full md:w-auto">
                        <Button 
                            style={{ 
                                backgroundColor: themeColor || "var(--primary-theme)",
                                borderColor: themeColor || "var(--primary-theme)",
                                color: "white"
                            }}
                            className="rounded-[2rem] px-8 py-3.5 md:px-12 md:py-5 font-black uppercase tracking-widest text-[9px] md:text-[10px] h-auto gap-2 md:gap-3 border-2 transition-all hover:opacity-90 shadow-xl shadow-primary/20 w-full md:w-[400px] flex items-center justify-center"
                        >
                            Access All Services
                            <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </Button>
                    </Link>
                )}
            </div>
        </section>
    );
}

function ServiceCard({ service, themeColor, isMobile, isMaintenanceActive }: { service: Service; themeColor?: string; isMobile: boolean; isMaintenanceActive?: boolean }) {
    const cardClasses = `${isMaintenanceActive ? "opacity-60 pointer-events-none" : "group hover:border-blue-500 hover:-translate-y-2"} bg-white dark:bg-[#0f1117] rounded-2xl md:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all overflow-hidden relative`;
    
    const content = (
        <Link 
            href={
                isMaintenanceActive
                    ? "#"
                    : service.code.startsWith("CEDULA") 
                        ? "/user/services/cedula" 
                        : service.code.startsWith("BUSINESS_PERMIT")
                            ? "/user/services/business-permit"
                            : service.code === "CIVIL_REGISTRY"
                                ? "/user/services/civil-registry"
                                : service.code === "BUILDING_PERMIT"
                                    ? "/user/services/building-permit"
                                    : `/user/services/${service.id}`
            } 
            className="block p-5 md:p-8 h-full"
        >
            <div 
                className="absolute top-0 right-0 w-20 md:w-24 h-20 md:h-24 blur-2xl -mr-10 -mt-10 md:-mr-12 md:-mt-12 transition-all opacity-10 group-hover:opacity-20 pointer-events-none" 
                style={{ backgroundColor: themeColor || "var(--primary-theme)" }}
            />
            
            <div className="relative z-10">
                <div className="space-y-1.5 md:space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <h3 
                            className="text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-tight transition-colors"
                            style={{ "--hover-color": themeColor || "var(--primary-theme)" } as any}
                        >
                            {service.name === "Community Tax Certificate - Individual" ? "Community Tax Certificate" : service.name}
                        </h3>
                        {isMaintenanceActive && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-amber-500/20 shrink-0">
                                Offline
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        {service.description}
                    </p>
                </div>
            </div>
        </Link>
    );

    if (isMobile) {
        return (
            <div className={cardClasses}>
                {content}
            </div>
        );
    }

    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
            className={cardClasses}
        >
            {content}
        </motion.div>
    );
}
