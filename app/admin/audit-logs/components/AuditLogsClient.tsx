"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getAuditLogs, getAuditStats } from "../actions";
import {
    Search,
    RefreshCw,
    ShieldAlert,
    Filter,
    Building2,
    Loader2,
    CheckCircle2,
    Clock,
    User,
    Activity,
    Code2,
    Copy,
    ChevronDown,
    ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

/**
 * Transforms system keys into clean, human-readable labels
 */
function formatFieldLabel(key: string): string {
    if (!key) return "";

    const labelDictionary: Record<string, string> = {
        maintenance_mode: "Maintenance Mode",
        kiosk_maintenance_mode: "Kiosk Maintenance Mode",
        site_logo: "Site Logo",
        brand_word_1: "Brand First Word",
        brand_word_2: "Brand Second Word",
        theme_color: "Theme Color",
        app_google_play_url: "Google Play Store URL",
        app_app_store_url: "Apple App Store URL",
        app_apk_download_url: "Direct APK Download URL",
        social_facebook: "Facebook Page URL",
        social_twitter: "Twitter / X URL",
        social_instagram: "Instagram URL",
        contact_address: "Office Address",
        contact_email: "Official Email",
        contact_phone: "Contact Telephone",
        isEmailVerified: "Email Verification Status",
        managedBarangay: "Assigned Barangay",
        captainName: "Barangay Captain Name",
        captainMessage: "Captain's Message",
        mayorName: "Mayor Name",
        mayorMessage: "Mayor's Message",
        portraitImage: "Official Portrait",
        coverImage: "Cover Banner Image",
        isPinned: "Pinned to Feed",
        isActive: "Publication Status",
        isPublished: "Publication Status",
        publishDate: "Publish Date",
        author: "Author / Byline",
        expiryDate: "Expiry Date",
        eventDate: "Event Date",
        eventSchedule: "Event Schedule / Time",
        startDate: "Event Start Date & Time",
        endDate: "Event End Date & Time",
        venueName: "Venue / Place Name",
        googleMapsUrl: "Google Maps Pin Link",
        reminders: "Event Reminders & Guidelines",
        content: "Article Content / Narrative",
    };

    if (labelDictionary[key]) {
        return labelDictionary[key];
    }

    // Convert snake_case or camelCase to Title Case
    return key
        .replace(/_/g, " ")
        .replace(/([A-Z])/g, " $1")
        .replace(/\b\w/g, char => char.toUpperCase())
        .trim();
}
import { format } from "date-fns";

const DEPARTMENTS = [
    { value: "ALL", label: "All Departments" },
    { value: "ASSESSOR", label: "Assessor Office" },
    { value: "ENGINEERING", label: "Engineering Office" },
    { value: "TREASURY", label: "Treasury Office" },
    { value: "BPLO", label: "BPLO Department" },
    { value: "CIVIL_REGISTRAR", label: "Civil Registrar (MCR)" },
    { value: "RHU", label: "Rural Health Unit" },
    { value: "POSO", label: "POSO Traffic & Security" },
    { value: "BFP", label: "BFP Fire Protection" },
    { value: "BARANGAY", label: "Barangay Affairs" },
    { value: "GENERAL", label: "General Administration" },
];

const ROLES = [
    { value: "ALL", label: "All Roles" },
    { value: "ADMIN", label: "System Administrator" },
    { value: "ASSESSOR", label: "Assessor Officer" },
    { value: "ENGINEER", label: "Municipal Engineer" },
    { value: "TREASURY_STAFF", label: "Treasury Staff" },
    { value: "BPLO_OFFICER", label: "BPLO Officer" },
    { value: "MCR_STAFF", label: "Civil Registrar Staff" },
    { value: "RHU_STAFF", label: "Health Staff" },
    { value: "POSO_OFFICER", label: "POSO Officer" },
    { value: "BFP", label: "BFP Inspector" },
];

const ACTIONS = [
    { value: "ALL", label: "All Actions" },
    { value: "CREATE", label: "Record Created" },
    { value: "UPDATE", label: "Record Modified" },
    { value: "DELETE", label: "Record Deleted" },
    { value: "APPROVE", label: "Application Approved" },
    { value: "REJECT", label: "Application Rejected" },
    { value: "RELEASE", label: "Document Released" },
    { value: "DIGITIZE", label: "Physical Record Encoded" },
    { value: "PRINT", label: "Document Printed" },
    { value: "STATUS_CHANGE", label: "Status Transition" },
    { value: "LOGIN", label: "Security & Login" },
];

export default function AuditLogsClient({
    themeColor = "#2563eb",
}: {
    themeColor?: string;
}) {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("ALL");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isSearching, setIsSearching] = useState(false);

    const [stats, setStats] = useState({
        totalLogs: 0,
        todayLogs: 0,
        criticalActionsCount: 0,
        activeOperatorsCount: 0,
        topDepartment: "GENERAL"
    });

    // Inspector Modal State
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
    const [activeReaderModal, setActiveReaderModal] = useState<{
        title: string;
        type: "old" | "new";
        text: string;
    } | null>(null);

    const toggleFieldExpand = (fieldKey: string) => {
        setExpandedFields(prev => ({
            ...prev,
            [fieldKey]: !prev[fieldKey]
        }));
    };

    const copyText = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    // Debounce search input with visual indicator
    useEffect(() => {
        setIsSearching(true);
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setIsSearching(false);
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const [logsRes, statsRes] = await Promise.all([
                getAuditLogs({
                    page: currentPage,
                    limit: pageSize,
                    search: debouncedSearch,
                    department: departmentFilter,
                    userRole: roleFilter,
                    action: actionFilter,
                    startDate,
                    endDate,
                }),
                getAuditStats()
            ]);

            if (logsRes.success && logsRes.data) {
                setLogs(logsRes.data);
                setTotalPages(logsRes.pagination?.totalPages || 1);
                setTotalCount(logsRes.pagination?.totalCount || 0);
            } else {
                toast.error(logsRes.error || "Failed to load audit logs.");
            }

            if (statsRes.success && statsRes.stats) {
                setStats(statsRes.stats);
            }
        } catch {
            toast.error("An error occurred while fetching audit trail.");
        } finally {
            setLoading(false);
        }
    }, [currentPage, pageSize, debouncedSearch, departmentFilter, roleFilter, actionFilter, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getActionBadge = (action: string) => {
        switch (action) {
            case "APPROVE":
            case "CREATE":
                return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
            case "UPDATE":
            case "STATUS_CHANGE":
                return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
            case "REJECT":
            case "DELETE":
                return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
            case "DIGITIZE":
            case "RELEASE":
                return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
            case "PRINT":
            case "DOWNLOAD":
                return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
            case "LOGIN":
                return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
            default:
                return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
        }
    };

    return (
        <div className="space-y-6">
            {/* KPI Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md"
                        style={{ backgroundColor: themeColor }}
                    >
                        <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Total System Events
                        </p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.totalLogs.toLocaleString()}
                        </h3>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-sm">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Activity Recorded Today
                        </p>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.todayLogs.toLocaleString()}
                        </h3>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-sm">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Critical Decisions Logged
                        </p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {stats.criticalActionsCount.toLocaleString()}
                        </h3>
                    </div>
                </div>

                <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-sm">
                        <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                            Most Active Department
                        </p>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase truncate max-w-[150px]">
                            {stats.topDepartment.replace(/_/g, " ")}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Toolbar: Search, Filters & Export Button */}
            <div className="p-5 rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search by staff name, action description, record ID..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-10 h-11 rounded-2xl bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] text-xs"
                        />
                        {isSearching ? (
                            <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-600" />
                        ) : search ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    setDebouncedSearch("");
                                    setCurrentPage(1);
                                }}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                            >
                                ✕
                            </button>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={() => fetchLogs()}
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-2xl border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-[#151b2b] cursor-pointer"
                            title="Refresh Audit Trail"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </div>

                {/* Filter Row: Department, Role, Action, Dates */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-[#2a3040] text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <Filter className="w-3.5 h-3.5" /> Filter Logs:
                    </div>

                    {/* Department Filter */}
                    <Select
                        value={departmentFilter}
                        onValueChange={val => {
                            setDepartmentFilter(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent>
                            {DEPARTMENTS.map(d => (
                                <SelectItem key={d.value} value={d.value}>
                                    {d.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Role Filter */}
                    <Select
                        value={roleFilter}
                        onValueChange={val => {
                            setRoleFilter(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectValue placeholder="Staff Role" />
                        </SelectTrigger>
                        <SelectContent>
                            {ROLES.map(r => (
                                <SelectItem key={r.value} value={r.value}>
                                    {r.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Action Filter */}
                    <Select
                        value={actionFilter}
                        onValueChange={val => {
                            setActionFilter(val);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]">
                            <SelectValue placeholder="Action Type" />
                        </SelectTrigger>
                        <SelectContent>
                            {ACTIONS.map(a => (
                                <SelectItem key={a.value} value={a.value}>
                                    {a.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            value={startDate}
                            onChange={e => {
                                setStartDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-9 w-[130px] rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]"
                            title="Start Date"
                        />
                        <span className="text-slate-400 font-bold">to</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={e => {
                                setEndDate(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="h-9 w-[130px] rounded-xl text-xs bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040]"
                            title="End Date"
                        />
                    </div>

                    {(search || departmentFilter !== "ALL" || roleFilter !== "ALL" || actionFilter !== "ALL" || startDate || endDate) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setSearch("");
                                setDebouncedSearch("");
                                setDepartmentFilter("ALL");
                                setRoleFilter("ALL");
                                setActionFilter("ALL");
                                setStartDate("");
                                setEndDate("");
                                setCurrentPage(1);
                            }}
                            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer h-9 px-3 rounded-xl"
                        >
                            Reset Filters
                        </Button>
                    )}
                </div>
            </div>

            {/* Master Audit Log Table */}
            <div className="rounded-3xl bg-white dark:bg-[#121622] border border-slate-200 dark:border-[#2a3040] shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/75 dark:bg-[#151b2b]/75">
                        <TableRow className="border-slate-100 dark:border-[#2a3040]">
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Timestamp</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Staff / Operator</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Office / Dept</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Action</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Target Entity</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-wider">Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 6 }).map((_, idx) => (
                                <TableRow key={`skeleton-row-${idx}`} className="border-slate-100 dark:border-[#2a3040]/50">
                                    {/* Timestamp */}
                                    <TableCell className="py-3.5">
                                        <div className="space-y-1.5">
                                            <Skeleton className="h-3.5 w-24 rounded-md" />
                                            <Skeleton className="h-2.5 w-16 rounded-md" />
                                        </div>
                                    </TableCell>

                                    {/* Staff / Operator */}
                                    <TableCell className="py-3.5">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                                                <Skeleton className="h-3.5 w-28 rounded-md" />
                                            </div>
                                            <Skeleton className="h-2.5 w-20 rounded-md" />
                                        </div>
                                    </TableCell>

                                    {/* Office / Dept */}
                                    <TableCell className="py-3.5">
                                        <Skeleton className="h-3.5 w-24 rounded-md" />
                                    </TableCell>

                                    {/* Action Badge */}
                                    <TableCell className="py-3.5">
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                    </TableCell>

                                    {/* Target Entity */}
                                    <TableCell className="py-3.5">
                                        <div className="space-y-1.5">
                                            <Skeleton className="h-3.5 w-24 rounded-md" />
                                            <Skeleton className="h-2.5 w-32 rounded-md" />
                                        </div>
                                    </TableCell>

                                    {/* Description */}
                                    <TableCell className="py-3.5">
                                        <Skeleton className="h-3.5 w-48 rounded-md" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider">No audit logs recorded matching your filter</span>
                                        <p className="text-[11px] text-slate-400">Activity will automatically record here as administrators perform operations.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log: any) => (
                                <TableRow
                                    key={log.id}
                                    onClick={() => {
                                        setSelectedLog(log);
                                        setIsInspectorOpen(true);
                                    }}
                                    className="border-slate-100 dark:border-[#2a3040]/50 hover:bg-blue-50/50 dark:hover:bg-blue-500/[0.05] cursor-pointer transition-colors group"
                                    title="Click to inspect event snapshot & diff details"
                                >
                                    {/* Timestamp */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {format(new Date(log.createdAt), "MMM dd, yyyy")}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {format(new Date(log.createdAt), "hh:mm:ss a")}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Staff / Operator */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-slate-400" /> {log.userName}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {log.userRole}
                                            </span>
                                        </div>
                                    </TableCell>

                                    {/* Office / Dept */}
                                    <TableCell className="py-3.5">
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                            {(log.department || "GENERAL").replace(/_/g, " ")}
                                        </span>
                                    </TableCell>

                                    {/* Action Badge */}
                                    <TableCell className="py-3.5">
                                        <Badge
                                            variant="outline"
                                            className={`text-[9px] font-black uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${getActionBadge(
                                                log.action
                                            )}`}
                                        >
                                            {log.action.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>

                                    {/* Target Entity */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col max-w-[180px]">
                                            <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase truncate">
                                                {log.entityType}
                                            </span>
                                            {log.entityName && (
                                                <span className="text-[10px] text-slate-500 truncate" title={log.entityName}>
                                                    {log.entityName}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    {/* Description */}
                                    <TableCell className="py-3.5 max-w-xs">
                                        <p className="text-xs text-slate-600 dark:text-slate-300 truncate" title={log.description}>
                                            {log.description}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                            Showing {logs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} log records
                        </span>

                        <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-[#2a3040]">
                            <span className="text-[11px] text-slate-400 font-medium">Rows per page:</span>
                            <Select
                                value={String(pageSize)}
                                onValueChange={val => {
                                    setPageSize(Number(val));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[70px] h-8 rounded-xl text-xs bg-white dark:bg-[#0f1422] border-slate-200 dark:border-[#2a3040]">
                                    <SelectValue placeholder="15" />
                                </SelectTrigger>
                                <SelectContent className="z-[160]">
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="15">15</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage <= 1 || loading}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="rounded-xl h-8 px-3 text-xs"
                        >
                            Previous
                        </Button>
                        <span className="font-bold px-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={currentPage >= totalPages || loading}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="rounded-xl h-8 px-3 text-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Event Metadata & Changes Inspector Modal */}
            <Dialog
                open={isInspectorOpen}
                onOpenChange={open => {
                    setIsInspectorOpen(open);
                    if (!open) {
                        // Immediately unmount & terminate memory payload
                        setSelectedLog(null);
                        setExpandedFields({});
                        setActiveReaderModal(null);
                    }
                }}
            >
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col rounded-3xl p-6 bg-white dark:bg-[#0f1422] border-slate-200 dark:border-[#2a3040] shadow-2xl overflow-hidden">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2a3040] shrink-0">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <span>Audit Event Inspector</span>
                        </div>
                        {selectedLog && (
                            <Badge
                                variant="outline"
                                className={`text-[9px] font-black uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${getActionBadge(
                                    selectedLog.action
                                )}`}
                            >
                                {selectedLog.action}
                            </Badge>
                        )}
                    </DialogTitle>

                    {selectedLog && (
                        <TooltipProvider delayDuration={200}>
                            <div className="space-y-4 pt-2 text-xs overflow-y-auto pr-1 custom-scrollbar flex-1">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#151b2b] border border-slate-200/60 dark:border-[#2a3040]">
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Operator Name</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.userName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Role & Office</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedLog.userRole} ({selectedLog.department || "GENERAL"})</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Timestamp</span>
                                        <span className="font-mono text-slate-800 dark:text-slate-200">{format(new Date(selectedLog.createdAt), "yyyy-MM-dd HH:mm:ss")}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Target Entity Type</span>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">{selectedLog.entityType}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Entity Reference</span>
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedLog.entityName || selectedLog.entityId || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">IP Address</span>
                                        <span className="font-mono text-slate-600 dark:text-slate-400">{selectedLog.ipAddress || "Internal Server"}</span>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#151b2b] border border-slate-200 dark:border-[#2a3040] space-y-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Event Description</span>
                                    <p className="text-slate-800 dark:text-slate-200 font-medium">{selectedLog.description}</p>
                                </div>

                                {/* Visual Changes & Diff Viewer */}
                                {selectedLog.metadata?.changes ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                <Code2 className="w-3.5 h-3.5 text-blue-600" />
                                                Field-Level Modifications Detected
                                            </span>
                                            {selectedLog.metadata?.changedFields && (
                                                <div className="flex flex-wrap gap-1">
                                                    {selectedLog.metadata.changedFields.map((f: string, i: number) => (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                                        >
                                                            {f}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>                                        <div className="space-y-3">
                                            {Object.entries(selectedLog.metadata.changes).map(([fieldKey, val]: [string, any]) => {
                                                const isExpanded = !!expandedFields[fieldKey];

                                                const formatDiffValue = (raw: any): string | null => {
                                                    if (raw === null || raw === undefined || raw === "") return null;
                                                    if (typeof raw === "object") {
                                                        try {
                                                            if (Array.isArray(raw)) {
                                                                return raw.map((item, idx) => {
                                                                    if (typeof item === "object" && item !== null) {
                                                                        const label = item.label || item.name || item.title || `Item ${idx + 1}`;
                                                                        const url = item.url || item.value || "";
                                                                        return url ? `• ${label}: ${url}` : `• ${JSON.stringify(item)}`;
                                                                    }
                                                                    return `• ${item}`;
                                                                }).join("\n");
                                                            }
                                                            return JSON.stringify(raw, null, 2);
                                                        } catch {
                                                            return String(raw);
                                                        }
                                                    }
                                                    return String(raw);
                                                };

                                                const oldStr = formatDiffValue(val?.old);
                                                const newStr = formatDiffValue(val?.new);
                                                const isLongText = (oldStr?.length || 0) > 120 || (newStr?.length || 0) > 120;
                                                const displayFieldLabel = formatFieldLabel(fieldKey);

                                                return (
                                                    <div
                                                        key={fieldKey}
                                                        className="p-4 rounded-2xl bg-slate-50 dark:bg-[#151b2b] border border-slate-200/80 dark:border-[#2a3040] space-y-3"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-xs capitalize text-slate-900 dark:text-white flex items-center gap-2">
                                                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                                {displayFieldLabel}
                                                            </span>
                                                            <div className="flex items-center gap-2">
                                                                {isLongText && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleFieldExpand(fieldKey)}
                                                                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                                                    >
                                                                        {isExpanded ? (
                                                                            <>
                                                                                <ChevronUp className="w-3 h-3" /> Show Less
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronDown className="w-3 h-3" /> Expand Full Diff
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <span className="text-[9px] font-mono text-slate-400 uppercase font-medium bg-slate-200/60 dark:bg-[#202738] px-2 py-0.5 rounded-md">
                                                                    Field Diff
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                                            {/* Old Value */}
                                                            <div className="p-3 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/20 relative group">
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-rose-500 dark:text-rose-400">
                                                                        Previous Value
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {oldStr && oldStr.length > 120 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setActiveReaderModal({
                                                                                        title: `${displayFieldLabel} (Previous)`,
                                                                                        type: "old",
                                                                                        text: oldStr,
                                                                                    })
                                                                                }
                                                                                className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                                                                            >
                                                                                Open Reader
                                                                            </button>
                                                                        )}

                                                                        {oldStr && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => copyText(oldStr, "Previous value")}
                                                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                                                                                    >
                                                                                        <Copy className="w-3 h-3" />
                                                                                    </button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>Copy text</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className={`text-slate-700 dark:text-slate-300 font-mono text-[11px] whitespace-pre-wrap break-words leading-relaxed ${isExpanded ? "max-h-80 overflow-y-auto pr-1.5 custom-scrollbar" : ""}`}>
                                                                    {oldStr ? (
                                                                        isExpanded ? (
                                                                            <p>{oldStr}</p>
                                                                        ) : (
                                                                            <p className="line-clamp-3">{oldStr}</p>
                                                                        )
                                                                    ) : (
                                                                        <span className="italic text-slate-400">Empty / Null</span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* New Value */}
                                                            <div className="p-3 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 relative group">
                                                                <div className="flex items-center justify-between mb-1.5">
                                                                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                                                        Updated Value
                                                                    </span>
                                                                    <div className="flex items-center gap-1.5">
                                                                        {newStr && newStr.length > 120 && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setActiveReaderModal({
                                                                                        title: `${displayFieldLabel} (Updated)`,
                                                                                        type: "new",
                                                                                        text: newStr,
                                                                                    })
                                                                                }
                                                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 cursor-pointer"
                                                                            >
                                                                                Open Reader
                                                                            </button>
                                                                        )}

                                                                        {newStr && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => copyText(newStr, "Updated value")}
                                                                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                                                                                    >
                                                                                        <Copy className="w-3 h-3" />
                                                                                    </button>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p>Copy text</p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className={`text-slate-800 dark:text-slate-200 font-mono text-[11px] whitespace-pre-wrap break-words leading-relaxed font-medium ${isExpanded ? "max-h-80 overflow-y-auto pr-1.5 custom-scrollbar" : ""}`}>
                                                                    {newStr ? (
                                                                        isExpanded ? (
                                                                            <p>{newStr}</p>
                                                                        ) : (
                                                                            <p className="line-clamp-3">{newStr}</p>
                                                                        )
                                                                    ) : (
                                                                        <span className="italic text-slate-400">Empty / Removed</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}                                {/* Metadata Display - Simplified & Limited for CREATE */}
                                {(() => {
                                    if (!selectedLog.metadata || typeof selectedLog.metadata !== "object") return null;
                                    const hasChanges = !!(selectedLog.metadata.changes && Object.keys(selectedLog.metadata.changes).length > 0);

                                    // For CREATE actions, show only limited core informative fields (Title, Category, Barangay/Venue, Author)
                                    const createAllowedKeys = ["title", "name", "category", "barangay", "venueName", "author", "priority"];

                                    const validEntries = Object.entries(selectedLog.metadata).filter(([k, v]) => {
                                        if (k === "changes" || k === "changedFields" || k === "deletedRecordSnapshot" || k === "content") return false;
                                        if (hasChanges && (k === "settingKey" || k === "status")) return false;
                                        if (v === null || v === undefined || v === "" || v === "null") return false;

                                        // Strictly limit fields for CREATE action
                                        if (selectedLog.action === "CREATE") {
                                            return createAllowedKeys.includes(k);
                                        }
                                        return true;
                                    });

                                    if (validEntries.length === 0) return null;

                                    return (
                                        <div className="space-y-3">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                                {selectedLog.action === "CREATE" ? "Created Record Summary" : "Additional Parameters & Context"}
                                            </span>

                                            {/* Badges for Key-Value Parameters */}
                                            <div className="flex flex-wrap gap-2 pt-0.5">
                                                {validEntries.map(([k, v]) => {
                                                    const formattedLabel = formatFieldLabel(k);
                                                    const formattedVal = typeof v === "string" ? formatFieldLabel(v) : String(v);

                                                    return (
                                                        <span
                                                            key={k}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#151b2b] border border-slate-200/80 dark:border-[#2a3040] text-slate-700 dark:text-slate-300 font-mono shadow-xs"
                                                        >
                                                            <span className="text-slate-400 font-sans">{formattedLabel}:</span>{" "}
                                                            <span className="font-bold text-slate-900 dark:text-white">{formattedVal}</span>
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-[#2a3040] shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsInspectorOpen(false)}
                                    className="rounded-xl text-xs font-bold px-5"
                                >
                                    Close Inspector
                                </Button>
                            </div>
                        </TooltipProvider>
                    )}
                </DialogContent>
            </Dialog>

            {/* Dedicated High-Fidelity Text Reader Modal for Long Narratives */}
            <Dialog open={!!activeReaderModal} onOpenChange={open => !open && setActiveReaderModal(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col rounded-3xl p-6 bg-white dark:bg-[#0f1422] border-slate-200 dark:border-[#2a3040] shadow-2xl z-[220]">
                    <DialogTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2a3040] shrink-0">
                        <div className="flex items-center gap-2">
                            <span
                                className={`w-2.5 h-2.5 rounded-full ${activeReaderModal?.type === "old" ? "bg-rose-500" : "bg-emerald-500"
                                    }`}
                            />
                            <span>{activeReaderModal?.title}</span>
                        </div>
                        {activeReaderModal && (
                            <Badge
                                variant="outline"
                                className={`text-[9px] font-black uppercase tracking-wider border px-2.5 py-0.5 rounded-full ${activeReaderModal.type === "old"
                                        ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                    }`}
                            >
                                {activeReaderModal.type === "old" ? "Previous Value Snapshot" : "Updated Value Snapshot"}
                            </Badge>
                        )}
                    </DialogTitle>

                    {activeReaderModal && (
                        <div className="flex flex-col flex-1 min-h-0 space-y-4 pt-2">
                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <span className="font-mono text-[11px]">
                                    Length: {activeReaderModal.text.length.toLocaleString()} characters
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyText(activeReaderModal.text, activeReaderModal.title)}
                                    className="h-7 text-xs flex items-center gap-1.5 rounded-xl border-slate-200 dark:border-[#2a3040]"
                                >
                                    <Copy className="w-3.5 h-3.5" /> Copy Entire Text
                                </Button>
                            </div>

                            {/* Guaranteed Scroll Container */}
                            <div
                                className={`p-4 rounded-2xl flex-1 overflow-y-auto max-h-[50vh] custom-scrollbar border ${activeReaderModal.type === "old"
                                        ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 text-slate-800 dark:text-slate-200"
                                        : "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20 text-slate-900 dark:text-white"
                                    }`}
                            >
                                <p className="font-mono text-xs whitespace-pre-wrap leading-relaxed">
                                    {activeReaderModal.text}
                                </p>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-[#2a3040] shrink-0">
                                <Button
                                    variant="outline"
                                    onClick={() => setActiveReaderModal(null)}
                                    className="rounded-xl text-xs font-bold px-4"
                                >
                                    Close Reader
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
