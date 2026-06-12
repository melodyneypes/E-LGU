"use client";

import React from "react";
import {
    Baby,
    Skull,
    Heart,
    FileText,
    Sparkles,
    Home,
    User,
    Upload,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { getSystemSettingAction } from "@/app/admin/transactions/actions";

const REGISTRY_TYPES = [
    {
        id: "BIRTH_REQ",
        label: "Birth Certificate Request (True Copy)",
        icon: FileText,
        description: "Request a certified true copy of an existing birth certificate.",
        color: "blue",
        href: "/user/services/civil-registry/birth-certificate-request",
        available: true
    },
    {
        id: "BIRTH_REG",
        label: "Birth Registration",
        icon: Baby,
        description: "Register a new birth record (timely or late registration).",
        color: "blue",
        href: "/user/services/civil-registry/birth-registration",
        available: true
    },
    {
        id: "PSA_ENDORSEMENT",
        label: "Birth PSA Endorsement",
        icon: FileText,
        description: "Request endorsement of a verified local birth certificate record to the PSA.",
        color: "blue",
        href: "/user/services/civil-registry/birth-psa-endorsement",
        available: true
    },
    {
        id: "DEATH_PSA_ENDORSEMENT",
        label: "Death PSA Endorsement",
        icon: FileText,
        description: "Request endorsement of a verified local death certificate record to the PSA.",
        color: "slate",
        href: "/user/services/civil-registry/death-psa-endorsement",
        available: true
    },
    {
        id: "DEATH_REQ",
        label: "Death Certificate Request (True Copy)",
        icon: FileText,
        description: "Request a certified true copy of an existing death certificate.",
        color: "slate",
        href: "/user/services/civil-registry/death-certificate-request",
        available: true
    },
    {
        id: "DEATH",
        label: "Death Registration",
        icon: Skull,
        description: "Register a Death or Request a Certified Death Certificate.",
        color: "slate",
        href: "/user/services/civil-registry/death-registration",
        available: true
    },
    {
        id: "MARRIAGE_REQ",
        label: "Marriage Certificate Request (True Copy)",
        icon: FileText,
        description: "Request a certified true copy of an existing marriage certificate.",
        color: "rose",
        href: "/user/services/civil-registry/marriage-certificate-request",
        available: true
    },
    {
        id: "MARRIAGE",
        label: "Marriage Registration",
        icon: Heart,
        description: "Request a certified copy of a Marriage Certificate.",
        color: "rose",
        href: "/user/services/civil-registry/marriage-registration",
        available: true
    },
    {
        id: "MARRIAGE_LICENSE",
        label: "Marriage License Application",
        icon: FileText,
        description: "Apply for a legal license to be married in the Philippines.",
        color: "amber",
        href: "/user/services/civil-registry/marriage-license-application",
        available: true
    },
];

const STEPS = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "IDENTITY", label: "Identity", icon: User },
    { id: "DETAILS", label: "Details", icon: FileText },
    { id: "DOCUMENTS", label: "Documents", icon: Upload },
    { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

const REGISTRY_SECTIONS = [
    {
        title: "Birth Registry Services",
        subtitle: "Registration & Certified Copies & Endorsements",
        items: ["BIRTH_REG", "BIRTH_REQ", "PSA_ENDORSEMENT"]
    },
    {
        title: "Death Registry Services",
        subtitle: "Registration & Certified True Copy Requests",
        items: ["DEATH", "DEATH_REQ", "DEATH_PSA_ENDORSEMENT"]
    },
    {
        title: "Marriage Registry & Licenses",
        subtitle: "License Applications, Registrations & Certified Copies",
        items: ["MARRIAGE_LICENSE", "MARRIAGE", "MARRIAGE_REQ"]
    }
];

export default function CivilRegistryPage() {
    const [themeColor, setThemeColor] = React.useState("theme_color");

    React.useEffect(() => {
        getSystemSettingAction("theme_color").then((res) => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });
    }, []);

    return (
        <div className="container max-w-5xl mx-auto px-4 pt-0 pb-32 space-y-12">
            <style dangerouslySetInnerHTML={{
                __html: `
                .theme-icon-bg {
                    background-color: ${themeColor}1a !important; /* 10% opacity */
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
                .theme-border-hover:hover {
                    border-color: ${themeColor} !important;
                }
                `
            }} />

            {/* Breadcrumbs */}
            <div className="space-y-4 md:space-y-10">
                <div className="sticky top-[64px] sm:top-[80px] z-40 md:static -mx-4 md:mx-0 px-4 md:px-0 pt-2 md:pt-0">
                    <Breadcrumb>
                        <BreadcrumbList className="bg-white/80 dark:bg-white/5 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-200/60 dark:border-white/5 w-fit shadow-sm">
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic text-emerald-700 dark:text-emerald-400">Civil Registry</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                            CIVIL <span className="text-primary underline decoration-[6px] md:decoration-8 decoration-primary/20 underline-offset-[6px] md:underline-offset-[12px]" style={{ textDecorationColor: `${themeColor}33` }}>REGISTRY</span>
                        </h1>
                        <p className="text-[9px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] ml-1 md:ml-2 italic">Local Civil Registry (LCR) Services</p>
                    </div>
                </div>
            </div>

            {/* Progress Stepper (Mocked consistent with CEDULA and Business Permit) */}
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

            {/* Step Content */}
            <div className="mt-4 md:mt-8 md:bg-white md:dark:bg-[#11131a] md:rounded-[2.5rem] md:border md:border-slate-200 md:dark:border-white/10 p-0 md:p-12 md:shadow-2xl relative md:overflow-hidden group/container min-h-[400px] md:min-h-[500px] flex flex-col">
                <div className="flex-1 space-y-8 md:space-y-12">
                    <div className="space-y-3 md:space-y-4 text-center">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter leading-tight select-none">
                            Choose Application <span className="theme-icon-text">Pathway</span>
                        </h2>
                        <p className="text-slate-500 font-medium italic text-xs md:text-sm uppercase tracking-widest max-w-2xl mx-auto select-none">
                            Select a civil registry service to proceed.
                        </p>
                    </div>

                    {/* Civil Registry Sections */}
                    <div className="space-y-16 max-w-6xl mx-auto w-full">
                        {REGISTRY_SECTIONS.map((section) => {
                            const sectionItems = section.items
                                .map(id => REGISTRY_TYPES.find(t => t.id === id))
                                .filter(Boolean) as typeof REGISTRY_TYPES;

                            return (
                                <div key={section.title} className="space-y-6">
                                    {/* Section Header */}
                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4 select-none">
                                        <div className="w-1.5 h-8 rounded-full transition-colors duration-500" style={{ backgroundColor: themeColor }} />
                                        <div>
                                            <h3 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter text-slate-800 dark:text-slate-100 leading-none">
                                                {section.title}
                                            </h3>
                                            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2 italic">
                                                {section.subtitle}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Cards Grid for Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {sectionItems.map((type) => {
                                            const Icon = type.icon;
                                            
                                            const cardContent = (
                                                <div className={cn(
                                                    "p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border-2 transition-all duration-300 text-left relative group select-none overflow-hidden flex flex-col justify-between min-h-[220px] cursor-pointer bg-white/40 dark:bg-white/5 backdrop-blur-md border-slate-200 dark:border-white/10 hover:border-primary/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5",
                                                    !type.available && "opacity-60 cursor-not-allowed"
                                                )}>
                                                    <div className="flex justify-between items-start w-full">
                                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 theme-icon-bg">
                                                            <Icon className="w-5 h-5 stroke-[2.5] theme-icon-text" />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1.5 mt-6">
                                                        <h4 className="text-base md:text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-tight">
                                                            {type.label}
                                                        </h4>
                                                        <p className="text-[9px] md:text-[10px] font-bold uppercase italic tracking-widest text-slate-400 dark:text-slate-500 leading-relaxed">
                                                            {type.description}
                                                        </p>
                                                    </div>
                                                </div>
                                            );

                                            if (type.available) {
                                                return (
                                                    <Link href={type.href} key={type.id} className="block h-full">
                                                        {cardContent}
                                                    </Link>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={type.id}
                                                    onClick={() => {
                                                        if (type.id === "PSA_ENDORSEMENT") {
                                                            toast.info("Birth PSA Endorsement can be requested from your completed Birth Certificate Request details page if the local record is found (Form 1A).");
                                                        } else {
                                                            toast.info(`${type.label} is currently under development.`);
                                                        }
                                                    }}
                                                    className="block h-full"
                                                >
                                                    {cardContent}
                                                </div>
                                            );
                                        })}
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
