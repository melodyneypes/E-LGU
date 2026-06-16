"use client";

import React, { useEffect, useState } from "react";
// Display dates/times in Philippine Standard Time (Asia/Manila) regardless of server or client timezone
function formatPHDate(date: string | Date): string {
    return new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(new Date(date));
}
import { 
    Clock, 
    CheckCircle2, 
    Home,
    FileText,
    Activity,
    DollarSign,
    Search,
    Package,
    UserCheck,
    Truck,
    X,
    AlertCircle,
    ArrowUpDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { getUserTransactions } from "@/app/admin/transactions/actions";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";

export default function UserServiceRequestsPage() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

    useEffect(() => {
        async function fetchRequests() {
            try {
                const res = await getUserTransactions();
                if (res.success) {
                    setRequests(res.data || []);
                }
            } catch (err) {
                console.error("Failed to load requests:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchRequests();
    }, []);

    // Realtime Supabase Subscription for user requests
    useEffect(() => {
        if (!supabase) return;

        console.log("Subscribing to Supabase Realtime 'Transaction' table for requests page...");
        let channel: any;
        try {
            channel = supabase
                .channel("realtime-user-filings")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "Transaction",
                    },
                    async (payload: any) => {
                        console.log("Realtime change caught on requests page:", payload);
                        // Dynamically reload list
                        try {
                            const res = await getUserTransactions();
                            if (res.success) {
                                setRequests(res.data || []);
                            }
                        } catch (err) {
                            console.error("Failed to reload requests in realtime:", err);
                        }
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
            console.log("Unsubscribing from Supabase Realtime...");
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    const getStatusStyle = (req: any) => {
        if (req.isCancelled) {
            return { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: X, label: "CANCELLED" };
        }
        const status = req.status;
        switch (status) {
            case "FOR_REVISION": return { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: AlertCircle, label: "NEEDS REVISION", opacity: 1 };
            case "FOR_REQUESTING": 
                if (req.type?.code?.startsWith("LCR_") || req.type?.code?.startsWith("CIVIL_REGISTRY")) {
                    return { color: "text-white", bg: "bg-amber-500", border: "border-transparent", icon: Clock, label: "AWAITING TREASURY CONFIRMATION", opacity: 0.9 };
                }
                return { color: "text-white", bg: "bg-[var(--primary-theme)]", border: "border-transparent", icon: Clock, label: "FOR EVALUATION", opacity: 0.8 };
            case "FOR_INSPECTION": return { color: "text-white", bg: "bg-blue-600", border: "border-transparent", icon: Search, label: "UNDER INSPECTION", opacity: 0.9 };
            case "EVALUATED": return { color: "text-white", bg: "bg-[var(--primary-theme)]", border: "border-transparent", icon: DollarSign, label: "EVALUATED", opacity: 0.9 };
            case "PAID": return { color: "text-white", bg: "bg-emerald-500", border: "border-transparent", icon: CheckCircle2, label: "PAID", opacity: 1 };
            case "FOR_PROCESSING": return { color: "text-white", bg: "bg-blue-500", border: "border-transparent", icon: Activity, label: "FOR PROCESSING", opacity: 1 };
            case "FOR_REINSPECTION": return { color: "text-white", bg: "bg-blue-500", border: "border-transparent", icon: Activity, label: "FOR PROCESSING", opacity: 1 };
            case "FOR_PICKING": return { color: "text-white", bg: "bg-amber-500", border: "border-transparent", icon: Package, label: "FOR PICKING", opacity: 1 };
            case "FOR_CLAIM": return { color: "text-white", bg: "bg-amber-500", border: "border-transparent", icon: UserCheck, label: "FOR CLAIMING", opacity: 1 };
            case "IN_ROUTE": return { color: "text-white", bg: "bg-indigo-500", border: "border-transparent", icon: Truck, label: "IN ROUTE", opacity: 1 };
            case "DELIVERED": return { color: "text-white", bg: "bg-emerald-600", border: "border-transparent", icon: CheckCircle2, label: "DELIVERED", opacity: 1 };
            case "RELEASED": return { color: "text-white", bg: "bg-emerald-600", border: "border-transparent", icon: CheckCircle2, label: "RELEASED", opacity: 1 };
            case "REJECTED": return { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: X, label: "DECLINED" };
            
            // Dispute Lifecycle
            case "RETURN_REQUESTED": return { color: "text-white", bg: "bg-[var(--primary-theme)]", border: "border-transparent", icon: Activity, label: "REQUEST FOR RETURN", opacity: 1 };
            case "REFUND_REQUESTED": return { color: "text-white", bg: "bg-[var(--primary-theme)]", border: "border-transparent", icon: DollarSign, label: "REQUEST FOR REFUND", opacity: 1 };
            case "RETURNED": return { color: "text-white", bg: "bg-slate-600", border: "border-transparent", icon: Package, label: "RETURNED", opacity: 1 };
            case "REFUNDED": return { color: "text-white", bg: "bg-slate-600", border: "border-transparent", icon: DollarSign, label: "REFUNDED", opacity: 1 };
            case "DISPUTE_REJECTED": return { color: "text-white", bg: "bg-red-600", border: "border-transparent", icon: X, label: "RETURN REJECTED", opacity: 1 };
            
            default: return { color: "text-white", bg: "bg-[var(--primary-theme)]", border: "border-transparent", icon: Clock, label: status.replace("_", " ") };
        }
    };

    const filteredRequests = requests.filter(r => 
        r.type?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const sortedRequests = [...filteredRequests].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
    });

    if (loading) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 italic">Synchronizing Records...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0c10] pb-32">
            <div className="max-w-5xl mx-auto px-4 md:px-0 pt-4 md:pt-10 space-y-8 md:space-y-12">
                
                {/* Sticky Mobile Breadcrumbs */}
                <div className="sticky top-[64px] sm:top-[80px] z-40 bg-white/70 dark:bg-[#06080a]/70 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 -mx-4 px-4 py-3 md:hidden mb-4">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Home</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic">Requests</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                {/* Editorial Header */}
                <div className="space-y-8">
                    <Breadcrumb className="hidden md:block">
                        <BreadcrumbList className="bg-slate-50 dark:bg-white/5 px-6 py-2 rounded-xl border border-slate-100 dark:border-white/5 w-fit shadow-sm">
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                        <Home className="w-3.5 h-3.5 mb-0.5" />
                                        Home
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator />
                            <BreadcrumbItem>
                                <BreadcrumbPage className="text-[10px] font-black uppercase tracking-widest text-primary italic">My Requests</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
                        <div className="space-y-3 md:space-y-4">
                            <div className="space-y-1">
                                <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none select-none">
                                    Track <span className="text-primary italic underline decoration-primary/20 underline-offset-8 decoration-4">Status</span>
                                </h1>
                                <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em] md:ml-2 italic">Service Records Portfolio</p>
                            </div>
                            <p className="text-slate-500 font-medium italic text-sm md:text-xl leading-relaxed max-w-2xl">
                                Real-time tracking of your official document applications and municipal service requests.
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full md:w-80 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <Input 
                                    placeholder="Search records..." 
                                    className="h-12 md:h-14 pl-12 rounded-xl md:rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 font-black italic transition-all focus:ring-4 focus:ring-primary/10 text-xs md:text-sm w-full"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <button
                                type="button"
                                onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
                                className="h-12 md:h-14 px-5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/40 hover:text-primary font-black uppercase tracking-widest text-[9px] md:text-[10px] italic flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 shadow-sm w-full sm:w-auto select-none"
                            >
                                <ArrowUpDown className="w-3.5 h-3.5" />
                                <span>Date: {sortDirection === "desc" ? "Newest" : "Oldest"}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Wide Request List */}
                <div className="space-y-4">
                    {sortedRequests.length > 0 ? sortedRequests.map((req) => {
                        const style = getStatusStyle(req);
                        
                        return (
                            <div 
                                key={req.id} 
                                onClick={() => {
                                    const isBuildingPermit = req.type?.code?.startsWith("BUILDING_PERMIT");
                                    if (isBuildingPermit && req.status !== "UNPAID") {
                                        router.push("/user/services/building-permit");
                                    } else {
                                        router.push(`/user/services/requests/${req.id}`);
                                    }
                                }}
                                className="group bg-white dark:bg-white/5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-white/10 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 p-3 md:p-5 transition-all cursor-pointer select-none active:scale-[0.99] flex flex-col md:flex-row items-center gap-4 md:gap-8"
                            >
                                <div className="flex items-center gap-4 md:gap-6 flex-1 w-full">
                                    <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 transition-colors duration-500 bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white">
                                        <FileText className="w-5 h-5 md:w-7 md:h-7 transition-colors" />
                                    </div>
                                    <div className="space-y-0.5 md:space-y-1 min-w-0">
                                        <h3 className="text-lg md:text-2xl font-black uppercase tracking-tighter italic truncate transition-colors text-slate-900 dark:text-white group-hover:text-primary py-1 pr-4 leading-normal">
                                            {req.type?.name || "Service Request"}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-slate-400">
                                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest italic">{req.createdAt ? formatPHDate(req.createdAt) : "N/A"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-white/5">
                                    <div className="text-left md:text-right">
                                        {req.isCancelled ? (
                                            <div className="py-0.5">
                                                <p className="text-[7px] md:text-[8px] font-black text-red-500/40 uppercase tracking-widest italic leading-none">Status</p>
                                                <p className="text-[9px] md:text-[10px] font-black text-red-500 uppercase italic tracking-tighter">Cancelled</p>
                                            </div>
                                        ) : req.status !== "FOR_REQUESTING" ? (
                                            <>
                                                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none">Assessment</p>
                                                <p className="text-base md:text-2xl font-black text-slate-900 dark:text-white italic">₱{(req.totalAmount || 0).toLocaleString()}</p>
                                            </>
                                        ) : (
                                            <div className="py-0.5">
                                                <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest italic leading-none opacity-50">Evaluation</p>
                                                <p className="text-[9px] md:text-[10px] font-black text-primary uppercase italic tracking-tighter">Pending Review</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 min-w-[100px] md:min-w-[140px] shrink-0">
                                        <Badge className={cn("inline-flex items-center gap-1.5 font-black uppercase tracking-widest text-[7px] md:text-[9px] italic px-3 md:px-5 py-1.5 md:py-2.5 rounded-full border border-opacity-20 w-full justify-center shadow-sm", style.color, style.bg, style.border)}>
                                            <style.icon className="w-3 h-3 hidden md:block" />
                                            {style.label}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-32 md:py-48 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[2.5rem] md:rounded-[4rem] bg-slate-50/30 dark:bg-white/5">
                            <FileText className="w-16 h-16 md:w-24 md:h-24 text-slate-200 dark:text-slate-800 mx-auto mb-6 opacity-50" />
                            <h3 className="text-lg md:text-2xl font-black uppercase tracking-widest text-slate-400 italic">No Records Found</h3>
                            <p className="text-[10px] md:text-sm text-slate-400 mt-2 font-medium italic uppercase tracking-tighter opacity-70">Your active applications will appear here for tracking.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


