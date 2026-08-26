"use client";

import React, { useState, useEffect, useCallback } from "react";
import { getAuditLogs, getAuditStats, exportAuditLogsCSV } from "../actions";
import {
    Search,
    RefreshCw,
    ShieldAlert,
    Filter,
    Building2,
    Eye,
    FileSpreadsheet,
    Loader2,
    CheckCircle2,
    Clock,
    User,
    Activity
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isExporting, setIsExporting] = useState(false);

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

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const [logsRes, statsRes] = await Promise.all([
                getAuditLogs({
                    page: currentPage,
                    limit: 15,
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
    }, [currentPage, debouncedSearch, departmentFilter, roleFilter, actionFilter, startDate, endDate]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleExportCSV = async () => {
        setIsExporting(true);
        try {
            const res = await exportAuditLogsCSV({
                search: debouncedSearch,
                department: departmentFilter,
                userRole: roleFilter,
                action: actionFilter,
                startDate,
                endDate,
            });

            if (res.success && res.csv) {
                const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", res.fileName || "Mapandan_Audit_Trail.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success("Audit trail report exported successfully!");
            } else {
                toast.error(res.error || "Failed to export CSV report.");
            }
        } catch {
            toast.error("Export process encountered an error.");
        } finally {
            setIsExporting(false);
        }
    };

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
                            className="pl-10 h-11 rounded-2xl bg-slate-50 dark:bg-[#151b2b] border-slate-200 dark:border-[#2a3040] text-xs"
                        />
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

                        <Button
                            onClick={handleExportCSV}
                            disabled={isExporting || logs.length === 0}
                            variant="outline"
                            className="rounded-2xl h-11 px-4 font-bold text-xs flex items-center gap-2 border-slate-200 dark:border-[#2a3040] hover:bg-slate-50 dark:hover:bg-[#151b2b] cursor-pointer"
                        >
                            {isExporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Exporting...
                                </>
                            ) : (
                                <>
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV Report
                                </>
                            )}
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
                            <TableHead className="text-[10px] font-black uppercase tracking-wider text-right">Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Loading System Audit Logs...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-48 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                                        <ShieldAlert className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                        <span className="text-xs font-bold uppercase tracking-wider">No audit logs recorded matching your filter</span>
                                        <p className="text-[11px] text-slate-400">Activity will automatically record here as administrators perform operations.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log: any) => (
                                <TableRow key={log.id} className="border-slate-100 dark:border-[#2a3040]/50 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                    {/* Timestamp */}
                                    <TableCell className="py-3.5">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
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

                                    {/* Inspect Metadata Button */}
                                    <TableCell className="py-3.5 text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setSelectedLog(log);
                                                setIsInspectorOpen(true);
                                            }}
                                            className="h-8 w-8 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
                                            title="Inspect Event Snapshot & Metadata"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {/* Pagination Controls */}
                <div className="p-4 border-t border-slate-100 dark:border-[#2a3040] bg-slate-50/50 dark:bg-[#151b2b] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <span className="text-slate-500">
                        Showing {logs.length > 0 ? (currentPage - 1) * 15 + 1 : 0} to {Math.min(currentPage * 15, totalCount)} of {totalCount} log records
                    </span>

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
            <Dialog open={isInspectorOpen} onOpenChange={setIsInspectorOpen}>
                <DialogContent className="sm:max-w-2xl rounded-3xl p-6 bg-white dark:bg-[#0f1422] border-slate-200 dark:border-[#2a3040] shadow-2xl">
                    <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2a3040]">
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
                        <div className="space-y-4 pt-2 text-xs">
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

                            {/* Metadata JSON Viewer */}
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                                    Change Snapshot & Metadata (JSON)
                                </span>
                                <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-56 custom-scrollbar border border-white/5">
                                    {JSON.stringify(selectedLog.metadata, null, 2)}
                                </pre>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsInspectorOpen(false)}
                                    className="rounded-xl text-xs font-bold"
                                >
                                    Close Inspector
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
