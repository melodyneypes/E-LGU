"use client";

import React from "react";
import {
    Home,
    Activity,
    Sparkles,
    User,
    FileText,
    Calendar,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

interface RHUClientProps {
    transactionTypes: any[];
    themeColor: string;
}

const STEPS = [
    { id: "STATUS", label: "STATUS", icon: Sparkles },
    { id: "IDENTITY", label: "IDENTITY", icon: User },
    { id: "DETAILS", label: "DETAILS", icon: FileText },
    { id: "SCHEDULE", label: "SCHEDULE", icon: Calendar },
    { id: "SUBMIT", label: "SUBMIT", icon: CheckCircle2 },
];

export function RHUClient({
    transactionTypes,
    themeColor
}: RHUClientProps) {
    const router = useRouter();

    const medicalCertType = transactionTypes.find((t) => t.code === "RHU_MEDICAL_CERT");
    const fallbackType = medicalCertType || {
        id: "rhu-default-service",
        code: "RHU_MEDICAL_CERT",
        baseFee: 50,
        name: "Medical Consultation & Health Certificate"
    };

    const activeServices = [
        {
            db: fallbackType,
            code: "RHU_MEDICAL_CERT",
            title: "Medical Check-up / Consultation",
            desc: "Book an appointment for a clinical check-up, general consultation, or pre-marital medical screening at the Rural Health Unit (RHU).",
            icon: Activity,
            color: "text-rose-500 bg-rose-500/10",
            borderColor: "border-rose-500/20",
            accentBg: "bg-rose-500/5",
            reqs: ["Valid Government ID", "Previous Medical Records / Mother's Book (if any)"],
            fee: `₱${fallbackType.baseFee?.toFixed(2) || "50.00"}`,
            time: "Scheduled Date & Time"
        }
    ];

    return (
        <div className="container max-w-5xl mx-auto px-4 pt-0 pb-32 space-y-12">
            <style dangerouslySetInnerHTML={{
                __html: `
                .theme-icon-bg {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important;
                }
                .theme-icon-text {
                    color: ${themeColor} !important;
                }
                .theme-text-hover:hover {
                    color: ${themeColor} !important;
                }
                .theme-bg-hover:hover {
                    background-color: ${themeColor} !important;
                    border-color: ${themeColor} !important;
                }
                `
            }} />

            {/* Breadcrumbs */}
            <div className="space-y-4 md:space-y-10">
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                    <Breadcrumb>
                        <BreadcrumbList className="flex-nowrap whitespace-nowrap overflow-x-auto scrollbar-none max-w-full bg-white/80 dark:bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-200/60 dark:border-white/5 w-full md:w-fit shadow-sm">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                        <Home className="w-3.5 h-3.5 mb-0.5" />
                                        Home
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/user/services" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors italic">
                                        Services
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator className="text-slate-300 dark:text-white/10" />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: themeColor }}>Rural Health Unit</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                            RURAL HEALTH <span className="text-primary underline decoration-[6px] md:decoration-8 decoration-primary/20 underline-offset-[6px] md:underline-offset-[12px]" style={{ textDecorationColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33` }}>UNIT</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">Municipal Health Office (MHO) Services</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper */}
            <div className="grid grid-cols-5 gap-1.5 md:gap-4 relative px-1 md:px-2">
                {STEPS.map((step, idx) => {
                    const isActive = step.id === "STATUS";
                    const Icon = step.icon;
                    return (
                        <div
                            key={idx}
                            className={cn(
                                "flex flex-col items-center gap-2 md:gap-3 relative z-10 font-black cursor-pointer group",
                                !isActive && "opacity-50 pointer-events-none"
                            )}
                        >
                            <div
                                className={cn(
                                    "w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center transition-all duration-500 border-2",
                                    isActive ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-105 md:scale-110" : "bg-slate-100 dark:bg-white/5 text-slate-400 border-transparent"
                                )}
                                style={isActive ? { backgroundColor: themeColor, borderColor: themeColor } : {}}
                            >
                                <Icon className="w-4 h-4 md:w-7 md:h-7" />
                            </div>
                            <span
                                className={cn(
                                    "text-[7px] md:text-[10px] uppercase tracking-widest text-center italic hidden sm:block",
                                    isActive ? "text-primary opacity-100 font-black" : "opacity-40"
                                )}
                                style={isActive ? { color: themeColor } : {}}
                            >
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[300px]">
                <div className="space-y-8 md:space-y-12">
                    <div className="space-y-3 md:space-y-4 text-center">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight select-none">
                            Choose Application <span className="theme-icon-text">Pathway</span>
                        </h2>
                        <p className="text-slate-500 font-medium italic text-xs md:text-sm uppercase tracking-widest max-w-2xl mx-auto select-none">
                            Select a rural health unit service to proceed.
                        </p>
                    </div>

                    {/* Available Services Section Header */}
                    <div className="space-y-6 max-w-6xl mx-auto w-full">
                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4 select-none">
                            <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: themeColor }} />
                            <div>
                                <h3 className="text-lg md:text-2xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-white leading-none mb-1.5">
                                    Available Services
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">
                                    Select a rural health unit service to proceed
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Services Cards */}
                    <div className="flex flex-wrap justify-center gap-6 max-w-6xl mx-auto">
                        {activeServices.map((service) => {
                            const Icon = service.icon;
                            return (
                                <div
                                    key={service.code}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => router.push(`/user/services/rural-health-unit/${service.db.id}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            router.push(`/user/services/rural-health-unit/${service.db.id}`);
                                        }
                                    }}
                                    className="w-full max-w-md p-6 md:p-8 rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md flex flex-col justify-between min-h-[340px] hover:border-primary/40 hover:scale-[1.02] hover:shadow-xl transition-all duration-300 group cursor-pointer select-none"
                                >
                                    <div className="space-y-6">
                                        {/* Header */}
                                        <div className="flex justify-between items-start">
                                            <div className="w-12 h-12 rounded-xl flex items-center justify-center theme-icon-bg">
                                                <Icon className="w-6 h-6 theme-icon-text" />
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-3 py-1 rounded-full italic">
                                                    {service.time}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-slate-100 leading-none">
                                                {service.title}
                                            </h3>
                                            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold tracking-tight italic leading-relaxed">
                                                {service.desc}
                                            </p>
                                        </div>

                                        {/* Requirements */}
                                        <div className="space-y-1.5">
                                            <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 block italic">Requirements:</span>
                                            <ul className="text-[10px] font-bold text-slate-500 dark:text-slate-400 space-y-1">
                                                {service.reqs.map((req, i) => (
                                                    <li key={i} className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 shrink-0" />
                                                        <span>{req}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Action & Fee */}
                                    <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between mt-6">
                                        <div className="flex flex-col">
                                            <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1 italic">Service Fee</span>
                                            <span className="text-lg font-black text-slate-800 dark:text-white font-mono">{service.fee}</span>
                                        </div>
                                        <Button
                                            onClick={() => router.push(`/user/services/rural-health-unit/${service.db.id}`)}
                                            style={{ backgroundColor: themeColor }}
                                            className="h-10 px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg active:scale-95 transition-all border-none"
                                        >
                                            Book Appointment
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
