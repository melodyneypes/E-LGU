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
    CheckCircle2,
    Scroll,
    FileSignature,
    HeartHandshake
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { getSystemSettingAction, getCurrentUserResident, getTransactionTypes } from "@/app/admin/transactions/actions";
import { supabase } from "@/lib/supabase";

const REGISTRY_TYPES = [
    {
        id: "BIRTH_REQ",
        label: "Birth Certificate Request (True Copy)",
        icon: Scroll,
        description: "Request a certified true copy of an existing birth certificate.",
        color: "blue",
        href: "/user/services/civil-registry/birth-certificate-request",
        available: true,
        code: "LCR_BIRTH"
    },
    {
        id: "BIRTH_REG",
        label: "Birth Registration",
        icon: Baby,
        description: "Register a new birth record (timely or late registration).",
        color: "blue",
        href: "/user/services/civil-registry/birth-registration",
        available: true,
        code: "LCR_BIRTH_REG"
    },
    {
        id: "PSA_ENDORSEMENT",
        label: "Birth PSA Endorsement",
        icon: FileSignature,
        description: "Request endorsement of a verified local birth certificate record to the PSA.",
        color: "blue",
        href: "/user/services/civil-registry/birth-psa-endorsement",
        available: true,
        code: "LCR_PSA_ENDORSEMENT"
    },
    {
        id: "DEATH_PSA_ENDORSEMENT",
        label: "Death PSA Endorsement",
        icon: FileSignature,
        description: "Request endorsement of a verified local death certificate record to the PSA.",
        color: "slate",
        href: "/user/services/civil-registry/death-psa-endorsement",
        available: true,
        code: "LCR_DEATH_PSA_ENDORSEMENT"
    },
    {
        id: "DEATH_REQ",
        label: "Death Certificate Request (True Copy)",
        icon: Scroll,
        description: "Request a certified true copy of an existing death certificate.",
        color: "slate",
        href: "/user/services/civil-registry/death-certificate-request",
        available: true,
        code: "LCR_DEATH"
    },
    {
        id: "DEATH",
        label: "Death Registration",
        icon: Skull,
        description: "Register a Death or Request a Certified Death Certificate.",
        color: "slate",
        href: "/user/services/civil-registry/death-registration",
        available: true,
        code: "LCR_DEATH_REG"
    },
    {
        id: "MARRIAGE_REQ",
        label: "Marriage Certificate Request (True Copy)",
        icon: Scroll,
        description: "Request a certified true copy of an existing marriage certificate.",
        color: "rose",
        href: "/user/services/civil-registry/marriage-certificate-request",
        available: true,
        code: "LCR_MARRIAGE"
    },
    {
        id: "MARRIAGE_PSA_ENDORSEMENT",
        label: "Marriage PSA Endorsement",
        icon: FileSignature,
        description: "Request endorsement of a verified local marriage certificate record to the PSA.",
        color: "rose",
        href: "/user/services/civil-registry/marriage-psa-endorsement",
        available: true,
        code: "LCR_MARRIAGE_PSA_ENDORSEMENT"
    },
    {
        id: "MARRIAGE",
        label: "Marriage Registration",
        icon: Heart,
        description: "Request a certified copy of a Marriage Certificate.",
        color: "rose",
        href: "/user/services/civil-registry/marriage-registration",
        available: true,
        code: "LCR_MARRIAGE_REG"
    },
    {
        id: "MARRIAGE_LICENSE",
        label: "Marriage License Application",
        icon: HeartHandshake,
        description: "Apply for a legal license to be married in the Philippines.",
        color: "amber",
        href: "/user/services/civil-registry/marriage-license-application",
        available: true,
        code: "LCR_MARRIAGE_LICENSE"
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
        items: ["MARRIAGE_LICENSE", "MARRIAGE", "MARRIAGE_REQ", "MARRIAGE_PSA_ENDORSEMENT"]
    }
];

