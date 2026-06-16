"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Clock,
    Eye,
    CheckCircle2,
    XCircle,
    Home,
    FileText,
    Activity,
    Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { getUserReports } from "@/app/admin/actions";
import { useRouter } from "next/navigation";

interface Report {
    id: string;
    status: string;
    category: string;
    createdAt: string | Date;
}

export default function UserReportsPage() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchReports() {
            try {
                const res = await getUserReports();
                if (res.success) {
                    setReports(res.reports || []);
                }
            } catch (err) {
                console.error("Failed to load reports:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchReports();
    }, []);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case "PENDING": return { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock };
            case "SEEN": return { color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Eye };
            case "IN_PROGRESS": return { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", icon: Activity };
            case "COMPLETED": return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle2 };
            case "REJECTED": return { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", icon: XCircle };
            default: return { color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/20", icon: Clock };
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Accessing Records...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-12 pb-20 max-w-7xl mx-auto px-4 md:px-10 pt-4 md:pt-12">
            {/* Navigation - Glass Bar Sticky */}
            <div className="sticky top-[72px] md:top-[88px] z-50 w-fit pointer-events-none">
                <Breadcrumb className="pointer-events-auto">
                    <BreadcrumbList className="bg-white/90 dark:bg-black/80 backdrop-blur-md px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.1)] w-fit flex items-center gap-1">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link href="/" className="flex items-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-colors">
                                    <Home className="w-3.5 h-3.5 mb-0.5" />
                                    Home
                                </Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="opacity-20" />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-primary italic">My Reports Hub</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
            </div>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8">
                <div className="space-y-1 md:space-y-2">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Citizen <span className="text-primary">Reports</span></h1>
                        <p className="text-[7px] md:text-[8px] font-black text-primary uppercase tracking-[0.4em] ml-0.5 opacity-70">LGU Tracking Hub • Real-time Status</p>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium italic max-w-xl text-[10px] md:text-xs leading-relaxed">
                        Track the progress of your submitted concerns and reports in real-time.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:gap-4">
                {reports.length > 0 ? reports.map((report: Report) => {
                    const style = getStatusStyle(report.status);

                    return (
                        <div
                            key={report.id}
                            onClick={() => router.push(`/user/reports/${report.id}`)}
                            className="bg-white dark:bg-[#0d0f14] rounded-xl md:rounded-2xl border border-slate-200 dark:border-white/5 p-3 md:p-5 hover:border-primary/40 group transition-all cursor-pointer select-none active:scale-[0.99] relative overflow-hidden"
                        >
                            <div className="flex items-center gap-3 md:gap-6 justify-between relative z-10">
                                <div className="flex items-center gap-3 md:gap-6 flex-1 min-w-0">
                                    <div className="space-y-0.5 md:space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-xs md:text-base font-black uppercase tracking-tight text-slate-900 dark:text-white italic truncate leading-tight group-hover:text-primary transition-colors">{report.category}</h3>
                                            <Badge variant="outline" className={cn("md:hidden font-black uppercase tracking-widest text-[6px] italic px-1.5 py-0.5 rounded border-opacity-30", style.color, style.bg, style.border)}>
                                                {report.status.replace(/_/g, " ")}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[7px] md:text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest italic">{format(new Date(report.createdAt), "MMM d, yyyy")}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 md:gap-6 shrink-0">
                                    <Badge variant="outline" className={cn("hidden md:flex font-black uppercase tracking-widest text-[8px] italic px-4 py-1.5 rounded-full border border-opacity-30 shadow-md", style.color, style.bg, style.border)}>
                                        {report.status.replace(/_/g, " ")}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="py-20 md:py-40 text-center border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[2rem] md:rounded-[4rem] bg-slate-50/50 dark:bg-white/[0.02]">
                        <FileText className="w-12 h-12 md:w-20 md:h-20 text-slate-200 dark:text-white/10 mx-auto mb-6" />
                        <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.4em] italic text-[10px] md:text-base">No active reports found</p>
                        <p className="text-slate-300 dark:text-slate-600 font-medium italic text-[8px] md:text-xs mt-2 uppercase tracking-widest">Submit a new concern to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
}
