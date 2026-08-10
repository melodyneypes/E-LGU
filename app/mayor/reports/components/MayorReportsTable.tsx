"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { 
    Eye, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    XCircle,
    MapPin,
    Search,
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MayorReportDetailModal, MayorReportDetailItem } from "./MayorReportDetailModal";

interface MayorReportsTableProps {
    initialReports: MayorReportDetailItem[];
    initialTotalCount: number;
    initialTotalPages: number;
    initialStats?: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        rejected: number;
    };
    themeColor?: string;
}

function formatFormattedName(fullName?: string | null) {
    if (!fullName) return "Anonymous Resident";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1][0].toUpperCase();
    return `${firstName} ${lastInitial}.`;
}

export function MayorReportsTable({ 
    initialReports, 
    initialTotalCount, 
    initialTotalPages, 
    initialStats, 
    themeColor = "#2563eb" 
}: MayorReportsTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [search, setSearch] = useState(searchParams.get("search") || "");
    const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "All");
    const [selectedReport, setSelectedReport] = useState<MayorReportDetailItem | null>(null);

    const currentPage = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const reportIdParam = searchParams.get("reportId");

    // Auto-open modal when reportId parameter is present in the URL
    useEffect(() => {
        if (!reportIdParam) return;

        const foundInInitial = initialReports.find((r) => r.id === reportIdParam);
        if (foundInInitial) {
            handleSelectReport(foundInInitial);
        } else {
            // Fetch directly from server if report is on another page or not in initialReports list
            (async () => {
                try {
                    const { getMayorReportById } = await import("../actions");
                    const res = await getMayorReportById(reportIdParam);
                    if (res.success && res.report) {
                        setSelectedReport(res.report as any);
                    }
                } catch (err) {
                    console.error("Failed to auto-load report detail modal:", err);
                }
            })();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reportIdParam]);

    const handleSelectReport = async (report: MayorReportDetailItem) => {
        setSelectedReport(report);
        try {
            const { getMayorReportById } = await import("../actions");
            const res = await getMayorReportById(report.id);
            if (res.success && res.report) {
                setSelectedReport(res.report as any);
            }
        } catch (err) {
            console.error("Failed to fetch report details:", err);
        }
    };

    const updateParams = (newParams: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.keys(newParams).forEach((key) => {
            const val = newParams[key];
            if (val === null || val === "" || val === "All") {
                params.delete(key);
            } else {
                params.set(key, String(val));
            }
        });
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    };

    // 400ms Debounce effect for real-time search input
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (searchParams.get("search") || "")) {
                updateParams({ search: search || null, page: 1 });
            }
        }, 400);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold"><Clock className="w-3 h-3 mr-1" /> PENDING</Badge>;
            case "SEEN":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-bold"><Eye className="w-3 h-3 mr-1" /> SEEN</Badge>;
            case "IN_PROGRESS":
                return <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 font-bold"><Clock className="w-3 h-3 mr-1" /> IN PROGRESS</Badge>;
            case "COMPLETED":
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold"><CheckCircle2 className="w-3 h-3 mr-1" /> COMPLETED</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 font-bold"><XCircle className="w-3 h-3 mr-1" /> REJECTED</Badge>;
            default:
                return <Badge variant="outline" className="font-bold">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            {initialStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Reports</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{initialStats.total}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Pending</p>
                        <p className="text-2xl font-black text-amber-500 mt-1">{initialStats.pending}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">In Progress</p>
                        <p className="text-2xl font-black text-purple-500 mt-1">{initialStats.inProgress}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Completed</p>
                        <p className="text-2xl font-black text-emerald-500 mt-1">{initialStats.completed}</p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Rejected</p>
                        <p className="text-2xl font-black text-red-500 mt-1">{initialStats.rejected}</p>
                    </div>
                </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl p-5 shadow-sm space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search reporter, category, description..."
                        className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all"
                    />
                    {isPending && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            updateParams({ status: e.target.value, page: 1 });
                        }}
                        className="px-4 py-2 rounded-xl bg-slate-50 dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/50 cursor-pointer"
                    >
                        <option value="All">All Statuses</option>
                        <option value="PENDING">PENDING</option>
                        <option value="SEEN">SEEN</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="REJECTED">REJECTED</option>
                    </select>

                    <div className="text-xs font-black uppercase tracking-wider text-slate-400 italic px-3">
                        Total: <span style={{ color: themeColor }}>{initialTotalCount}</span> Incidents
                    </div>
                </div>
            </div>

            {/* Reports Data Table */}
            <div className="bg-white dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] rounded-3xl overflow-hidden shadow-sm transition-colors">
                <Table className="w-full text-left border-collapse">
                    <TableHeader>
                        <TableRow className="border-b border-slate-200 dark:border-[#2a3040] bg-slate-50/70 dark:bg-[#121622]/70 text-[11px] font-black uppercase italic tracking-wider text-slate-500 dark:text-slate-400">
                            <TableHead className="py-4 px-6 w-12">#</TableHead>
                            <TableHead className="py-4 px-6">Reporter</TableHead>
                            <TableHead className="py-4 px-6">Category</TableHead>
                            <TableHead className="py-4 px-6">Barangay Scope</TableHead>
                            <TableHead className="py-4 px-6">Status</TableHead>
                            <TableHead className="py-4 px-6">Filed Date</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody className="divide-y divide-slate-100 dark:divide-[#2a3040] text-sm font-medium">
                        {initialReports.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-12 text-center text-slate-400 italic">
                                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                    No public incident reports found matching criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            initialReports.map((report, idx) => (
                                <TableRow
                                    key={report.id}
                                    onClick={() => handleSelectReport(report)}
                                    className="hover:bg-slate-50/80 dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                                    title="Click to view report summary (Read-Only)"
                                >
                                    <TableCell className="py-4 px-6 text-xs font-bold text-slate-400 tabular-nums">
                                        {(currentPage - 1) * limit + idx + 1}
                                    </TableCell>
                                    <TableCell className="py-4 px-6">
                                        <p className="font-black text-slate-900 dark:text-white uppercase italic tracking-tight group-hover:text-rose-500 transition-colors">
                                            {formatFormattedName(report.user.name)}
                                        </p>
                                    </TableCell>

                                    <TableCell className="py-4 px-6">
                                        <span className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-black uppercase italic tracking-wider">
                                            {report.category}
                                        </span>
                                    </TableCell>

                                    <TableCell className="py-4 px-6">
                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-bold text-xs">
                                            <MapPin size={14} className="text-rose-500 shrink-0" />
                                            <span>{report.barangay?.name || "Mapandan"}</span>
                                        </div>
                                    </TableCell>

                                    <TableCell className="py-4 px-6">
                                        {getStatusBadge(report.status)}
                                    </TableCell>

                                    <TableCell className="py-4 px-6 text-xs text-slate-400 italic">
                                        {format(new Date(report.createdAt), "LLL d, yyyy h:mm a")}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Server-Side Pagination Bar */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#121622]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-slate-400 font-medium italic">
                            Showing page <span className="font-bold text-slate-700 dark:text-slate-200">{currentPage}</span> of{" "}
                            <span className="font-bold text-slate-700 dark:text-slate-200">{initialTotalPages || 1}</span>
                        </p>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-medium italic">Show:</span>
                            <select
                                value={limit}
                                onChange={(e) => updateParams({ limit: Number(e.target.value), page: 1 })}
                                className="px-3 py-1 rounded-lg bg-white dark:bg-[#1a202c] border border-slate-200 dark:border-[#2a3040] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer shadow-sm"
                            >
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value={50}>50 per page</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1 || isPending}
                            onClick={() => updateParams({ page: currentPage - 1 })}
                            className="rounded-xl border-slate-200 dark:border-[#2a3040] text-xs font-bold"
                        >
                            Prev
                        </Button>

                        <span className="px-3 text-xs font-black text-slate-700 dark:text-slate-200">
                            {currentPage} / {initialTotalPages || 1}
                        </span>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= initialTotalPages || initialTotalPages === 0 || isPending}
                            onClick={() => updateParams({ page: currentPage + 1 })}
                            className="rounded-xl border-slate-200 dark:border-[#2a3040] text-xs font-bold"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Read-Only Mayor Detail Modal */}
            <MayorReportDetailModal
                report={selectedReport}
                onClose={() => {
                    setSelectedReport(null);
                    if (searchParams.get("reportId")) {
                        updateParams({ reportId: null });
                    }
                }}
                themeColor={themeColor}
            />
        </div>
    );
}
