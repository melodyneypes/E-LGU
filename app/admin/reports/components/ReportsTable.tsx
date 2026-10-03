"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import DocumentViewerModal from "@/components/shared/DocumentViewerModal";
import { 
    Eye, 
    MoreVertical, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    XCircle,
    MapPin,
    Calendar,
    UserCircle,
    Image as ImageIcon,
    Loader2,
    Home,
    Search,
    Filter,
    Mail,
    FileText,
    MessageSquare,
    Copy,
    Check
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { updateReportStatus, getAdminReports, getReportById } from "../actions/reports.actions";
import { Skeleton } from "@/components/ui/skeleton";


interface Report {
    id: string;
    category: string;
    description: string;
    status: string;
    images: string[];
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    adminComment: string | null;
    createdAt: Date;
    user: {
        name: string | null;
        email: string | null;
    };
    barangay?: {
        id: string;
        name: string;
    } | null;
}

interface ReportsTableProps {
    initialReports: Report[];
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

export function ReportsTable({ initialReports, initialTotalCount, initialTotalPages, initialStats, themeColor = "#2563eb" }: ReportsTableProps) {
    const { data: session } = useSession();
    const role = (session?.user as any)?.role;
    const isBarangayAdmin = role === "BARANGAY_ADMIN";

    const [reports, setReports] = useState(initialReports);
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [barangayFilter, setBarangayFilter] = useState("All");
    const [isLoading, setIsLoading] = useState(false);

    const [stats, setStats] = useState(initialStats || {
        total: initialTotalCount,
        pending: (initialReports || []).filter(r => r.status === "PENDING").length,
        inProgress: (initialReports || []).filter(r => r.status === "IN_PROGRESS").length,
        completed: (initialReports || []).filter(r => r.status === "COMPLETED").length,
        rejected: (initialReports || []).filter(r => r.status === "REJECTED").length
    });

    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [adminComment, setAdminComment] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState("");

    // Copy Email State
    const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

    const handleCopyEmail = (email: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!email) return;
        navigator.clipboard.writeText(email);
        setCopiedEmail(email);
        toast.success(`Copied email to clipboard: ${email}`);
        setTimeout(() => {
            setCopiedEmail(null);
        }, 2000);
    };

    const uniqueBarangays = ["{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}", "{{BARANGAY_NAME}}"];

    const isFirstMount = React.useRef(true);

    const fetchReports = React.useCallback(async (page: number, currentLimit: number, search: string, status: string, barangay: string, silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const res = await getAdminReports({
                page,
                limit: currentLimit,
                search,
                status,
                barangay
            });
            if (res.success && res.reports) {
                setReports(res.reports as any);
                setTotalCount(res.totalCount || 0);
                setTotalPages(res.totalPages || 0);
                setCurrentPage(res.currentPage || 1);
                if (res.stats) {
                    setStats(res.stats);
                }
            } else if (!silent) {
                toast.error(res.error || "Failed to load reports.");
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
            if (!silent) toast.error("An error occurred while loading reports.");
        } finally {
            if (!silent) setIsLoading(false);
        }
    }, []);

    // Prevent duplicate fetch on initial mount; only fetch when filters actually change
    React.useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }

        const handler = setTimeout(() => {
            fetchReports(1, limit, searchQuery, statusFilter, barangayFilter);
        }, 400);

        return () => clearTimeout(handler);
    }, [searchQuery, statusFilter, barangayFilter, limit, fetchReports]);

    // Realtime SSE Subscription for live auto-update with 1.5s debounce
    React.useEffect(() => {
        const eventSource = new EventSource("/api/admin/reports/citizen/stream");
        let debounceTimer: NodeJS.Timeout | null = null;

        eventSource.onmessage = (event) => {
            if (event.data === "refresh") {
                if (debounceTimer) clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    console.log("[ReportsTable] Live SSE update received, refreshing table silently...");
                    fetchReports(currentPage, limit, searchQuery, statusFilter, barangayFilter, true);
                }, 1500);
            }
        };

        eventSource.onerror = () => {
            console.warn("[ReportsTable] SSE stream connection lost. Reconnecting...");
        };

        return () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            eventSource.close();
        };
    }, [currentPage, limit, searchQuery, statusFilter, barangayFilter, fetchReports]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            fetchReports(newPage, limit, searchQuery, statusFilter, barangayFilter);
        }
    };

    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerUrl, setViewerUrl] = useState<string | null>(null);
    const [viewerTitle, setViewerTitle] = useState("");
    const [viewerIndex, setViewerIndex] = useState(0);

    const handleViewImage = (url: string, index: number) => {
        setViewerUrl(url);
        setViewerTitle(`${selectedReport?.category || "Report"} Photo`);
        setViewerIndex(index);
        setViewerOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase tracking-widest text-[9px] italic">PENDING</Badge>;
            case "SEEN":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-black uppercase tracking-widest text-[9px] italic">SEEN</Badge>;
            case "IN_PROGRESS":
                return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-black uppercase tracking-widest text-[9px] italic">IN PROGRESS</Badge>;
            case "COMPLETED":
                return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black uppercase tracking-widest text-[9px] italic">COMPLETED</Badge>;
            case "REJECTED":
                return <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-black uppercase tracking-widest text-[9px] italic">REJECTED</Badge>;
            default:
                return <Badge variant="outline" className="font-black uppercase tracking-widest text-[9px] italic">{status}</Badge>;
        }
    };

    const handleUpdateStatus = async (idToUpdate?: string, targetStatus?: string) => {
        const reportId = idToUpdate || selectedReport?.id;
        const statusToApply = targetStatus || currentStatus;
        if (!reportId) return;

        setIsUpdating(true);
        try {
            const res = await updateReportStatus(reportId, statusToApply, adminComment);
            if (res.success) {
                toast.success(`Report status updated to ${statusToApply}!`);
                setSelectedReport(null);
                setAdminComment("");
                fetchReports(currentPage, limit, searchQuery, statusFilter, barangayFilter);
            } else {
                toast.error(res.error || "Failed to update report status.");
            }
        } catch (error) {
            console.error("Error updating report:", error);
            toast.error("An error occurred while updating status.");
        } finally {
            setIsUpdating(false);
        }
    };

    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    const handleOpenDetails = async (report: Report) => {
        setIsLoadingDetails(true);
        setSelectedReport(report);
        setAdminComment(report.adminComment || "");
        setCurrentStatus(report.status);

        try {
            const res = await getReportById(report.id);
            if (res.success && res.report) {
                setSelectedReport(res.report as any);
                setAdminComment(res.report.adminComment || "");
                setCurrentStatus(res.report.status);
            }
        } catch (err) {
            console.error("Failed to fetch full report details:", err);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Quick KPI Stats Cards Grid (Matching Daily Requests UI) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Total Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center shrink-0">
                        <Eye className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Total Reports</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.total.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Pending Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Pending</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.pending.toLocaleString()}</h3>
                    </div>
                </div>

                {/* In Progress Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Loader2 className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">In Progress</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.inProgress.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Completed / Resolved Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Completed</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{stats.completed.toLocaleString()}</h3>
                    </div>
                </div>

                {/* Rejected Stats */}
                <div className="bg-white dark:bg-[#1e2330] rounded-[2rem] p-6 border border-slate-200 dark:border-[#2a3040] shadow-md flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                        <XCircle className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Rejected</p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter italic">{(stats.rejected || 0).toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            {/* Table Card Container */}
            <div 
                style={{ boxShadow: `0 25px 50px -12px color-mix(in srgb, ${themeColor} 10%, transparent)` }}
                className="bg-white dark:bg-[#151b2b] rounded-[2.5rem] border border-slate-200 dark:border-[#2a3040] p-6 shadow-sm overflow-hidden space-y-4"
            >
                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-auto flex flex-wrap items-center gap-3">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl min-w-[150px] font-bold text-xs">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                <SelectItem value="All">ALL STATUSES</SelectItem>
                                <SelectItem value="PENDING">PENDING</SelectItem>
                                <SelectItem value="SEEN">SEEN</SelectItem>
                                <SelectItem value="IN_PROGRESS">IN PROGRESS</SelectItem>
                                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                                <SelectItem value="REJECTED">REJECTED</SelectItem>
                            </SelectContent>
                        </Select>

                        {!isBarangayAdmin && (
                            <Select value={barangayFilter} onValueChange={setBarangayFilter}>
                                <SelectTrigger className="h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl min-w-[170px] font-bold text-xs">
                                    <Filter className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="All Barangays" />
                                </SelectTrigger>
                                <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                                    <SelectItem value="All">ALL BARANGAYS</SelectItem>
                                    {uniqueBarangays.map(bg => (
                                        <SelectItem key={bg} value={bg}>{bg.toUpperCase()}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>

                    <div className="relative w-full sm:w-[320px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                            placeholder="Search reporter or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] focus-visible:ring-0 rounded-xl text-xs"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                    <TableHeader className="bg-slate-50 dark:bg-white/5">
                        <TableRow className="hover:bg-transparent border-slate-200 dark:border-[#2a3040]">
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Reporter</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Barangay</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Category</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Date</TableHead>
                            <TableHead className="font-black uppercase tracking-widest text-[10px] italic py-5">Status</TableHead>
                            <TableHead className="text-right font-black uppercase tracking-widest text-[10px] italic py-5 px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`} className="border-slate-100 dark:border-[#2a3040]/50">
                                    <TableCell className="py-5">
                                        <div className="flex items-center gap-3">
                                            <Skeleton className="w-8 h-8 rounded-full" />
                                            <div className="space-y-1.5">
                                                <Skeleton className="h-4 w-28 rounded-md" />
                                                <Skeleton className="h-3 w-36 rounded-md" />
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-5"><Skeleton className="h-6 w-20 rounded-lg" /></TableCell>
                                    <TableCell className="py-5"><Skeleton className="h-6 w-24 rounded-lg" /></TableCell>
                                    <TableCell className="py-5"><Skeleton className="h-4 w-32 rounded-md" /></TableCell>
                                    <TableCell className="py-5"><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                    <TableCell className="text-right py-5 px-6"><Skeleton className="h-8 w-16 ml-auto rounded-xl" /></TableCell>
                                </TableRow>
                            ))
                        ) : reports.length > 0 ? reports.map((report) => (
                            <TableRow 
                                key={report.id} 
                                className="border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                                onClick={() => handleOpenDetails(report)}
                            >
                                <TableCell className="py-5 font-bold">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <UserCircle className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black italic">{report.user.name}</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">{report.user.email}</p>
                                                {report.user.email && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopyEmail(report.user.email!, e)}
                                                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                                        title="Copy reporter email"
                                                    >
                                                        {copiedEmail === report.user.email ? (
                                                            <Check className="w-3 h-3 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="py-5">
                                    <span className="text-xs font-black uppercase tracking-widest text-primary italic bg-primary/10 px-2 py-1 rounded-lg">
                                        {report.barangay?.name || "N/A"}
                                    </span>
                                </TableCell>
                                <TableCell className="py-5">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-400 italic bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">{report.category}</span>
                                </TableCell>
                                <TableCell className="py-5 text-xs font-medium italic text-slate-500">
                                    {format(new Date(report.createdAt), "MMM d, yyyy h:mm a")}
                                </TableCell>
                                <TableCell className="py-5">
                                    {getStatusBadge(report.status)}
                                </TableCell>
                                <TableCell className="text-right py-5 px-6" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    className="hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl cursor-pointer"
                                                >
                                                    <MoreVertical className="w-4 h-4 text-slate-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-white dark:bg-slate-900 border-slate-200 dark:border-[#2a3040] rounded-2xl shadow-2xl p-2 min-w-[170px]">
                                                <div className="px-2 py-1.5 mb-1 bg-slate-100 dark:bg-white/5 rounded-lg">
                                                    <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Quick Status Update</p>
                                                </div>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "SEEN")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-blue-500/10 hover:text-blue-500 transition-colors">SEEN</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "IN_PROGRESS")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-amber-500/10 hover:text-amber-500 transition-colors">IN PROGRESS</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "COMPLETED")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors">COMPLETED</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(report.id, "REJECTED")} className="rounded-xl font-bold text-xs cursor-pointer hover:bg-red-500/10 hover:text-red-500 transition-colors text-red-500">REJECTED</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="py-20 text-center">
                                    <AlertTriangle className="w-10 h-10 text-slate-200 dark:text-white/5 mx-auto mb-4" />
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-xs italic">No reports found...</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span className="hidden sm:inline-block">Rows per page:</span>
                    <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                        <SelectTrigger className="h-8 w-[70px] border-slate-200 dark:border-[#2a3040] bg-white dark:bg-[#0f1117] rounded-lg">
                            <SelectValue placeholder={limit} />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-[#151b2b]">
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="35">35</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        Showing {Math.min(currentPage * limit, totalCount)} of {totalCount}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isLoading}
                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                            className="h-10 px-4 rounded-xl border-slate-200 dark:border-[#2a3040] font-bold"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Detailed View Modal */}
            <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
                <DialogContent 
                    onPointerDownOutside={(e) => {
                        if (viewerOpen) e.preventDefault();
                    }}
                    onInteractOutside={(e) => {
                        if (viewerOpen) e.preventDefault();
                    }}
                    className="w-full sm:max-w-4xl bg-white dark:bg-[#0f1117] border-slate-200 dark:border-white/10 p-0 overflow-hidden rounded-[2rem] flex flex-col max-h-[92vh] shadow-2xl transition-all duration-300"
                >
                    {/* Top Accent line using theme color */}
                    <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: themeColor }} />

                    {selectedReport && (
                        <>
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 shrink-0">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge 
                                            variant="outline" 
                                            style={{ backgroundColor: `${themeColor}10`, borderColor: `${themeColor}20`, color: themeColor }}
                                            className="font-bold text-xs uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                                        >
                                            {selectedReport.category}
                                        </Badge>
                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                            #{selectedReport.id.slice(-8).toUpperCase()}
                                        </span>
                                    </div>
                                    <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                                        <span>Report Summary</span>
                                        {isLoadingDetails && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                                    </DialogTitle>
                                </div>
                                <div className="shrink-0 flex items-center gap-2">
                                    <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">Status:</span>
                                    {getStatusBadge(selectedReport.status)}
                                </div>
                            </div>

                            {/* Modal Scrollable Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in-50 slide-in-from-bottom-4 duration-300">
                                    
                                    {/* Left Column: Reporter, Description, Action Center */}
                                    <div className="lg:col-span-7 space-y-6">
                                        
                                        {/* Reporter & Details Card */}
                                        <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <UserCircle className="w-4 h-4 text-slate-400" /> Reporter Details
                                            </h4>
                                            
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center shrink-0">
                                                    <UserCircle className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold text-slate-950 dark:text-white truncate">{selectedReport.user.name}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {selectedReport.user.email}
                                                        </p>
                                                        {selectedReport.user.email && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => handleCopyEmail(selectedReport.user.email!, e)}
                                                                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                                                                title="Copy reporter email"
                                                            >
                                                                {copiedEmail === selectedReport.user.email ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
                                                <div className="space-y-1">
                                                    <span className="text-slate-400 flex items-center gap-1.5"><Home className="w-3.5 h-3.5" /> Barangay Scope</span>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase">{selectedReport.barangay?.name || "N/A"}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Filed Date</span>
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {format(new Date(selectedReport.createdAt), "LLL d, yyyy h:mm a")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Card */}
                                        <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-slate-400" /> Issue Description
                                            </h4>
                                            <div 
                                                className="text-[15px] text-slate-850 dark:text-slate-150 leading-relaxed font-normal pl-4 border-l-4 whitespace-pre-wrap" 
                                                style={{ borderLeftColor: themeColor }}
                                            >
                                                {selectedReport.description}
                                            </div>
                                        </div>

                                        {/* Action Center */}
                                        <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4 text-slate-400" /> Action Center
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Update Report Status</label>
                                                    <Select value={currentStatus} onValueChange={(val) => setCurrentStatus(val)}>
                                                        <SelectTrigger 
                                                            style={{ "--tw-ring-color": themeColor } as any}
                                                            className="h-11 bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] rounded-xl font-medium text-sm focus:ring-1"
                                                        >
                                                            <SelectValue placeholder="Status" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] rounded-xl shadow-xl">
                                                            <SelectItem value="PENDING" className="font-semibold text-xs cursor-pointer py-2 hover:bg-slate-50 dark:hover:bg-white/5">PENDING</SelectItem>
                                                            <SelectItem value="SEEN" className="font-semibold text-xs cursor-pointer py-2 hover:bg-slate-50 dark:hover:bg-white/5">SEEN</SelectItem>
                                                            <SelectItem value="IN_PROGRESS" className="font-semibold text-xs cursor-pointer py-2 hover:bg-slate-50 dark:hover:bg-white/5">IN PROGRESS</SelectItem>
                                                            <SelectItem value="COMPLETED" className="font-semibold text-xs cursor-pointer py-2 text-emerald-500 hover:bg-slate-50 dark:hover:bg-white/5">COMPLETED</SelectItem>
                                                            <SelectItem value="REJECTED" className="font-semibold text-xs cursor-pointer py-2 text-red-500 hover:bg-slate-50 dark:hover:bg-white/5">REJECTED</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Official Remarks</label>
                                                    <Textarea 
                                                        placeholder="Provide status updates or resolution notes here..." 
                                                        value={adminComment}
                                                        onChange={(e) => setAdminComment(e.target.value)}
                                                        style={{ "--tw-ring-color": themeColor } as any}
                                                        className="min-h-[80px] rounded-xl bg-white dark:bg-[#0f1117] border-slate-200 dark:border-[#2a3040] text-sm font-medium focus-visible:ring-1 leading-snug"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column: Images & Location Map */}
                                    <div className="lg:col-span-5 space-y-6">
                                        
                                        {/* Photos Section */}
                                        <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                <ImageIcon className="w-4 h-4 text-slate-400" /> Attached Photos ({(selectedReport?.images || []).length})
                                            </h4>
                                            
                                            {(selectedReport?.images || []).length > 0 ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(selectedReport?.images || []).map((img, i) => (
                                                        <div 
                                                            key={i} 
                                                            className="aspect-square relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200" 
                                                            onClick={() => handleViewImage(img, i)}
                                                        >
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img 
                                                                src={img} 
                                                                alt={`report-photo-${i}`} 
                                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                                                            />
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-xs text-slate-400 italic">
                                                    No photos uploaded.
                                                </div>
                                            )}
                                        </div>

                                        {/* Location Card */}
                                        <div className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                                    <MapPin className="w-4 h-4 text-slate-400" /> Location Pin
                                                </h4>
                                                {selectedReport.latitude !== null && selectedReport.longitude !== null && (
                                                    <Button 
                                                        variant="link" 
                                                        size="sm" 
                                                        onClick={() => window.open(`https://www.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}`, '_blank')}
                                                        className="text-xs h-auto p-0 font-semibold flex items-center gap-1 hover:no-underline"
                                                        style={{ color: themeColor }}
                                                    >
                                                        Google Maps
                                                    </Button>
                                                )}
                                            </div>

                                            {selectedReport.latitude !== null && selectedReport.longitude !== null ? (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-snug line-clamp-2">
                                                        {selectedReport.address || `${typeof selectedReport.latitude === 'number' ? selectedReport.latitude.toFixed(6) : selectedReport.latitude}, ${typeof selectedReport.longitude === 'number' ? selectedReport.longitude.toFixed(6) : selectedReport.longitude}`}
                                                    </p>
                                                    <div className="h-40 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 relative">
                                                        <iframe
                                                            width="100%"
                                                            height="100%"
                                                            frameBorder="0"
                                                            scrolling="no"
                                                            marginHeight={0}
                                                            marginWidth={0}
                                                            src={`https://maps.google.com/maps?q=${selectedReport.latitude},${selectedReport.longitude}&hl=en&z=14&output=embed`}
                                                            className="w-full h-full grayscale-[0.1]"
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-center text-xs text-slate-450 italic">
                                                    No location data available.
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex justify-end shrink-0">
                                <Button 
                                    disabled={isUpdating}
                                    onClick={() => handleUpdateStatus(undefined, currentStatus)}
                                    style={{ 
                                        backgroundColor: themeColor, 
                                        boxShadow: `0 8px 24px -6px ${themeColor}40` 
                                    }}
                                    className="w-full sm:w-auto px-8 h-12 rounded-xl hover:opacity-95 text-white font-bold text-sm tracking-wide transition-all active:scale-98 flex items-center justify-center gap-2 border-none cursor-pointer"
                                >
                                    {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    {isUpdating ? "Saving changes..." : "Save Updates & Notify"}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <DocumentViewerModal
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                file={null}
                fileUrl={viewerUrl}
                title={viewerTitle}
                themeColor="var(--primary-theme)"
                documents={(selectedReport?.images || []).map((img, idx) => ({ url: img, label: `Photo ${idx + 1}` }))}
                initialIndex={viewerIndex}
            />
            </div>
        </div>
    );
}
