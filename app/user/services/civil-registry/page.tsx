"use client";

import React from "react";
import {
    FileText,
    Sparkles,
    Home,
    User,
    Upload,
    CheckCircle2,
    FileSignature,
    Calendar,
    Star
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { getSystemSettingAction, getCurrentUserResident, getTransactionTypes, ensureCivilRegistryTransactionTypes } from "@/app/admin/transactions/actions";
import { supabase } from "@/lib/supabase";
import { getCivilRegistryFeedbacksAction } from "./actions";
import CivilRegistryReviewsTab from "./_components/CivilRegistryReviewsTab";

const REGISTRY_TYPES = [
    {
        id: "PSA_APPOINTMENT_ENDORSEMENT",
        label: "Birth Certified True Copy Appointment",
        icon: FileSignature,
        description: "Schedule an appointment to request a certified true copy of an existing birth certificate.",
        color: "blue",
        href: "/user/services/civil-registry/appointment-birth-certified-true-copy",
        available: true,
        code: "LCR_BIRTH_CERTIFIED_TRUE_COPY_APPOINTMENT"
    },
    {
        id: "DEATH_PSA_APPOINTMENT_ENDORSEMENT",
        label: "Death Certified True Copy Appointment",
        icon: FileSignature,
        description: "Schedule an appointment to request a certified true copy of an existing death certificate.",
        color: "slate",
        href: "/user/services/civil-registry/appointment-death-certified-true-copy",
        available: true,
        code: "LCR_DEATH_CERTIFIED_TRUE_COPY_APPOINTMENT"
    },
    {
        id: "MARRIAGE_PSA_APPOINTMENT_ENDORSEMENT",
        label: "Marriage Certified True Copy Appointment",
        icon: FileSignature,
        description: "Schedule an appointment to request a certified true copy of an existing marriage certificate.",
        color: "rose",
        href: "/user/services/civil-registry/appointment-marriage-certified-true-copy",
        available: true,
        code: "LCR_MARRIAGE_CERTIFIED_TRUE_COPY_APPOINTMENT"
    },
];

const STEPS = [
    { id: "STATUS", label: "Status", icon: Sparkles },
    { id: "IDENTITY", label: "Identity", icon: User },
    { id: "DETAILS", label: "Details", icon: FileText },
    { id: "DOCUMENTS", label: "Documents", icon: Upload },
    { id: "SUBMIT", label: "Submit", icon: CheckCircle2 },
];

export default function CivilRegistryPage() {
    const [themeColor, setThemeColor] = React.useState("var(--primary-theme)");
    const [resident, setResident] = React.useState<any>(null);
    const [activeCodes, setActiveCodes] = React.useState<Set<string> | null>(null);
    const [activeMainTab, setActiveMainTab] = React.useState<"SERVICES" | "REVIEWS">("SERVICES");
    const [feedbacks, setFeedbacks] = React.useState<any[]>([]);
    const [initialPagination, setInitialPagination] = React.useState({
        page: 1,
        limit: 12,
        totalCount: 0,
        hasMore: false,
        remainingCount: 0
    });
    const [feedbackStats, setFeedbackStats] = React.useState<{
        totalFeedbacks: number;
        averageRating: number;
        csatPercentage: number;
        ratingCounts: Record<string, number>;
    }>({
        totalFeedbacks: 0,
        averageRating: 0,
        csatPercentage: 0,
        ratingCounts: { FIVE: 0, FOUR: 0, THREE: 0, TWO: 0, ONE: 0 }
    });

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
        getCivilRegistryFeedbacksAction({ page: 1, limit: 12 }).then((res) => {
            if (res.success) {
                setFeedbacks(res.data || []);
                if (res.stats) {
                    setFeedbackStats(res.stats);
                }
                if (res.pagination) {
                    setInitialPagination(res.pagination);
                }
            }
        });

        const fetchActiveCodes = async (runSeederIfMissing = true) => {
            getTransactionTypes().then((res) => {
                if (res.success && res.data) {
                    const codes = new Set(res.data.map((t: any) => t.code as string));
                    setActiveCodes(codes);

                    if (runSeederIfMissing) {
                        const expectedCodes = REGISTRY_TYPES.map(type => type.code);
                        const hasAllCodes = expectedCodes.every(code => codes.has(code));
                        if (!hasAllCodes) {
                            ensureCivilRegistryTransactionTypes()
                                .catch((e) => console.error("Failed to ensure LCR types:", e))
                                .finally(() => fetchActiveCodes(false));
                        }
                    }
                } else {
                    setActiveCodes(new Set());
                }
            });
        };

        // Fetch immediately and run seeder if any are missing
        fetchActiveCodes(true);

        if (!supabase) return;

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
                    () => {
                        fetchActiveCodes(false);
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

    const sectionsToRender = React.useMemo(() => {
        if (!activeCodes) return [];

        // Only these 3 services are allowed; all other civil registry services are hardcoded disabled
        const activeItems = REGISTRY_TYPES.filter(type => activeCodes.has(type.code));

        return [
            {
                title: "Available Services",
                subtitle: "Select a civil registry service to proceed",
                items: activeItems
            }
        ];
    }, [activeCodes]);

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

                    {/* Top Tab Switcher: Registry Services vs Citizen Reviews */}
                    <div className="flex items-center gap-1 p-1 rounded-xl md:rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
                        <button
                            type="button"
                            onClick={() => setActiveMainTab("SERVICES")}
                            className={cn(
                                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap",
                                activeMainTab === "SERVICES"
                                    ? "bg-white dark:bg-[#121622] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            )}
                            style={activeMainTab === "SERVICES" ? { borderColor: `${themeColor}40` } : undefined}
                        >
                            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
                            <span>Registry Services</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveMainTab("REVIEWS")}
                            className={cn(
                                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap",
                                activeMainTab === "REVIEWS"
                                    ? "bg-white dark:bg-[#121622] text-slate-900 dark:text-white shadow-sm border border-slate-200/80 dark:border-white/10"
                                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            )}
                            style={activeMainTab === "REVIEWS" ? { borderColor: `${themeColor}40` } : undefined}
                        >
                            <Star className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 fill-amber-400 shrink-0" />
                            <span>Reviews</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Conditional Tab Rendering */}
            {activeMainTab === "REVIEWS" ? (
                <CivilRegistryReviewsTab
                    feedbacks={feedbacks}
                    stats={feedbackStats}
                    themeColor={themeColor}
                    initialPagination={initialPagination}
                />
            ) : (
                <>
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


                            {/* Civil Registry Sections */}
                            <div className="space-y-16 max-w-6xl mx-auto w-full">
                                {activeCodes === null ? (
                                    <div className="space-y-6 animate-pulse">
                                        {/* Section Header Skeleton */}
                                        <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4 select-none">
                                            <div className="w-1.5 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                                            <div className="space-y-2">
                                                <div className="h-5 w-48 bg-slate-300 dark:bg-slate-700 rounded-md" />
                                                <div className="h-3 w-64 bg-slate-200 dark:bg-slate-800 rounded-md" />
                                            </div>
                                        </div>

                                        {/* Cards Grid Skeleton */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {Array(3).fill(0).map((_, idx) => (
                                                <div key={idx} className="p-4 md:p-8 rounded-2xl md:rounded-[2.5rem] border-2 border-slate-200 dark:border-white/10 bg-white/40 dark:bg-white/5 backdrop-blur-md min-h-[100px] md:min-h-[220px] flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 justify-start md:justify-between">
                                                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                                                    <div className="space-y-3 mt-0 md:mt-6 w-full">
                                                        <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded-md w-3/4" />
                                                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-5/6" />
                                                        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    sectionsToRender.map((section) => {
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
                                                    {section.items.map((type) => {
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
                </>
            )}
        </div>
    );
}
