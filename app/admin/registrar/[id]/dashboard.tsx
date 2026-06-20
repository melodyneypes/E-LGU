"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getRegistrarActiveCounts } from "@/app/admin/transactions/actions";
import { useRouter } from "next/navigation";
import { 
    RefreshCcw, 
    FileText, 
    ArrowRight, 
    FileHeart, 
    Baby, 
    Folder, 
    Activity 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabase";

interface ActiveCounts {
    LCR_BIRTH: number;
    LCR_BIRTH_REG: number;
    LCR_PSA_ENDORSEMENT: number;
    LCR_DEATH_REG: number;
    LCR_DEATH: number;
    LCR_DEATH_PSA_ENDORSEMENT: number;
    LCR_MARRIAGE_LICENSE: number;
    LCR_MARRIAGE_REG: number;
    LCR_MARRIAGE: number;
    LCR_MARRIAGE_PSA_ENDORSEMENT: number;
}

interface DashboardCounts {
    activeCounts: ActiveCounts;
    totalCounts: ActiveCounts;
}

interface ServiceMeta {
    code: keyof ActiveCounts | (keyof ActiveCounts)[];
    name: string;
    categoryParam: string;
    description: string;
    icon: React.ComponentType<any>;
    color: string;
}

const SERVICES_META: ServiceMeta[] = [
    {
        code: "LCR_BIRTH_REG",
        name: "Birth Registration",
        categoryParam: "Birth Registration",
        description: "Register live birth records with civil registrar",
        icon: Baby,
        color: "blue"
    },
    {
        code: "LCR_BIRTH",
        name: "Birth Certificate Request",
        categoryParam: "Birth Certificate",
        description: "Certified true copy requests of birth certificates",
        icon: FileText,
        color: "sky"
    },
    {
        code: ["LCR_PSA_ENDORSEMENT", "LCR_DEATH_PSA_ENDORSEMENT", "LCR_MARRIAGE_PSA_ENDORSEMENT"],
        name: "PSA Endorsement",
        categoryParam: "PSA Endorsement",
        description: "PSA Endorsement requests for Birth, Death, and Marriage",
        icon: Folder,
        color: "indigo"
    },
    {
        code: "LCR_DEATH_REG",
        name: "Death Registration",
        categoryParam: "Death Registration",
        description: "Register death records with civil registrar",
        icon: FileText,
        color: "slate"
    },
    {
        code: "LCR_DEATH",
        name: "Death Certificate Request",
        categoryParam: "Death Certificate",
        description: "Certified true copy requests of death certificates",
        icon: FileText,
        color: "zinc"
    },
    {
        code: "LCR_MARRIAGE_LICENSE",
        name: "Marriage License Application",
        categoryParam: "Marriage License",
        description: "License applications for municipal marriage",
        icon: FileHeart,
        color: "rose"
    },
    {
        code: "LCR_MARRIAGE_REG",
        name: "Marriage Registration",
        categoryParam: "Marriage Registration",
        description: "Register marriage records with civil registrar",
        icon: FileHeart,
        color: "pink"
    },
    {
        code: "LCR_MARRIAGE",
        name: "Marriage Certificate Request",
        categoryParam: "Marriage Certificate",
        description: "Certified true copy requests of marriage certificates",
        icon: FileText,
        color: "emerald"
    }
];

interface RegistrarDashboardProps {
    transactions?: any[];
    currentUserId?: string;
}

export default function RegistrarDashboard({ transactions = [], currentUserId }: RegistrarDashboardProps = {}) {
    const router = useRouter();
    const [counts, setCounts] = useState<DashboardCounts | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchCounts = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await getRegistrarActiveCounts();
            if (res.success && res.data) {
                setCounts(res.data as unknown as DashboardCounts);
            } else {
                toast.error(res.error || "Failed to load active counts");
            }
        } catch (err) {
            console.error("Failed to fetch registrar counts:", err);
            toast.error("Failed to load active counts");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    // Realtime Supabase Subscription for transaction updates
    useEffect(() => {
        if (!supabase) return;

        console.log("Subscribing to Supabase Realtime 'Transaction' table for registrar dashboard...");
        let channel: any;
        try {
            channel = supabase
                .channel("realtime-registrar-dashboard")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction",
                    },
                    async (payload: any) => {
                        console.log("Realtime change caught on Transaction table:", payload);
                        // Reload counts on any transaction update
                        fetchCounts(true);
                    }
                )
                .subscribe((status: string, err?: any) => {
                    if (err) {
                        console.error("Supabase Realtime subscription error:", err);
                    }
                    if (status === "CHANNEL_ERROR") {
                        console.error("Supabase Realtime channel error status caught");
                    }
                });
        } catch (error) {
            console.error("Failed to initialize Supabase Realtime subscription:", error);
        }

        return () => {
            console.log("Unsubscribing from Supabase Realtime 'Transaction' table...");
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [fetchCounts]);

    // Calculate total active count
    const totalActive = counts?.activeCounts
        ? Object.values(counts.activeCounts).reduce((acc: number, curr: number) => acc + curr, 0)
        : 0;

    // Calculate total all-time count
    const totalAll = counts?.totalCounts
        ? Object.values(counts.totalCounts).reduce((acc: number, curr: number) => acc + curr, 0)
        : 0;

    // Render all services on the dashboard
    const servicesToRender = SERVICES_META;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Overview / Header Panel */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#151b2b] rounded-[2rem] border border-slate-200 dark:border-[#2a3040] p-6 shadow-xl shadow-blue-500/5">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/5 shrink-0">
                        <Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic mb-0.5">Overview</p>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">
                            {totalActive} Active / {totalAll} Total Registrar Transactions
                        </h2>
                    </div>
                </div>

                <button
                    onClick={() => fetchCounts(true)}
                    disabled={loading || refreshing}
                    className="flex items-center gap-2 px-5 py-3 bg-white dark:bg-[#1e2330] hover:bg-slate-50 dark:hover:bg-[#2a3040] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#2a3040] rounded-2xl text-xs font-black uppercase italic tracking-tighter transition-all shadow-sm active:scale-95 disabled:opacity-50 shrink-0"
                >
                    <RefreshCcw className={cn("w-3.5 h-3.5", refreshing && "animate-spin")} />
                    <span>{refreshing ? "Refreshing..." : "Refresh Counts"}</span>
                </button>
            </div>

            {loading ? (
                /* Loading State Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array(3).fill(0).map((_, i) => (
                        <div 
                            key={i} 
                            className="bg-white dark:bg-[#151b2b] border border-slate-100 dark:border-[#2a3040]/50 rounded-[2.5rem] p-8 shadow-xl animate-pulse h-[200px]"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-[#2a3040]" />
                                <div className="w-16 h-8 rounded-xl bg-slate-200 dark:bg-[#2a3040]" />
                            </div>
                            <div className="w-3/4 h-6 rounded bg-slate-200 dark:bg-[#2a3040] mb-2" />
                            <div className="w-1/2 h-4 rounded bg-slate-200 dark:bg-[#2a3040]" />
                        </div>
                    ))}
                </div>
            ) : (
                /* Services Grid displaying all categories */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {servicesToRender.map(service => {
                        const activeCount = counts ? (
                            Array.isArray(service.code)
                                ? service.code.reduce((acc: number, code) => acc + (counts.activeCounts[code] || 0), 0)
                                : counts.activeCounts[service.code] || 0
                        ) : 0;
                        const totalCount = counts ? (
                            Array.isArray(service.code)
                                ? service.code.reduce((acc: number, code) => acc + (counts.totalCounts[code] || 0), 0)
                                : counts.totalCounts[service.code] || 0
                        ) : 0;
                        const hasUnviewedActive = (() => {
                            if (!currentUserId || !transactions || transactions.length === 0) return false;
                            const terminalStatuses = ["RELEASED", "DELIVERED", "REJECTED", "RETURNED", "REFUNDED"];
                            return transactions.some(tx => {
                                if (tx.status !== "FOR_REQUESTING") return false;
                                const code = tx.type?.code;
                                if (!code) return false;
                                const matchesCode = Array.isArray(service.code) 
                                    ? service.code.includes(code) 
                                    : code === service.code;
                                if (!matchesCode) return false;

                                const isActive = !tx.isCancelled && !terminalStatuses.includes(tx.status);
                                if (!isActive) return false;

                                if (code === "LCR_DEATH_REG" && tx.status === "FOR_REQUESTING") return false;
                                if (code === "LCR_MARRIAGE_LICENSE" && tx.status === "FOR_REQUESTING") return false;
                                if (code === "LCR_DEATH_PSA_ENDORSEMENT" && tx.status === "FOR_REQUESTING") return false;

                                const viewedMap = tx.viewedAt && typeof tx.viewedAt === 'object' && !Array.isArray(tx.viewedAt)
                                    ? (tx.viewedAt as Record<string, string>)
                                    : {};
                                const userViewTime = viewedMap[currentUserId];
                                if (!userViewTime) return true;
                                return new Date(tx.updatedAt).getTime() > new Date(userViewTime).getTime();
                            });
                        })();

                        const Icon = service.icon;
                        
                        return (
                            <div
                                key={Array.isArray(service.code) ? service.code.join("-") : service.code}
                                onClick={() => router.push(`/admin/registrar?category=${encodeURIComponent(service.categoryParam)}`)}
                                className={cn(
                                    "bg-white dark:bg-[#151b2b] rounded-[2.5rem] p-8 border border-slate-200 dark:border-[#2a3040] relative overflow-hidden group shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl cursor-pointer",
                                    hasUnviewedActive && "ring-2 ring-emerald-500/30 border-emerald-500/30 dark:ring-emerald-500/20"
                                )}
                            >
                                <div className="absolute -top-4 -right-4 text-slate-100 dark:text-[#2a3040]/20 transition-transform group-hover:scale-110">
                                    <Icon size={120} strokeWidth={1} />
                                </div>

                                <div className="relative z-10 flex items-start justify-between mb-6">
                                    <div className="relative">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105",
                                            service.color === "blue" && "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 shadow-blue-500/5",
                                            service.color === "sky" && "bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 shadow-sky-500/5",
                                            service.color === "indigo" && "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 shadow-indigo-500/5",
                                            service.color === "slate" && "bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 shadow-slate-500/5",
                                            service.color === "zinc" && "bg-zinc-500/10 text-zinc-600 dark:bg-zinc-500/20 shadow-zinc-500/5",
                                            service.color === "violet" && "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 shadow-violet-500/5",
                                            service.color === "rose" && "bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 shadow-rose-500/5",
                                            service.color === "pink" && "bg-pink-500/10 text-pink-600 dark:bg-pink-500/20 shadow-pink-500/5",
                                            service.color === "emerald" && "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 shadow-emerald-500/5",
                                            service.color === "teal" && "bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 shadow-teal-500/5"
                                        )}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        {hasUnviewedActive && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3" title="New / Unviewed Requests">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-3xl font-black italic tracking-tighter text-slate-800 dark:text-slate-200">
                                            {activeCount}
                                        </span>
                                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                                            Active
                                        </span>
                                    </div>
                                </div>

                                <div className="relative z-10 space-y-1">
                                    <h3 className="text-xl font-bold uppercase italic text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {service.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">
                                        {service.description}
                                    </p>
                                </div>

                                <div className="relative z-10 pt-6 mt-6 border-t border-slate-100 dark:border-[#2a3040] flex items-center justify-between text-xs font-black uppercase italic tracking-tighter text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    <span className="text-[10px] text-slate-400 font-bold normal-case">
                                        Total files: <span className="font-black text-slate-700 dark:text-slate-300">{totalCount}</span>
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span>Open Queue</span>
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