export default function CivilRegistryPage() {
    const [themeColor, setThemeColor] = React.useState("var(--primary-theme)");
    const [resident, setResident] = React.useState<any>(null);
    const [activeCodes, setActiveCodes] = React.useState<Set<string> | null>(null);

    React.useEffect(() => {
        getSystemSettingAction("theme_color").then((res) => {
            if (res.success && res.data) {
                setThemeColor(res.data);
            }
        });
        getCurrentUserResident().then((res) => {
            if (res.success && res.data) {
                setResident(res.data);
            }
        });

        const fetchActiveCodes = () => {
            getTransactionTypes().then((res) => {
                if (res.success && res.data) {
                    const codes = new Set(res.data.map((t: any) => t.code as string));
                    setActiveCodes(codes);
                } else {
                    setActiveCodes(new Set());
                }
            });
        };

        fetchActiveCodes();

        if (!supabase) return;

        console.log("Subscribing to Supabase Realtime 'TransactionType' table for civil registry...");
        let channel: any;
        try {
            channel = supabase
                .channel("realtime-civil-registry-services")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "TransactionType",
                    },
                    (payload: any) => {
                        console.log("Realtime change caught on TransactionType table:", payload);
                        fetchActiveCodes();
                    }
                )
                .subscribe((status: string, err?: any) => {
                    if (err) {
                        console.warn("Supabase Realtime TransactionType subscription error:", err);
                    }
                });
        } catch (error) {
            console.warn("Failed to initialize Supabase Realtime TransactionType subscription:", error);
        }

        return () => {
            console.log("Unsubscribing from Supabase Realtime 'TransactionType' table...");
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const isMinor = React.useMemo(() => {
        if (!resident) return false;
        if (resident.dateOfBirth) {
            const birthDate = new Date(resident.dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (age < 0) return false;
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age < 18;
        }
        if (resident.age !== undefined && resident.age !== null) {
            return resident.age < 18;
        }
        return false;
    }, [resident]);

    return (
        <div className="container max-w-5xl mx-auto px-4 pt-0 pb-32 space-y-12">
            <style dangerouslySetInnerHTML={{
                __html: `
                .theme-icon-bg {
                    background-color: ${themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 10%, transparent)" : `${themeColor}1a`} !important; /* 10% opacity */
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
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest italic" style={{ color: themeColor }}>Civil Registry</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-1 md:px-0">
                    <div className="space-y-1 md:space-y-2">
                        <h1 className="text-4xl md:text-7xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                            CIVIL <span className="text-primary underline decoration-[6px] md:decoration-8 decoration-primary/20 underline-offset-[6px] md:underline-offset-[12px]" style={{ textDecorationColor: themeColor === "var(--primary-theme)" ? "color-mix(in srgb, var(--primary-theme) 20%, transparent)" : `${themeColor}33` }}>REGISTRY</span>
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
                        {activeCodes === null ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" style={{ borderColor: themeColor }} />
                            </div>
                        ) : (
                            REGISTRY_SECTIONS.map((section) => {
                                const sectionItems = section.items
                                    .map(id => REGISTRY_TYPES.find(t => t.id === id))
                                    .filter(Boolean) as typeof REGISTRY_TYPES;

                                // Filter out inactive services
                                const activeItems = sectionItems.filter(type => activeCodes.has(type.code));

                                if (activeItems.length === 0) return null;

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
                                            {activeItems.map((type) => {
                                                const Icon = type.icon;
                                                const isMarriageService = type.id === "MARRIAGE" || type.id === "MARRIAGE_LICENSE";
                                                const isBlockedForMinor = isMinor && isMarriageService;

                                                const cardContent = (
                                                    <div className={cn(
                                                        "p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border-2 transition-all duration-300 text-left relative group select-none overflow-hidden flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 justify-start md:justify-between min-h-[100px] md:min-h-[220px] cursor-pointer bg-white/40 dark:bg-white/5 backdrop-blur-md border-slate-200 dark:border-white/10 hover:border-primary/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-primary/5",
                                                        (!type.available || isBlockedForMinor) && "opacity-60 cursor-not-allowed"
                                                    )}>
                                                        <div className="flex justify-between items-start w-auto md:w-full shrink-0">
                                                            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 theme-icon-bg">
                                                                <Icon className="w-4.5 h-4.5 md:w-5 md:h-5 stroke-[2.5] theme-icon-text" />
                                                            </div>
                                                            {isBlockedForMinor && (
                                                                <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full italic animate-pulse">
                                                                    18+ Required
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1.5 mt-0 md:mt-6">
                                                            <h4 className="text-base md:text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-tight">
                                                                {type.label}
                                                            </h4>
                                                            <p className="text-[9px] md:text-[10px] font-bold uppercase italic tracking-widest text-slate-400 dark:text-slate-500 leading-relaxed">
                                                                {isBlockedForMinor ? "Not available for minors. You must be at least 18 years old to apply." : type.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );

                                                if (type.available && !isBlockedForMinor) {
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
                                                            if (isBlockedForMinor) {
                                                                toast.error("Application Blocked: You must be at least 18 years old to apply for marriage services.");
                                                            } else if (type.id === "PSA_ENDORSEMENT") {
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
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
