"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    Clock,
    Loader2,
    CheckCircle2,
    XCircle,
    Eye,
    ArrowRight,
    ShieldAlert,
    MapPin
} from "lucide-react";
import Link from "next/link";
import { useSystemTheme } from "@/components/providers/ThemeProvider";
import { useSearchParams } from "next/navigation";

interface RecentReport {
    id: string;
    category: string;
    status: string;
    description: string;
    createdAt: string;
    user: { name: string | null } | null;
    barangay: { name: string } | null;
}

interface ReportsOverviewCardProps {
    initialReports: RecentReport[];
    isCompact?: boolean;
    rowSpan?: number;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
    PENDING: { label: "Pending", color: "text-amber-500", bgColor: "bg-amber-500/10", icon: Clock },
    SEEN: { label: "Seen", color: "text-sky-500", bgColor: "bg-sky-500/10", icon: Eye },
    IN_PROGRESS: { label: "In Progress", color: "text-blue-500", bgColor: "bg-blue-500/10", icon: Loader2 },
    COMPLETED: { label: "Resolved", color: "text-emerald-500", bgColor: "bg-emerald-500/10", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", color: "text-red-500", bgColor: "bg-red-500/10", icon: XCircle },
};

export function ReportsOverviewCard({ initialReports, rowSpan = 1 }: ReportsOverviewCardProps) {
    const { themeColor } = useSystemTheme();
    const searchParams = useSearchParams();
    const barangay = searchParams.get("barangay") || "";
    const [reports, setReports] = useState<RecentReport[]>(initialReports);

    const barangayRef = useRef(barangay);
    useEffect(() => {
        barangayRef.current = barangay;
    }, [barangay]);

    const fetchReports = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (barangayRef.current) params.set("barangay", barangayRef.current);
            const res = await fetch(`/api/captain/reports/citizen?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setReports(data.recentReports || []);
            }
        } catch (err) {
            console.error("[ReportsOverviewCard] Failed to fetch reports:", err);
        }
    }, []);

    // Subscribe to SSE for realtime updates with debouncing
    useEffect(() => {
        const eventSource = new EventSource("/api/captain/reports/citizen/stream");
        let debounceTimer: NodeJS.Timeout | null = null;

        eventSource.onmessage = (event) => {
            if (event.data === "refresh") {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log("[ReportsOverviewCard] Debounced SSE refresh event triggered, fetching reports...");
                    fetchReports();
                }, 1500);
            }
        };

        eventSource.onerror = () => {
            console.warn("[ReportsOverviewCard] SSE stream connection lost. Reconnecting...");
        };

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            eventSource.close();
        };
    }, [fetchReports]);

    // Re-fetch when barangay filter changes
    useEffect(() => {
        fetchReports();
    }, [barangay, fetchReports]);

    return (
        <div
            className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-[2.5rem] p-6 lg:p-8 shadow-xl h-full flex flex-col justify-start gap-4 transition-all duration-300"
            style={{
                minHeight: `${420 + (rowSpan - 1) * 140}px`,
                boxShadow: `0 25px 50px -12px color-mix(in srgb, ${themeColor} 8%, transparent)`
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#2a3040]/50 pb-4">
                <div>
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5" style={{ color: themeColor }} />
                        <span>Citizen Reports Overview</span>
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic mt-1">
                        5 most recent community reports — <span className="font-bold" style={{ color: themeColor }}>Live</span>
                    </p>
                </div>
            </div>

            {/* Table Container - Fills vertical space dynamically */}
            <div className="overflow-x-auto flex-1 flex flex-col justify-start">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-100 dark:border-[#2a3040]/50">
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic py-3.5 px-3 w-10">#</th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic py-3.5 px-3">Reporter</th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic py-3.5 px-3">Category</th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic py-3.5 px-3">Description</th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic py-3.5 px-3">Barangay</th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic py-3.5 px-3">Status</th>
                            <th className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 italic py-3.5 px-3">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#2a3040]/30">
                        {reports.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center text-sm text-slate-400 italic py-10">
                                    No reports found.
                                </td>
                            </tr>
                        ) : (
                            reports.map((report, idx) => {
                                const config = statusConfig[report.status] || statusConfig.PENDING;
                                const timeAgo = formatTimeAgo(new Date(report.createdAt));

                                return (
                                    <tr
                                        key={report.id}
                                        onClick={() => {
                                            const params = new URLSearchParams();
                                            if (barangay) params.set("barangay", barangay);
                                            params.set("reportId", report.id);
                                            window.location.href = `/captain/reports?${params.toString()}`;
                                        }}
                                        className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                        title="Click to view details in Reports management"
                                    >
                                        {/* # */}
                                        <td className="py-4 px-3">
                                            <span className="text-xs font-black text-slate-400 italic">{idx + 1}</span>
                                        </td>

                                        {/* Reporter */}
                                        <td className="py-4 px-3 whitespace-nowrap">
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {report.user?.name || "Anonymous"}
                                            </span>
                                        </td>

                                        {/* Category */}
                                        <td className="py-4 px-3 whitespace-nowrap">
                                            <span className="inline-block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg italic whitespace-nowrap">
                                                {report.category}
                                            </span>
                                        </td>

                                        {/* Description */}
                                        <td className="py-4 px-3 max-w-[280px]">
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {report.description}
                                            </p>
                                        </td>

                                        {/* Barangay */}
                                        <td className="py-4 px-3 whitespace-nowrap">
                                            {report.barangay ? (
                                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                    <MapPin className="w-3 h-3 shrink-0" />
                                                    {report.barangay.name}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-300 dark:text-slate-600 italic">—</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="py-4 px-3 whitespace-nowrap">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full whitespace-nowrap ${config.bgColor} ${config.color}`}>
                                                {config.label}
                                            </span>
                                        </td>

                                        {/* Date */}
                                        <td className="py-4 px-3 whitespace-nowrap">
                                            <span className="text-xs font-medium text-slate-400 italic whitespace-nowrap">{timeAgo}</span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* View All Action Button at the bottom */}
            <div className="pt-4 border-t border-slate-100 dark:border-[#2a3040]/50 flex justify-end">
                <Link
                    href="/captain/reports"
                    prefetch={false}
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all active:scale-95 hover:opacity-90"
                    style={{
                        backgroundColor: themeColor,
                        boxShadow: `0 8px 16px -4px ${themeColor}40`
                    }}
                >
                    <span>View All Reports</span>
                    <ArrowRight className="w-4 h-4" />
                </Link>
            </div>
        </div>
    );
}

function formatTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
}
